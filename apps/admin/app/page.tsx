import {
  DEFAULT_POINTS_PER_DOLLAR,
  LAUNCH_REWARDS,
  cents,
  formatCents,
  pointsForPurchase,
} from '@brobatch/contracts';

import { readPublicEnv } from '@/lib/env.ts';

// Placeholder home page. The real dashboard (sign-in, sales, inventory,
// customers, rewards configuration) is milestone M4. This page exists so the
// app builds, deploys and proves the shared contracts package is wired in.

const MILESTONES = [
  { id: 'M0', label: 'Foundations', done: true },
  { id: 'M1', label: 'Database schema and security', done: true },
  { id: 'M2', label: 'Loyalty engine', done: true },
  { id: 'M3', label: 'Payments (Stripe sandbox)', done: false },
  { id: 'M4', label: 'Admin dashboard', done: false },
] as const;

const EXAMPLE_SPEND = cents(900);

export default function HomePage() {
  const env = readPublicEnv(process.env);

  return (
    <main className="page">
      <p className="eyebrow">Bro Batch</p>
      <h1 className="title">Admin</h1>
      <p className="lede">
        The dashboard is not built yet. It arrives in milestone M4, after the loyalty engine and
        payments are in place.
      </p>

      <section className="section" aria-labelledby="progress-heading">
        <h2 id="progress-heading">Build progress</h2>
        <ul className="ledger">
          {MILESTONES.map((milestone) => (
            <li key={milestone.id}>
              <span>
                {milestone.id} — {milestone.label}
              </span>
              <span className="status" data-state={milestone.done ? 'done' : 'todo'}>
                {milestone.done ? 'Complete' : 'Not started'}
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
          <p>Supabase project configured. Sign-in is added in M4.</p>
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
