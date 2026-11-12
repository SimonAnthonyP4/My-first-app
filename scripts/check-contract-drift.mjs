#!/usr/bin/env node
// Verifies that the value sets in packages/contracts match the database.
//
// The database is the authority (CHECK constraints and enum types in
// supabase/migrations). The contracts package repeats those lists so the web
// and iOS code can use them. This script fails the build if they differ.
//
// Usage: node scripts/check-contract-drift.mjs <database>
// Connection settings come from the standard PG* environment variables.
// Requires Node 22.18+ (imports the TypeScript sources directly).
import { execFileSync } from 'node:child_process';

import * as enums from '../packages/contracts/src/enums.ts';
import {
  DEFAULT_POINTS_PER_DOLLAR,
  LAUNCH_REWARDS,
  pointsForPurchase,
} from '../packages/contracts/src/loyalty.ts';

const database = process.argv[2];
if (!database) {
  console.error('usage: check-contract-drift.mjs <database>');
  process.exit(2);
}

function query(sql) {
  const out = execFileSync('psql', ['-d', database, '-X', '-At', '-F', '\t', '-c', sql], {
    encoding: 'utf8',
  });
  return out
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => line.split('\t'));
}

/** Values allowed by the `<column> IN (...)` CHECK constraint on a table. */
function checkConstraintValues(table, column) {
  const rows = query(`
    select pg_get_constraintdef(c.oid)
    from pg_constraint c
    where c.conrelid = 'public.${table}'::regclass and c.contype = 'c'`);
  const pattern = new RegExp(`^CHECK \\(\\(${column} = ANY \\(ARRAY\\[(.+)\\]\\)\\)\\)$`);
  for (const [definition] of rows) {
    const match = pattern.exec(definition);
    if (match) {
      return [...match[1].matchAll(/'([^']*)'::text/g)].map((m) => m[1]);
    }
  }
  throw new Error(`no IN-list CHECK constraint found for ${table}.${column}`);
}

function enumTypeValues(typeName) {
  return query(`
    select e.enumlabel
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = '${typeName}'
    order by e.enumsortorder`).map(([label]) => label);
}

const problems = [];

function compare(label, fromDatabase, fromContracts) {
  const a = [...fromDatabase].sort();
  const b = [...fromContracts].sort();
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    problems.push(
      `${label}\n    database:  ${JSON.stringify(a)}\n    contracts: ${JSON.stringify(b)}`,
    );
  }
}

compare('employees.role', checkConstraintValues('employees', 'role'), enums.EMPLOYEE_ROLES);
compare(
  'products.category',
  checkConstraintValues('products', 'category'),
  enums.PRODUCT_CATEGORIES,
);
compare(
  'rewards.grants_category',
  checkConstraintValues('rewards', 'grants_category'),
  enums.PRODUCT_CATEGORIES,
);
compare('payments.status', checkConstraintValues('payments', 'status'), enums.PAYMENT_STATUSES);
compare(
  'payments.reader_type',
  checkConstraintValues('payments', 'reader_type'),
  enums.READER_TYPES,
);
compare('refunds.reason', checkConstraintValues('refunds', 'reason'), enums.REFUND_REASONS);
compare('refunds.status', checkConstraintValues('refunds', 'status'), enums.REFUND_STATUSES);
compare(
  'loyalty_transactions.kind',
  checkConstraintValues('loyalty_transactions', 'kind'),
  enums.LOYALTY_TRANSACTION_KINDS,
);
compare(
  'inventory_movements.reason',
  checkConstraintValues('inventory_movements', 'reason'),
  enums.INVENTORY_REASONS,
);
compare(
  'stripe_events.status',
  checkConstraintValues('stripe_events', 'status'),
  enums.STRIPE_EVENT_STATUSES,
);
compare('order_status enum', enumTypeValues('order_status'), enums.ORDER_STATUSES);
compare('redemption_status enum', enumTypeValues('redemption_status'), enums.REDEMPTION_STATUSES);

for (const value of [...enums.COMPLETED_ORDER_STATUSES]) {
  if (!enums.ORDER_STATUSES.includes(value)) {
    problems.push(`COMPLETED_ORDER_STATUSES contains unknown status "${value}"`);
  }
}
for (const value of [...enums.MANUAL_INVENTORY_REASONS]) {
  if (!enums.INVENTORY_REASONS.includes(value)) {
    problems.push(`MANUAL_INVENTORY_REASONS contains unknown reason "${value}"`);
  }
}

// Launch configuration. Only meaningful on a freshly migrated database, which
// is the only place this script runs.
const [[pointsPerDollar]] = query('select points_per_dollar from public.app_settings');
if (Number(pointsPerDollar) !== DEFAULT_POINTS_PER_DOLLAR) {
  problems.push(
    `points_per_dollar: database ${pointsPerDollar}, contracts ${DEFAULT_POINTS_PER_DOLLAR}`,
  );
}

const rewards = query(
  'select name, points_cost, grants_category from public.rewards order by points_cost',
).map(([name, pointsCost, grantsCategory]) => ({
  name,
  pointsCost: Number(pointsCost),
  grantsCategory,
}));
if (JSON.stringify(rewards) !== JSON.stringify(LAUNCH_REWARDS)) {
  problems.push(
    `launch rewards\n    database:  ${JSON.stringify(rewards)}\n    contracts: ${JSON.stringify(LAUNCH_REWARDS)}`,
  );
}

// The points formula exists twice: in SQL (the authority, used when points are
// awarded) and in TypeScript (used to preview "you will earn N points").
// Compare them over a spread of amounts and earn rates.
const formulaCases = [];
for (const rate of [0, 1, 7, 10, 13, 20, 100, 1000]) {
  for (const amount of [
    0, 1, 9, 10, 99, 100, 101, 335, 850, 900, 999, 1005, 1999, 123457, 100000000,
  ]) {
    formulaCases.push([amount, rate]);
  }
}
const formulaRows = query(`
  select c.amount, c.rate, private.points_for_amount(c.amount, c.rate::integer)
  from (values ${formulaCases.map(([amount, rate]) => `(${amount}::bigint, ${rate})`).join(', ')})
    as c(amount, rate)`);
for (const [amount, rate, sqlPoints] of formulaRows) {
  const tsPoints = pointsForPurchase(Number(amount), Number(rate));
  if (Number(sqlPoints) !== tsPoints) {
    problems.push(
      `points formula for ${amount} cents at ${rate}/dollar: database ${sqlPoints}, contracts ${tsPoints}`,
    );
  }
}
if (formulaRows.length !== formulaCases.length) {
  problems.push(
    `points formula: expected ${formulaCases.length} results, got ${formulaRows.length}`,
  );
}

// Every custom error code in the contracts must be raised somewhere in the
// database, and every BBnnn code raised there must be known to the contracts.
const raisedCodes = query(`
  select distinct m[1]
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
  lateral regexp_matches(p.prosrc, '(BB[0-9]{3})', 'g') as m
  where n.nspname in ('public', 'private')`).map(([code]) => code);
compare('custom error codes (BBnnn)', raisedCodes, Object.values(enums.DB_ERROR));

if (problems.length > 0) {
  console.error('Contracts and database disagree:\n');
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error('\nUpdate packages/contracts/src to match the migrations (or the reverse).');
  process.exit(1);
}

console.log(
  `    ok - contracts match the database (12 value sets, ${formulaCases.length} points-formula cases, error codes, launch config)`,
);
