// @vitest-environment jsdom
/// <reference types="@shopify/ui-extensions/pos.home.modal.render" />
// The rewards screen, run in Shopify's extension tester: a mock of the POS
// `shopify` API (cart, scanner, session, toast) and a mock `fetch` standing in
// for the Bro Batch backend. These check what the screen does, not how it
// looks: Shopify draws the `s-*` elements on the device.
import { fireEvent, waitFor } from '@testing-library/preact';
import { getExtension } from '@shopify/ui-extensions-tester';
import { createCartLineItem } from '@shopify/ui-extensions-tester/point-of-sale';
import { render } from 'preact';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const config = vi.hoisted(() => ({ configured: true }));
vi.mock('../src/config.ts', () => ({
  BACKEND_URL: 'https://backend.test/functions/v1',
  isBackendConfigured: () => config.configured,
}));

const MEMBER = {
  customer_id: 'c0000000-0000-4000-8000-000000000001',
  full_name: 'Alice Baker',
  points_balance: 800,
  shopify_customer_id: '7001',
};

const BAR = {
  id: 'a0000000-0000-4000-8000-000000000001',
  name: 'Free protein bar',
  description: null,
  points_cost: 300,
  grants_category: 'bar',
  quantity: 1,
  affordable: true,
  available_at_pos: true,
};
const THREE_PACK = {
  ...BAR,
  id: 'a0000000-0000-4000-8000-000000000002',
  name: 'Free three-pack',
  points_cost: 750,
  available_at_pos: false,
};
const SIX_PACK = {
  ...BAR,
  id: 'a0000000-0000-4000-8000-000000000003',
  name: 'Free six-pack',
  points_cost: 1400,
  affordable: false,
};
const MEMBER_RESPONSE = {
  member: MEMBER,
  points_per_dollar: 10,
  rewards: [BAR, THREE_PACK, SIX_PACK],
};

const RESERVED = {
  id: 'd0000000-0000-4000-8000-000000000001',
  discount_code: 'BB-ABCD-EFGH-JKLM',
  expires_at: '2026-11-13T15:45:00Z',
  points_cost: 300,
  discount_cents: 350,
  reward_name: 'Free protein bar',
};
const RESERVE_RESPONSE = { redemption: RESERVED, points_balance: 500 };
const RELEASE_RESPONSE = {
  redemption: { id: RESERVED.id, status: 'released' },
  points_balance: 800,
};

type Reply = { status: number; body: unknown } | 'offline';
interface Call {
  path: string;
  body: Record<string, unknown>;
  authorization: string | null;
}

const extension = getExtension('pos.home.modal.render');
let calls: Call[];
let replies: Record<string, Reply[]>;
let scan: (data: string) => void;
let unsubscribed: number;

function ok(body: unknown): Reply {
  return { status: 200, body };
}
function refused(status: number, code: string, message: string): Reply {
  return { status, body: { error: { code, message } } };
}

/** Queue replies for an endpoint; the last one repeats. */
function backend(path: string, ...queue: Reply[]) {
  replies[path] = queue;
}

function callsTo(path: string): Call[] {
  return calls.filter((call) => call.path === path);
}

function buttons(): Element[] {
  return Array.from(document.body.querySelectorAll('s-button'));
}
function button(label: string): Element {
  const found = buttons().find((element) => element.textContent === label);
  if (!found) {
    throw new Error(
      `no button "${label}"; have: ${buttons()
        .map((b) => b.textContent)
        .join(' | ')}`,
    );
  }
  return found;
}
function bannerText(): string {
  return document.body.querySelector('s-banner')?.textContent ?? '';
}
function headings(): string[] {
  return Array.from(document.body.querySelectorAll('s-section')).map(
    (section) => section.getAttribute('heading') ?? '',
  );
}
function bodyText(): string {
  return document.body.textContent ?? '';
}

function cartHasMember() {
  extension.shopify.cart.current.value.customer = { id: 7001 };
}
function cartHasLines(...lines: { title: string; variantId: number }[]) {
  extension.shopify.cart.current.value.lineItems = lines.map((line, index) =>
    createCartLineItem({ uuid: `line-${index + 1}`, quantity: 1, ...line }),
  );
}

/** Open the screen on a member who is already the cart's customer. */
async function openOnMember() {
  cartHasMember();
  backend('pos-member', ok(MEMBER_RESPONSE));
  await extension.render();
  await waitFor(() => expect(headings()).toContain('Alice Baker'));
}

