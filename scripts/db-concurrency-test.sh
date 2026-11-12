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
#   6. 20 retries of one checkout (same idempotency key): one order exists.
#   7. 20 deliveries of one payment confirmation through the webhook handler:
#      the order is completed once (stock, points, reward).
#   8. 10 refund requests at once for the same 3 units: only as many succeed
#      as there are units, and the money requested never exceeds what was paid.
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
P5='00000000-0000-4000-f000-0000000000b5'
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
insert into public.payments (id, order_id, provider_payment_intent, amount_cents, status, succeeded_at)
values ('$P5', '$O5', 'pi_race_5', 901, 'succeeded', now());
insert into public.refunds (id, order_id, payment_id, amount_cents, reason, status, idempotency_key, requested_by, completed_at)
values
  ('$R5A', '$O5', '$P5', 450, 'other', 'succeeded', 'race-refund-5a', '$OWNER', now()),
  ('$R5B', '$O5', '$P5', 451, 'other', 'succeeded', 'race-refund-5b', '$OWNER', now());
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
PRODUCT="$(q -c "select id from public.products where is_active and price_cents = 300 order by sku limit 1")"
CART="[{\"product_id\": \"$PRODUCT\", \"quantity\": 3}]"
STOCK_BEFORE="$(q -c "select on_hand from public.inventory_levels where product_id = '$PRODUCT'")"

ok="$(race 20 "select public.create_order('$OWNER', 'race-checkout-same-key', '$CART'::jsonb, '$C6')")"
check "20 retries of one checkout (same key): all 20 return" "$ok" 20
check "  one order exists" \
  "$(q -c "select count(*) from public.orders where idempotency_key = 'race-checkout-same-key'")" 1
O6="$(q -c "select id from public.orders where idempotency_key = 'race-checkout-same-key'")"
check "  it has one line" "$(q -c "select count(*) from public.order_items where order_id = '$O6'")" 1

# 7 ---------------------------------------------------------------------------
q -c "select public.record_payment_intent('$O6', 'pi_race_6', 900)" >/dev/null
ok="$(race 20 "select public.handle_payment_succeeded('evt_race_paid_6', 'payment_intent.succeeded', '{}'::jsonb, 'pi_race_6', 900)")"
check "20 deliveries of one payment confirmation: all 20 return" "$ok" 20
check "  the order is paid" "$(q -c "select status from public.orders where id = '$O6'")" paid
check "  stock moved once (3 units)" \
  "$(q -c "select $STOCK_BEFORE - on_hand from public.inventory_levels where product_id = '$PRODUCT'")" 3
check "  points awarded once: 90" "$(balance "$C6")" 90
check "  the event is logged once, as processed" \
  "$(q -c "select count(*) || ':' || min(status) from public.stripe_events where id = 'evt_race_paid_6'")" "1:processed"

# 8 ---------------------------------------------------------------------------
ITEM6="$(q -c "select id from public.order_items where order_id = '$O6'")"
ok="$(race 10 "select public.request_refund('$O6', '$OWNER', 'race-refund-6-{i}', '[{\"order_item_id\": \"$ITEM6\", \"quantity\": 2}]'::jsonb, 'customer_request')")"
check "10 simultaneous refund requests for 2 of 3 units: exactly 1 succeeds" "$ok" 1
check "  money requested does not exceed what was paid" \
  "$(q -c "select coalesce(sum(amount_cents), 0) <= 900 from public.refunds where order_id = '$O6' and status <> 'failed'")" t

# Global invariants -------------------------------------------------------------
check "every stock level equals its movement sum" \
  "$(q -c "select count(*) from public.inventory_levels l
           left join (select product_id, sum(delta) total from public.inventory_movements group by 1) m
             on m.product_id = l.product_id
           where l.on_hand <> coalesce(m.total, 0)")" 0

check "every balance equals its ledger sum and none is negative" \
  "$(q -c "select count(*) from public.loyalty_accounts a
           left join (select customer_id, sum(points) total from public.loyalty_transactions group by 1) t
             on t.customer_id = a.customer_id
           where a.balance <> coalesce(t.total, 0) or a.balance < 0")" 0

exit "$FAILED"
