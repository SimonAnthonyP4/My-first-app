#!/usr/bin/env bash
# Races many connections against the loyalty engine and checks that points are
# never created, lost or double-spent.
#
#   1. 25 raw ledger debits of 100 against a balance of 300: exactly 3 succeed.
#   2. 50 different redemptions of a 300-point reward against 300 points:
#      exactly 1 succeeds.
#   3. 20 retries of the SAME redemption (one idempotency key): all return,
#      one redemption exists, points are debited once.
#   4. 20 deliveries of a payment event for one order: points are awarded once.
#   5. Two partial refunds of one order, each delivered 10 times at once:
#      each is reversed once and together they take back exactly what was earned.
#   6. One Shopify order webhook delivered 20 times at once, then the same
#      order under 20 different delivery ids: mirrored once, points once.
#   7. 30 reward codes requested at once against 300 points: exactly 1 issued.
#   8. One Shopify refund webhook delivered 20 times at once: reversed once.
#
# Usage: scripts/db-concurrency-test.sh <database>   (PG* variables as usual)
set -euo pipefail

DB="${1:?usage: db-concurrency-test.sh <database>}"
q() { psql -d "$DB" -v ON_ERROR_STOP=1 -X -Atq "$@"; }

FAILED=0
check() { # check <description> <actual> <expected>
  if [[ "$2" == "$3" ]]; then
    echo "    ok - $1"
  else
    echo "    FAIL - $1 (expected $3, got $2)"
    FAILED=1
  fi
}

# Runs the same SQL statement on N connections at once.
# Prints how many of them succeeded.
race() { # race <connections> <sql; may contain {i}>
  local n="$1" sql="$2" pids=() ok=0
  for i in $(seq 1 "$n"); do
    psql -d "$DB" -X -Atq -v ON_ERROR_STOP=1 -c "${sql//\{i\}/$i}" >/dev/null 2>&1 &
    pids+=("$!")
  done
  for pid in "${pids[@]}"; do
    if wait "$pid"; then ok=$((ok + 1)); fi
  done
  echo "$ok"
}

balance() { q -c "select balance from public.loyalty_accounts where customer_id = '$1'"; }

# Customers c1..c5 and an owner, with fixed ids so the SQL below stays readable.
OWNER='00000000-0000-4000-f000-0000000000e1'
C1='00000000-0000-4000-f000-0000000000c1'
C2='00000000-0000-4000-f000-0000000000c2'
C3='00000000-0000-4000-f000-0000000000c3'
C4='00000000-0000-4000-f000-0000000000c4'
C5='00000000-0000-4000-f000-0000000000c5'
C6='00000000-0000-4000-f000-0000000000c6'
O4='00000000-0000-4000-f000-0000000000a4'
O5='00000000-0000-4000-f000-0000000000a5'
R5A='00000000-0000-4000-f000-0000000000d1'
R5B='00000000-0000-4000-f000-0000000000d2'

q <<SQL >/dev/null
insert into auth.users (id, email) values
  ('$OWNER', 'race-owner@test.brobatch'),
  ('$C1', 'race-1@test.brobatch'), ('$C2', 'race-2@test.brobatch'),
  ('$C3', 'race-3@test.brobatch'), ('$C4', 'race-4@test.brobatch'),
  ('$C5', 'race-5@test.brobatch'), ('$C6', 'race-6@test.brobatch');
insert into public.employees (id, full_name, role) values ('$OWNER', 'Race Owner', 'owner');
insert into public.customers (id, full_name, email) values
  ('$C1', 'Race One', 'race-1@test.brobatch'), ('$C2', 'Race Two', 'race-2@test.brobatch'),
  ('$C3', 'Race Three', 'race-3@test.brobatch'), ('$C4', 'Race Four', 'race-4@test.brobatch'),
  ('$C5', 'Race Five', 'race-5@test.brobatch'), ('$C6', 'Race Six', 'race-6@test.brobatch');

-- One statement per customer: the ledger refuses two rows for one customer at once.
insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
  values ('$C1', 'adjust', 300, 'race test: opening balance', '$OWNER');
insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
  values ('$C2', 'adjust', 300, 'race test: opening balance', '$OWNER');
insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
  values ('$C3', 'adjust', 1000, 'race test: opening balance', '$OWNER');

insert into public.orders (id, customer_id, employee_id, status, subtotal_cents, total_cents, idempotency_key, paid_at)
values
  ('$O4', '$C4', '$OWNER', 'paid', 900, 900, 'race-order-4', now()),
  ('$O5', '$C5', '$OWNER', 'paid', 901, 901, 'race-order-5', now());
insert into public.refunds (id, order_id, amount_cents, reason, status, idempotency_key, completed_at)
values
  ('$R5A', '$O5', 450, 'other', 'succeeded', 'race-refund-5a', now()),
  ('$R5B', '$O5', 451, 'other', 'succeeded', 'race-refund-5b', now());
SQL

REWARD="$(q -c "select id from public.rewards where points_cost = 300 and is_active limit 1")"

# 1 ---------------------------------------------------------------------------
ok="$(race 25 "insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
               values ('$C1', 'adjust', -100, 'race test: debit {i}', '$OWNER')")"
check "25 raw debits of 100 against 300: exactly 3 succeed" "$ok" 3
check "  balance is 0, never negative" "$(balance "$C1")" 0
check "  lowest running balance recorded is 0" \
  "$(q -c "select min(balance_after) from public.loyalty_transactions where customer_id = '$C1'")" 0

# 2 ---------------------------------------------------------------------------
ok="$(race 50 "select public.redeem_points('$C2', '$REWARD', 'race-redeem-distinct-{i}')")"
check "50 different redemptions against 300 points: exactly 1 succeeds" "$ok" 1
check "  one redemption exists" \
  "$(q -c "select count(*) from public.redemptions where customer_id = '$C2'")" 1
