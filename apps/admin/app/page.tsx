import {
  DEFAULT_POINTS_PER_DOLLAR,
  LAUNCH_REWARDS,
  cents,
  formatCents,
  pointsForPurchase,
} from '@brobatch/contracts';

import { readPublicEnv } from '@/lib/env.ts';

// Placeholder home page. The real dashboard (sign-in, sales, inventory,
// customers, rewards configuration) is milestone S4. This page exists so the
// app builds, deploys and proves the shared contracts package is wired in.

type MilestoneState = 'done' | 'partial' | 'todo';

const MILESTONES: readonly { id: string; label: string; state: MilestoneState; note: string }[] = [
  { id: 'M0', label: 'Foundations', state: 'done', note: 'Complete' },
  { id: 'M1', label: 'Loyalty database', state: 'done', note: 'Complete' },
  { id: 'M2', label: 'Loyalty engine', state: 'done', note: 'Complete' },
  { id: 'S1', label: 'Shopify backend', state: 'partial', note: 'Built, awaiting Shopify' },
  {
    id: 'S2',
    label: 'Rewards tile in the till',
    state: 'partial',
    note: 'Tested, not on a device',
  },
  { id: 'S4', label: 'Admin dashboard', state: 'todo', note: 'Not started' },
];

const EXAMPLE_SPEND = cents(900);

export default function HomePage() {
  const env = readPublicEnv(process.env);

  return (
    <main className="page">
      <p className="eyebrow">Bro Batch</p>
      <h1 className="title">Admin</h1>
      <p className="lede">
        The dashboard is not built yet. It comes after a Shopify development store has been
        connected and a first sale has run end to end.
      </p>

      <section className="section" aria-labelledby="progress-heading">
        <h2 id="progress-heading">Build progress</h2>
        <ul className="ledger">
          {MILESTONES.map((milestone) => (
            <li key={milestone.id}>
              <span>
                {milestone.id} — {milestone.label}
              </span>
              <span className="status" data-state={milestone.state}>
                {milestone.note}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="loyalty-heading">
        <h2 id="loyalty-heading">Launch loyalty rules</h2>
        <p>
          Customers earn {DEFAULT_POINTS_PER_DOLLAR} points per $1. A {formatCents(EXAMPLE_SPEND)}{' '}
          purchase earns {pointsForPurchase(EXAMPLE_SPEND)} points.
        </p>
        <ul className="ledger">
          {LAUNCH_REWARDS.map((reward) => (
            <li key={reward.name}>
              <span>{reward.name}</span>
              <span className="figure">{reward.pointsCost.toLocaleString('en-US')} pts</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="connection-heading">
        <h2 id="connection-heading">Backend connection</h2>
        {env.ok ? (
          <p>Supabase project configured. Sign-in is added in S4.</p>
        ) : (
          <p className="note">
            No Supabase project is configured for this deployment. Set{' '}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{' '}
            (see <code>.env.example</code>).
          </p>
        )}
      </section>
    </main>
  );
}