/** Open the screen on an empty cart and wait until it is listening for a scan. */
async function openOnScanner() {
  await extension.render();
  await waitFor(() => {
    expect(headings()).toContain("Scan the member's QR code");
    expect(extension.shopify.scanner.scannerData.current.subscribe).toHaveBeenCalled();
  });
}

beforeEach(() => {
  config.configured = true;
  calls = [];
  replies = {};
  unsubscribed = 0;
  scan = () => {
    throw new Error('the screen is not listening for scans');
  };
  extension.setUp();
  // An empty cart with no customer. The tester refuses to read or set an
  // optional field its default cart lacks, so the cart is replaced with one
  // where `customer` is present and empty, as on a real cart.
  extension.shopify.cart.current.value = {
    subtotal: '0.00',
    taxTotal: '0.00',
    grandTotal: '0.00',
    currency: 'USD',
    cartDiscounts: [],
    lineItems: [],
    properties: {},
    customer: undefined,
  };

  extension.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input).replace('https://backend.test/functions/v1/', '');
    const headers = new Headers(init?.headers);
    calls.push({
      path,
      body: JSON.parse(String(init?.body)),
      authorization: headers.get('authorization'),
    });
    const queue = replies[path] ?? [];
    const reply = queue.length > 1 ? queue.shift() : queue[0];
    if (reply === undefined) {
      throw new Error(`unexpected call to ${path}`);
    }
    if (reply === 'offline') {
      throw new TypeError('network down');
    }
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { 'content-type': 'application/json' },
    });
  });

  // The tester's signals do not fire, so capture the screen's scan listener
  // and call it ourselves.
  extension.shopify.scanner.scannerData.current.subscribe = vi.fn((listener) => {
    scan = (data: string) => listener({ data, source: 'camera' });
    return () => {
      unsubscribed += 1;
    };
  });
  vi.spyOn(extension.shopify.scanner, 'showCameraScanner');
  vi.spyOn(extension.shopify.scanner, 'hideCameraScanner');
  vi.spyOn(extension.shopify.cart, 'setCustomer');
  vi.spyOn(extension.shopify.cart, 'addCartCodeDiscount');
  vi.spyOn(extension.shopify.cart, 'removeCartDiscount');
  vi.spyOn(extension.shopify.toast, 'show');
});

afterEach(() => {
  render(null, document.body);
  extension.tearDown();
  vi.restoreAllMocks();
});

// --- Opening the screen ------------------------------------------------------

test('before the app is set up, it says so and calls nothing', async () => {
  config.configured = false;
  cartHasMember();
  await extension.render();

  await waitFor(() => expect(bannerText()).toContain('not set up yet'));
  expect(calls).toHaveLength(0);
});

test('with no customer on the cart, it opens the camera to scan', async () => {
  await openOnScanner();

  expect(extension.shopify.scanner.showCameraScanner).toHaveBeenCalled();
  expect(calls).toHaveLength(0);
});

test('with a member already on the cart, it shows their points and rewards', async () => {
  await openOnMember();

  expect(callsTo('pos-member')).toEqual([
    {
      path: 'pos-member',
      body: { shopify_customer_id: '7001' },
      authorization: 'Bearer mock-session-token',
    },
  ]);
  expect(document.body.querySelector('s-badge')?.textContent).toBe('800 points');
  expect(button('Free protein bar').hasAttribute('disabled')).toBe(false);
  // Not connected to a Shopify collection yet, and not enough points.
  expect(button('Free three-pack').hasAttribute('disabled')).toBe(true);
  expect(button('Free six-pack').hasAttribute('disabled')).toBe(true);
  expect(bodyText()).toContain('750 points · not available at the till yet');
  expect(bodyText()).toContain('1,400 points · 600 points to go');
  expect(extension.shopify.scanner.showCameraScanner).not.toHaveBeenCalled();
});

test('a cart customer who is not a member leads to the scanner, without an error', async () => {
  cartHasMember();
  backend('pos-member', refused(404, 'not_found', 'No member found.'));
  await extension.render();

  await waitFor(() => expect(headings()).toContain("Scan the member's QR code"));
  expect(bannerText()).toBe('');
});