check "  balance is 0" "$(balance "$C2")" 0

# 3 ---------------------------------------------------------------------------
ok="$(race 20 "select public.redeem_points('$C3', '$REWARD', 'race-redeem-same-key')")"
check "20 retries of one redemption (same key): all 20 return" "$ok" 20
check "  one redemption exists" \
  "$(q -c "select count(*) from public.redemptions where customer_id = '$C3'")" 1
check "  points debited once: 1000 - 300 = 700" "$(balance "$C3")" 700

# 4 ---------------------------------------------------------------------------
ok="$(race 20 "select public.award_points_for_order('$O4', 'evt_race_award_{i}')")"
check "20 deliveries of a payment event for one \$9.00 order: all 20 return" "$ok" 20
check "  one earn row exists" \
  "$(q -c "select count(*) from public.loyalty_transactions where order_id = '$O4' and kind = 'earn'")" 1
check "  points awarded once: 90" "$(balance "$C4")" 90

# 5 ---------------------------------------------------------------------------
q -c "select public.award_points_for_order('$O5')" >/dev/null
check "a \$9.01 order earns 90 points" "$(balance "$C5")" 90
pids=()
for i in $(seq 1 10); do
  psql -d "$DB" -X -Atq -c "select public.reverse_points_for_refund('$R5A', 'evt_race_refund_a')" >/dev/null 2>&1 &
  pids+=("$!")
  psql -d "$DB" -X -Atq -c "select public.reverse_points_for_refund('$R5B', 'evt_race_refund_b')" >/dev/null 2>&1 &
  pids+=("$!")
done
for pid in "${pids[@]}"; do wait "$pid" || true; done
check "two partial refunds, each delivered 10 times: two reversal rows" \
  "$(q -c "select count(*) from public.loyalty_transactions where order_id = '$O5' and kind = 'reverse_earn'")" 2
check "  together they take back exactly the 90 earned" \
  "$(q -c "select sum(points_reversed) from public.refunds where order_id = '$O5'")" 90
check "  balance is 0" "$(balance "$C5")" 0

# 6 ---------------------------------------------------------------------------
ORDER_BODY='{"id": 9000000000000002001, "name": "#2001", "financial_status": "paid", "currency": "USD", "test": false, "source_name": "pos", "total_line_items_price": "9.00", "total_discounts": "0.00", "subtotal_price": "9.00", "total_tax": "0.00", "total_price": "9.00", "discount_codes": [], "customer": {"id": 6000000000000002006, "email": "race-6@test.brobatch"}, "line_items": [{"id": 9100000000000002001, "variant_id": 111, "title": "Bar", "price": "3.00", "quantity": 3}]}'

ok="$(race 20 "select public.ingest_shopify_order('wh-race-order', 'orders/paid', 'ev-race', '$ORDER_BODY')")"
check "one order webhook delivered 20 times at once: all 20 return" "$ok" 20
ok="$(race 20 "select public.ingest_shopify_order('wh-race-order-{i}', 'orders/paid', 'ev-race', '$ORDER_BODY')")"
check "the same order under 20 different delivery ids: all 20 return" "$ok" 20
check "  the order is mirrored once" \
  "$(q -c "select count(*) from public.orders where shopify_order_id = 9000000000000002001")" 1
check "  it has one line" \
  "$(q -c "select count(*) from public.order_items i join public.orders o on o.id = i.order_id where o.shopify_order_id = 9000000000000002001")" 1
check "  the member was linked by email and earned once: 90" "$(balance "$C6")" 90
check "  the first delivery is logged as processed" \
  "$(q -c "select status from public.shopify_webhook_events where id = 'wh-race-order'")" processed

# 7 ---------------------------------------------------------------------------
q -c "update public.rewards set shopify_collection_id = 4000000000001 where id = '$REWARD'" >/dev/null
q -c "insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
      values ('$C6', 'adjust', 210, 'race test: top up to 300', '$OWNER')" >/dev/null
ok="$(race 30 "select public.reserve_reward_for_pos('$C6', '$REWARD', 'race-reserve-{i}', 111, 300)")"
check "30 reward codes requested at once against 300 points: exactly 1 issued" "$ok" 1
check "  one code exists" \
  "$(q -c "select count(*) from public.redemptions where customer_id = '$C6' and discount_code is not null")" 1
check "  balance is 0" "$(balance "$C6")" 0

# 8 ---------------------------------------------------------------------------
REFUND_BODY='{"id": 9200000000000002001, "order_id": 9000000000000002001, "refund_line_items": [{"line_item_id": 9100000000000002001, "quantity": 1, "subtotal_set": {"shop_money": {"amount": "3.00", "currency_code": "USD"}}}]}'
q -c "select public.release_redemption(id) from public.redemptions where customer_id = '$C6'" >/dev/null
ok="$(race 20 "select public.ingest_shopify_refund('wh-race-refund-{i}', 'refunds/create', 'ev-race-refund', '$REFUND_BODY')")"
check "one refund under 20 delivery ids at once: all 20 return" "$ok" 20
check "  the refund is mirrored once" \
  "$(q -c "select count(*) from public.refunds where shopify_refund_id = 9200000000000002001")" 1
check "  30 of the order's 90 points are taken back once: 300 - 30 = 270" "$(balance "$C6")" 270

# Global invariants -------------------------------------------------------------
check "every balance equals its ledger sum and none is negative" \
  "$(q -c "select count(*) from public.loyalty_accounts a
           left join (select customer_id, sum(points) total from public.loyalty_transactions group by 1) t
             on t.customer_id = a.customer_id
           where a.balance <> coalesce(t.total, 0) or a.balance < 0")" 0

exit "$FAILED"
