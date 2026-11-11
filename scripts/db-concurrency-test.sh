#!/usr/bin/env bash
# Races many writers against one loyalty account and checks that the balance
# never goes negative and always equals the ledger sum.
#
# A customer is given 300 points, then 25 connections each try to debit 100 at
# the same moment. Exactly 3 may succeed; the other 22 must be rejected.
#
# Usage: scripts/db-concurrency-test.sh <database>   (PG* variables as usual)
set -euo pipefail

DB="${1:?usage: db-concurrency-test.sh <database>}"
WRITERS=25
q() { psql -d "$DB" -v ON_ERROR_STOP=1 -X -Atq "$@"; }

q <<'SQL' >/dev/null
insert into auth.users (id, email) values
  ('00000000-0000-4000-f000-0000000000c1', 'race-customer@test.brobatch'),
  ('00000000-0000-4000-f000-0000000000e1', 'race-owner@test.brobatch');
insert into public.employees (id, full_name, role)
  values ('00000000-0000-4000-f000-0000000000e1', 'Race Owner', 'owner');
insert into public.customers (id, full_name, email)
  values ('00000000-0000-4000-f000-0000000000c1', 'Race Customer', 'race-customer@test.brobatch');
insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
  values ('00000000-0000-4000-f000-0000000000c1', 'adjust', 300, 'race test: opening balance',
          '00000000-0000-4000-f000-0000000000e1');
SQL

pids=()
for i in $(seq 1 "$WRITERS"); do
  psql -d "$DB" -X -Atq -c "
    insert into public.loyalty_transactions (customer_id, kind, points, reason, created_by)
    values ('00000000-0000-4000-f000-0000000000c1', 'adjust', -100, 'race test: debit $i',
            '00000000-0000-4000-f000-0000000000e1')" >/dev/null 2>&1 &
  pids+=("$!")
done

succeeded=0
for pid in "${pids[@]}"; do
  if wait "$pid"; then succeeded=$((succeeded + 1)); fi
done

balance="$(q -c "select balance from public.loyalty_accounts
                 where customer_id = '00000000-0000-4000-f000-0000000000c1'")"
ledger_sum="$(q -c "select coalesce(sum(points), 0) from public.loyalty_transactions
                    where customer_id = '00000000-0000-4000-f000-0000000000c1'")"
debits="$(q -c "select count(*) from public.loyalty_transactions
                where customer_id = '00000000-0000-4000-f000-0000000000c1' and points = -100")"
min_balance="$(q -c "select min(balance_after) from public.loyalty_transactions
                     where customer_id = '00000000-0000-4000-f000-0000000000c1'")"

echo "    writers=$WRITERS succeeded=$succeeded debits=$debits balance=$balance ledger_sum=$ledger_sum min_balance_after=$min_balance"

fail=0
[[ "$succeeded" == "3" ]]       || { echo "FAIL: expected exactly 3 successful debits, got $succeeded"; fail=1; }
[[ "$debits" == "3" ]]          || { echo "FAIL: expected 3 debit rows, got $debits"; fail=1; }
[[ "$balance" == "0" ]]         || { echo "FAIL: expected balance 0, got $balance"; fail=1; }
[[ "$ledger_sum" == "$balance" ]] || { echo "FAIL: balance $balance does not match ledger sum $ledger_sum"; fail=1; }
[[ "$min_balance" == "0" ]]     || { echo "FAIL: balance_after went to $min_balance"; fail=1; }

if [[ "$fail" == "0" ]]; then
  echo "    ok - concurrent debits cannot overdraw a loyalty account"
fi
exit "$fail"