test('without a Shopify session token, nothing is sent and the cashier is told why', async () => {
  extension.shopify.session.getSessionToken = vi.fn(async () => undefined);
  await openOnScanner();

  scan('brobatch:member:0123456789abcdef0123456789abcdef');

  await waitFor(() => expect(bannerText()).toContain('does not have access'));
  expect(extension.fetch).not.toHaveBeenCalled();
});

// --- Scanning ----------------------------------------------------------------

test('scanning a membership code finds the member and attaches them to the cart', async () => {
  backend('pos-member', ok(MEMBER_RESPONSE));
  await openOnScanner();

  scan('brobatch:member:0123456789abcdef0123456789abcdef');

  await waitFor(() => expect(headings()).toContain('Alice Baker'));
  expect(callsTo('pos-member')[0]?.body).toEqual({
    membership_code: 'brobatch:member:0123456789abcdef0123456789abcdef',
  });
  expect(extension.shopify.cart.setCustomer).toHaveBeenCalledWith({ id: 7001 });
  expect(extension.shopify.toast.show).toHaveBeenCalledWith('Alice Baker added');
  expect(extension.shopify.scanner.hideCameraScanner).toHaveBeenCalled();
  expect(unsubscribed).toBeGreaterThan(0);
});

test('scanning something else is refused on the spot, without calling the backend', async () => {
  await openOnScanner();

  scan('0123456789012');

  await waitFor(() => expect(bannerText()).toContain('not a Bro Batch membership code'));
  expect(calls).toHaveLength(0);
  expect(extension.shopify.cart.setCustomer).not.toHaveBeenCalled();
});

test('an unknown membership code shows the backend’s message and scanning continues', async () => {
  backend('pos-member', refused(404, 'not_found', 'No member has that code.'), ok(MEMBER_RESPONSE));
  await openOnScanner();

  scan('brobatch:member:ffffffffffffffffffffffffffffffff');
  await waitFor(() => expect(bannerText()).toContain('No member has that code.'));
  expect(headings()).toContain("Scan the member's QR code");

  // The same code can be scanned again after a failure.
  scan('brobatch:member:ffffffffffffffffffffffffffffffff');
  await waitFor(() => expect(headings()).toContain('Alice Baker'));
  expect(bannerText()).toBe('');
});

test('if the member cannot be attached to the cart, they are still shown, with a warning', async () => {
  backend('pos-member', ok(MEMBER_RESPONSE));
  extension.shopify.cart.setCustomer = vi.fn(async () => {
    throw new Error('cart is locked');
  });
  await openOnScanner();

  scan('brobatch:member:0123456789abcdef0123456789abcdef');

  await waitFor(() => expect(headings()).toContain('Alice Baker'));
  // Without the customer on the cart the sale earns nothing: the cashier must see this.
  expect(bannerText()).toContain('this sale will not earn points');
  expect(extension.shopify.toast.show).not.toHaveBeenCalled();
  expect(button('Free protein bar')).toBeTruthy();
});

test('“Scan a different member” goes back to the scanner', async () => {
  await openOnMember();

  fireEvent.click(button('Scan a different member'));

  await waitFor(() => expect(headings()).toContain("Scan the member's QR code"));
  expect(headings()).not.toContain('Alice Baker');
  expect(extension.shopify.scanner.showCameraScanner).toHaveBeenCalled();
});

// --- Applying a reward -------------------------------------------------------

test('a reward needs its item in the cart first', async () => {
  await openOnMember();

  fireEvent.click(button('Free protein bar'));

  await waitFor(() => expect(bannerText()).toContain('Add the free item to the cart first'));
  expect(callsTo('pos-reserve-reward')).toHaveLength(0);
});

test('with one item in the cart, the reward is reserved and its code applied', async () => {
  cartHasLines({ title: 'Peanut Butter Bar', variantId: 44001 });
  backend('pos-reserve-reward', ok(RESERVE_RESPONSE));
  await openOnMember();

  fireEvent.click(button('Free protein bar'));

  await waitFor(() => expect(headings()).toContain('Free protein bar applied'));
  const [reserve] = callsTo('pos-reserve-reward');
  expect(reserve?.authorization).toBe('Bearer mock-session-token');
  expect(reserve?.body).toEqual({
    customer_id: MEMBER.customer_id,
    reward_id: BAR.id,
    idempotency_key: expect.stringMatching(/^[0-9a-zA-Z_-]{16,}$/),
    variant_id: '44001',
  });
  expect(extension.shopify.cart.addCartCodeDiscount).toHaveBeenCalledWith('BB-ABCD-EFGH-JKLM');
  expect(document.body.querySelector('s-badge')?.textContent).toBe('500 points');
  expect(bodyText()).toContain('300 points used');
  expect(extension.shopify.toast.show).toHaveBeenCalledWith('Free protein bar applied');
});

