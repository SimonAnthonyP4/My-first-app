// The rewards screen inside Shopify POS.
//
//   1. Scan the member's QR code (or use the customer already on the cart).
//   2. The member is attached to the cart, so the sale earns them points.
//   3. Pick a reward and the item it pays for. The backend debits the points
//      and returns a single-use discount code, which is applied to the cart.
//   4. If the reward is removed before payment, the points are returned.
//
// This file only shows what the backend says. It never works out points,
// prices or eligibility itself.
//
// NOT YET RUN ON A DEVICE: written against Shopify's POS UI extension
// reference (API version 2026-10). See docs/SHOPIFY.md, "Not yet verified".
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

import { createApi } from './api.ts';
import { BACKEND_URL, isBackendConfigured } from './config.ts';
import {
  eligibleLines,
  formatPoints,
  holdUntil,
  looksLikeMembershipScan,
  newIdempotencyKey,
  rewardState,
  rewardSubtitle,
} from './logic.ts';

export default async () => {
  render(<RewardsScreen />, document.body);
};

const api = createApi({
  baseUrl: BACKEND_URL,
  getToken: () => shopify.session.getSessionToken(),
});

function RewardsScreen() {
  // 'scan' | 'loading' | 'member' | 'choose_item' | 'applied'
  const [step, setStep] = useState('loading');
  const [error, setError] = useState('');
  const [member, setMember] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [chosenReward, setChosenReward] = useState(null);
  const [applied, setApplied] = useState(null);
  const [busy, setBusy] = useState(false);
  const lastScan = useRef('');
  // One key per "apply" attempt, kept across a retry of the same attempt.
  const attemptKey = useRef('');

  function showMember(data) {
    setMember(data.member);
    setRewards(data.rewards);
    setError('');
    setStep('member');
  }

  // On open: if the cart already has a customer, look them up; otherwise scan.
  useEffect(() => {
    if (!isBackendConfigured()) {
      setError('Bro Batch Rewards is not set up yet. Ask the owner to finish the app setup.');
      setStep('scan');
      return;
    }
    const customerId = shopify.cart.current.value?.customer?.id;
    if (!customerId) {
      setStep('scan');
      return;
    }
    api.memberByShopifyCustomer(customerId).then((result) => {
      if (result.ok) {
        showMember(result.data);
      } else {
        // The customer on the cart is not a rewards member: offer to scan.
        setStep('scan');
      }
    });
  }, []);

  // While scanning, listen for a membership QR code.
  useEffect(() => {
    if (step !== 'scan') {
      return undefined;
    }
    shopify.scanner.showCameraScanner();
    const unsubscribe = shopify.scanner.scannerData.current.subscribe(async (scan) => {
      if (!scan?.data || scan.data === lastScan.current) {
        return;
      }
      lastScan.current = scan.data;
      if (!looksLikeMembershipScan(scan.data)) {
        setError('That is not a Bro Batch membership code.');
        return;
      }
      shopify.scanner.hideCameraScanner();
      setStep('loading');
      const result = await api.memberByCode(scan.data);
      if (!result.ok) {
        setError(result.message);
        lastScan.current = '';
        setStep('scan');
        return;
      }
      try {
        // Attach the member to the sale so Shopify records who bought it.
        await shopify.cart.setCustomer({ id: Number(result.data.member.shopify_customer_id) });
      } catch {
        setError('Found the member, but could not add them to the cart. Add them by hand.');
      }
      showMember(result.data);
      shopify.toast.show(`${result.data.member.full_name} added`);
    });
    return () => {
      unsubscribe();
      shopify.scanner.hideCameraScanner();
    };
  }, [step]);

  async function applyReward(reward, line) {
    if (busy) {
      return;
    }
    setBusy(true);
    setError('');
    if (!attemptKey.current) {
      attemptKey.current = newIdempotencyKey();
    }
    const result = await api.reserveReward({
      customerId: member.customer_id,
      rewardId: reward.id,
      idempotencyKey: attemptKey.current,
      variantId: line.variantId,
    });
    if (!result.ok) {
      // A network failure may be retried with the same key. Anything else
      // was refused, so the next tap is a new attempt.
      if (result.code !== 'offline' && result.code !== 'shopify_unavailable') {
        attemptKey.current = '';
      }
      setError(result.message);
      setBusy(false);
      return;
    }
    attemptKey.current = '';
    const reserved = result.data.redemption;
    try {
      await shopify.cart.addCartCodeDiscount(reserved.discount_code);
    } catch {
      // The cart refused the code, so the reward is not on the sale: give
      // the points back straight away.
      await api.releaseReward(reserved.id);
      setError('The reward could not be added to this cart. No points were used.');
      setBusy(false);
      return;
    }
    setApplied(reserved);
    if (typeof result.data.points_balance === 'number') {
      setMember({ ...member, points_balance: result.data.points_balance });
    }
    setChosenReward(null);
    setStep('applied');
    setBusy(false);
    shopify.toast.show(`${reserved.reward_name} applied`);
  }

  function chooseReward(reward) {
    const lines = eligibleLines(shopify.cart.current.value?.lineItems);
    if (lines.length === 0) {
      setError('Add the free item to the cart first, then apply the reward.');
      return;
    }
    setError('');
    if (lines.length === 1) {
      applyReward(reward, lines[0]);
      return;
    }
    setChosenReward(reward);
    setStep('choose_item');
  }

  async function removeReward() {
    if (busy || !applied) {
      return;
    }
    setBusy(true);
    setError('');
    const result = await api.releaseReward(applied.id);
    if (!result.ok) {
      setError(result.message);
      setBusy(false);
      return;
    }
    try {
      await shopify.cart.removeCartDiscount();
    } catch {
      setError('The points were returned. Remove the discount from the cart by hand.');
    }
    if (typeof result.data.points_balance === 'number') {
      setMember({ ...member, points_balance: result.data.points_balance });
    }
    setApplied(null);
    setStep('member');
    setBusy(false);
    shopify.toast.show('Reward removed, points returned');
  }

  return (
    <s-page heading="Bro Batch Rewards">
      <s-scroll-box>
        <s-stack gap="base" padding="base">
          {error ? (
            <s-banner tone="critical" heading="Something needs attention">
              {error}
            </s-banner>
          ) : null}

          {step === 'loading' ? <s-spinner /> : null}

          {step === 'scan' ? (
            <s-section heading="Scan the member's QR code">
              <s-text>Ask the customer to open their Bro Batch Rewards card.</s-text>
            </s-section>
          ) : null}

          {member && step !== 'scan' && step !== 'loading' ? (
            <s-section heading={member.full_name}>
              <s-stack direction="inline" gap="small-200">
                <s-badge tone="success">{formatPoints(member.points_balance)}</s-badge>
              </s-stack>
            </s-section>
          ) : null}

          {step === 'member' ? (
            <s-section heading="Rewards">
              <s-stack gap="small-200">
                {rewards.map((reward) => (
                  <s-stack key={reward.id} gap="small-400">
                    <s-button
                      variant="primary"
                      disabled={busy || rewardState(reward) !== 'available'}
                      onClick={() => chooseReward(reward)}
                    >
                      {reward.name}
                    </s-button>
                    <s-text tone="neutral">{rewardSubtitle(reward, member.points_balance)}</s-text>
                  </s-stack>
                ))}
                <s-button
                  variant="secondary"
                  onClick={() => {
                    lastScan.current = '';
                    setMember(null);
                    setStep('scan');
                  }}
                >
                  Scan a different member
                </s-button>
              </s-stack>
            </s-section>
          ) : null}

          {step === 'choose_item' && chosenReward ? (
            <s-section heading={`Which item is the ${chosenReward.name.toLowerCase()}?`}>
              <s-stack gap="small-200">
                {eligibleLines(shopify.cart.current.value?.lineItems).map((line) => (
                  <s-button
                    key={line.uuid}
                    disabled={busy}
                    onClick={() => applyReward(chosenReward, line)}
                  >
                    {line.title}
                  </s-button>
                ))}
                <s-button
                  variant="secondary"
                  onClick={() => {
                    setChosenReward(null);
                    setStep('member');
                  }}
                >
                  Back
                </s-button>
              </s-stack>
            </s-section>
          ) : null}

          {step === 'applied' && applied ? (
            <s-section heading={`${applied.reward_name} applied`}>
              <s-stack gap="small-200">
                <s-text>
                  {formatPoints(applied.points_cost)} used. The reward is held until{' '}
                  {holdUntil(applied.expires_at)}. If the sale is not finished by then, it is
                  cancelled and the points go back.
                </s-text>
                <s-button
                  variant="secondary"
                  tone="critical"
                  disabled={busy}
                  onClick={removeReward}
                >
                  Remove reward and return points
                </s-button>
              </s-stack>
            </s-section>
          ) : null}
        </s-stack>
      </s-scroll-box>
    </s-page>
  );
}