test('with several items, the cashier picks which one is free', async () => {
  cartHasLines(
    { title: 'Peanut Butter Bar', variantId: 44001 },
    { title: 'Chocolate Bar', variantId: 44002 },
  );
  backend('pos-reserve-reward', ok(RESERVE_RESPONSE));
  await openOnMember();

  fireEvent.click(button('Free protein bar'));
  await waitFor(() => expect(headings()).toContain('Which item is the free protein bar?'));
  expect(callsTo('pos-reserve-reward')).toHaveLength(0);

  fireEvent.click(button('Chocolate Bar'));

  await waitFor(() => expect(headings()).toContain('Free protein bar applied'));
  expect(callsTo('pos-reserve-reward')[0]?.body.variant_id).toBe('44002');
});

test('“Back” from choosing an item returns to the rewards without reserving', async () => {
  cartHasLines(
    { title: 'Peanut Butter Bar', variantId: 44001 },
    { title: 'Chocolate Bar', variantId: 44002 },
  );
  await openOnMember();
  fireEvent.click(button('Free protein bar'));
  await waitFor(() => expect(headings()).toContain('Which item is the free protein bar?'));

  fireEvent.click(button('Back'));

  await waitFor(() => expect(headings()).toContain('Rewards'));
  expect(callsTo('pos-reserve-reward')).toHaveLength(0);
});

test('a refusal from the backend is shown and nothing is applied', async () => {
  cartHasLines({ title: 'Peanut Butter Bar', variantId: 44001 });
  backend(
    'pos-reserve-reward',
    refused(409, 'insufficient_points', 'Not enough points for this reward.'),
  );
  await openOnMember();

  fireEvent.click(button('Free protein bar'));

  await waitFor(() => expect(bannerText()).toContain('Not enough points for this reward.'));
  expect(extension.shopify.cart.addCartCodeDiscount).not.toHaveBeenCalled();
  expect(headings()).toContain('Rewards');
  expect(document.body.querySelector('s-badge')?.textContent).toBe('800 points');
});

test('a retry after a dropped connection reuses the key; a retry after a refusal does not', async () => {
  cartHasLines({ title: 'Peanut Butter Bar', variantId: 44001 });
  backend(
    'pos-reserve-reward',
    'offline',
    refused(409, 'insufficient_points', 'Not enough points for this reward.'),
    ok(RESERVE_RESPONSE),
  );
  await openOnMember();

  fireEvent.click(button('Free protein bar'));
  await waitFor(() => expect(bannerText()).toContain('Could not reach Bro Batch Rewards'));
  fireEvent.click(button('Free protein bar'));
  await waitFor(() => expect(bannerText()).toContain('Not enough points'));
  fireEvent.click(button('Free protein bar'));
  await waitFor(() => expect(headings()).toContain('Free protein bar applied'));

  const keys = callsTo('pos-reserve-reward').map((call) => call.body.idempotency_key);
  expect(keys).toHaveLength(3);
  // 1 failed on the network, so 2 is the same attempt. 2 was refused, so 3 is new.
  expect(keys[1]).toBe(keys[0]);
  expect(keys[2]).not.toBe(keys[1]);
});

test('if the cart refuses the code, the points are returned at once', async () => {
  cartHasLines({ title: 'Peanut Butter Bar', variantId: 44001 });
  backend('pos-reserve-reward', ok(RESERVE_RESPONSE));
  backend('pos-release-reward', ok(RELEASE_RESPONSE));
  extension.shopify.cart.addCartCodeDiscount = vi.fn(async () => {
    throw new Error('code not accepted');
  });
  await openOnMember();

  fireEvent.click(button('Free protein bar'));

  await waitFor(() => expect(bannerText()).toContain('No points were used'));
  expect(callsTo('pos-release-reward')[0]?.body).toEqual({ redemption_id: RESERVED.id });
  expect(headings()).not.toContain('Free protein bar applied');
  expect(document.body.querySelector('s-badge')?.textContent).toBe('800 points');
});

test('if the cart refuses the code and the points cannot be returned yet, it says when they will be', async () => {
  cartHasLines({ title: 'Peanut Butter Bar', variantId: 44001 });
  backend('pos-reserve-reward', ok(RESERVE_RESPONSE));
  backend('pos-release-reward', 'offline');
  extension.shopify.cart.addCartCodeDiscount = vi.fn(async () => {
    throw new Error('code not accepted');
  });
  await openOnMember();

  fireEvent.click(button('Free protein bar'));

  await waitFor(() => expect(bannerText()).toContain('The points will be returned by'));
  expect(bannerText()).not.toContain('No points were used');
  expect(headings()).not.toContain('Free protein bar applied');
});

// --- Removing a reward -------------------------------------------------------

async function openWithRewardApplied() {
  cartHasLines({ title: 'Peanut Butter Bar', variantId: 44001 });
  backend('pos-reserve-reward', ok(RESERVE_RESPONSE));
  await openOnMember();
  fireEvent.click(button('Free protein bar'));
  await waitFor(() => expect(headings()).toContain('Free protein bar applied'));
}

test('removing the reward returns the points and takes the discount off the cart', async () => {
  backend('pos-release-reward', ok(RELEASE_RESPONSE));
  await openWithRewardApplied();

  fireEvent.click(button('Remove reward and return points'));

  await waitFor(() => expect(headings()).toContain('Rewards'));
  expect(callsTo('pos-release-reward')[0]?.body).toEqual({ redemption_id: RESERVED.id });
  expect(extension.shopify.cart.removeCartDiscount).toHaveBeenCalledTimes(1);
  expect(document.body.querySelector('s-badge')?.textContent).toBe('800 points');
  expect(extension.shopify.toast.show).toHaveBeenCalledWith('Reward removed, points returned');
});

test('if the points cannot be returned, the reward stays on the sale', async () => {
  backend(
    'pos-release-reward',
    refused(409, 'redemption_final', 'This reward has already been used.'),
  );
  await openWithRewardApplied();

  fireEvent.click(button('Remove reward and return points'));

  await waitFor(() => expect(bannerText()).toContain('This reward has already been used.'));
  expect(extension.shopify.cart.removeCartDiscount).not.toHaveBeenCalled();
  expect(headings()).toContain('Free protein bar applied');
});

test('if the discount cannot be taken off the cart, the points are still returned and the cashier is told', async () => {
  backend('pos-release-reward', ok(RELEASE_RESPONSE));
  await openWithRewardApplied();
  extension.shopify.cart.removeCartDiscount = vi.fn(async () => {
    throw new Error('cart is locked');
  });

  fireEvent.click(button('Remove reward and return points'));

  await waitFor(() => expect(bannerText()).toContain('remove it by hand'));
  expect(headings()).toContain('Rewards');
  expect(document.body.querySelector('s-badge')?.textContent).toBe('800 points');
});

// --- Opening the screen again --------------------------------------------------

test('opened again while a reward is held, it shows that reward and can remove it', async () => {
  cartHasMember();
  backend(
    'pos-member',
    ok({
      ...MEMBER_RESPONSE,
      member: { ...MEMBER, points_balance: 500 },
      held_rewards: [RESERVED],
    }),
  );
  backend('pos-release-reward', ok(RELEASE_RESPONSE));
  await extension.render();

  await waitFor(() => expect(headings()).toContain('Free protein bar applied'));
  expect(document.body.querySelector('s-badge')?.textContent).toBe('500 points');
  // Nothing new is reserved just by opening the screen.
  expect(callsTo('pos-reserve-reward')).toHaveLength(0);
  expect(extension.shopify.cart.addCartCodeDiscount).not.toHaveBeenCalled();

  fireEvent.click(button('Remove reward and return points'));

  await waitFor(() => expect(headings()).toContain('Rewards'));
  expect(callsTo('pos-release-reward')[0]?.body).toEqual({ redemption_id: RESERVED.id });
  expect(document.body.querySelector('s-badge')?.textContent).toBe('800 points');
});

test('a scanned member who is holding a reward is shown that reward too', async () => {
  backend('pos-member', ok({ ...MEMBER_RESPONSE, held_rewards: [RESERVED] }));
  await openOnScanner();

  scan('brobatch:member:0123456789abcdef0123456789abcdef');

  await waitFor(() => expect(headings()).toContain('Free protein bar applied'));
  expect(extension.shopify.cart.setCustomer).toHaveBeenCalledWith({ id: 7001 });
});
