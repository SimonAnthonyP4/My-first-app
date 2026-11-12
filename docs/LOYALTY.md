# Loyalty rules

How points are earned, spent and taken back. Every numbered example on this page is an executable
test with the same number in `supabase/tests/07_loyalty_engine.sql`. If a rule changes, change
both.

## The rules in brief

1. **Earning.** `points = floor(cents paid × points per dollar ÷ 100)`. The launch rate is 10
   points per $1, so $9.00 earns 90 points. Partial points round down.
2. **What counts as paid.** The order total: goods minus discounts minus the value of redeemed
   rewards. There is no sales tax. A free item earns nothing.
3. **When.** Only after the payment is confirmed by the payment provider. Never on the app's say-so.
4. **Spending.** Redeeming a reward debits its cost immediately and reserves the reward. If the
   sale does not complete, the reservation is released and the points come back.
5. **Spent is spent.** Once a reward has been handed over (fulfilled), its points are never
   restored, even if the order is later refunded.
6. **Refunds.** A refund takes back the points that order earned, in proportion to the amount
   refunded, but never more than the customer currently has. The shortfall is forfeited. It is not
   collected from future purchases.
7. **Never negative.** A balance cannot go below zero.
8. **Once only.** Each order earns once, each refund reverses once, each redemption is debited
   once, no matter how many times the same request or webhook arrives.

## Launch configuration

| Setting          | Value        | Who can change it |
| ---------------- | ------------ | ----------------- |
| Earn rate        | 10 points/$1 | Owner             |
| Free protein bar | 300 points   | Manager or owner  |
| Free three-pack  | 750 points   | Manager or owner  |
| Free six-pack    | 1,400 points | Manager or owner  |

Changes apply from the next purchase or redemption. Points already earned and rewards already
reserved keep the values they were given.

## The five functions

All are callable by the server only (service role). All can be called again with the same
arguments without changing anything.

| Function                                       | Does                                             | Returns           |
| ---------------------------------------------- | ------------------------------------------------ | ----------------- |
| `award_points_for_order(order, event?)`        | Awards points for a paid order                   | Points awarded    |
| `reverse_points_for_refund(refund, event?)`    | Takes back earned points for a succeeded refund  | Points taken back |
| `redeem_points(customer, reward, key, order?)` | Reserves a reward and debits its cost            | The redemption    |
| `release_redemption(redemption, expired?)`     | Returns the points of an unfulfilled reservation | The redemption    |
| `fulfill_redemption(redemption, order)`        | Marks a reservation as honored on a paid order   | The redemption    |

A redemption moves `reserved → fulfilled`, or `reserved → released`, or `reserved → expired`, and
then never changes again.

### Error codes

| Code    | Meaning                                                              |
| ------- | -------------------------------------------------------------------- |
| `BB001` | Not enough points                                                    |
| `BB002` | The order or refund is not in a state that allows this               |
| `BB003` | The idempotency key was already used for a different redemption      |
| `BB004` | The reward is retired or outside its dates, or the account is closed |
| `BB005` | The redemption is already fulfilled, released or expired             |
| `BB006` | The order, refund, redemption or customer does not exist             |

The same codes are exported as `DB_ERROR` from `packages/contracts`.

## Worked examples

### Earning

**Example 1 — the basic case.** Alice pays $9.00. She earns 90 points. Her balance is 90 and the
order records that it earned 90.

**Example 2 — rounding down.** $0.99 earns 9 points (9.9 rounds down). $10.05 earns 100 (100.5
rounds down). $0.09 earns nothing, and nothing is written to the ledger.

**Example 3 — discounts and rewards do not earn.** An order has $12.00 of goods, a $1.00 discount
and a $3.00 free bar. The customer pays $8.00 and earns 80 points.

**Example 4 — no customer, no points.** A walk-in sale with no member attached earns nothing. So
does an order belonging to an account that has since been closed.

**Example 5 — the same payment arrives five times.** The payment provider re-sends its
confirmation for Alice's order five times, then once more under a different event id. Each call
returns 90. There is one earn row and her balance is 90.

**Example 6 — unpaid orders.** An order that is still pending cannot earn points; the call is
refused. An order id that does not exist is an error, not a silent zero.

**Example 7 — the owner changes the rate.** Rita pays $9.00 at 10 points per dollar and earns 90.
The owner raises the rate to 20. Her next $9.00 earns 180. The earlier order still shows 90. Her
balance is 270.

### Redeeming

**Example 8 — a straightforward redemption.** Rex has 300 points and redeems a free protein bar.
The reward is reserved at a cost of 300 and his balance drops to 0 at once. The ledger shows
`earn +300 (balance 300)` then `redeem −300 (balance 0)`.

**Example 9 — one point short.** Pia has 299 points. Redeeming a 300-point reward is refused. Her
balance is unchanged and no redemption exists.

**Example 10 — retries and idempotency keys.** Remy has 1,000 points. The app sends the same
redemption request five times with the same key (a flaky connection). One redemption exists and
300 points are debited once, leaving 700. Using that key for a different reward, or for a
different customer, is refused. A new key is a new redemption (400 left). A request with no key is
refused.

**Example 11 — the payment fails.** Fay reserves a free bar against an open order; her balance
goes from 300 to 0. The card is declined, so the reservation is released and her 300 points
return. Releasing again does nothing. A released reservation cannot later be fulfilled.

**Example 12 — the payment succeeds.** Dee reserves a free bar and the order is paid, so the
reservation is fulfilled. Fulfilling again does nothing. Releasing it now is refused, and not even
the server can flip it back to reserved: redeemed points stay spent.

A reward can only be fulfilled on a paid order belonging to the same customer, and if it was
reserved for a particular order, only on that order. A reservation that times out is released as
`expired` and its points are returned.

**Example 13 — thresholds change, rewards retire.** Tia reserves a free bar at 300 points. A
manager raises the threshold to 400. Tia's next redemption costs 400. When her first reservation
is released she gets back the 300 it cost, not 400. A retired reward, an unknown reward, a reward
past its end date, and a closed account all refuse redemption.

### Refunds

**Example 14 — full refund.** Fred's $9.00 order earned 90 points. It is refunded in full. 90
points are taken back and the refund records that.

**Example 15 — partial refunds.** Pat's $9.00 order earned 90. A $3.00 refund takes back 30; a
later $6.00 refund takes back the other 60.

Penny's $10.05 order earned 100. Three refunds of $3.35 take back 33, 33 and 34: exactly 100 in
total. Each refund's share is the difference between "points owed back so far" before and after
it, so rounding never leaves a point behind.

**Example 16 — the customer has already spent the points.** Cap earned 90 on one order and 250 on
another, then spent 300 on a free bar. He has 40 points left. The 90-point order is refunded.
Only 40 can be taken back, so 40 are, and his balance is 0. The other 50 are forfeited and the
ledger row says the reversal was capped. His next $5.00 purchase earns the normal 50 points and
his balance is 50: nothing is held back for the old shortfall.

Zed is in the same position but with a balance of exactly 0. His refund takes back nothing and
writes no ledger row, but is still marked as processed.

**Example 17 — the same refund arrives five times.** Each call returns 90. There is one reversal
row and the points are taken back once. The recorded reversal cannot be altered afterwards.

**Example 18 — refunding an order that included a free reward.** Sam spends 300 points on a free
bar and pays $6.00 for other items in the same order, earning 60. The whole order is refunded.
The 60 earned points are taken back. The 300 spent on the reward are not restored.

**Example 19 — refunds that have not gone through.** A refund that is still pending reverses
nothing; the call is refused and the points stay. An unknown refund id is an error.

### Guards

**Example 20 — protections that do not depend on the functions.**

- The SQL formula and the TypeScript preview formula give the same answers (also compared across
  120 amount and rate combinations on every test run).
- A duplicate ledger insert that the database skips does not move the balance.
- Two ledger rows for the same customer cannot be written in one statement.
- A redemption cannot be created already fulfilled, cannot have its cost changed, and cannot be
  deleted.
- After all of the above, every balance equals the sum of its ledger rows and none is negative.
- Customers, cashiers, managers and owners cannot call any of the five functions. Only the server
  can.

## Under concurrency

`scripts/db-concurrency-test.sh` runs these races on real connections:

| Race                                                              | Required outcome                        |
| ----------------------------------------------------------------- | --------------------------------------- |
| 25 debits of 100 against a balance of 300                         | Exactly 3 succeed; balance 0            |
| 50 different redemptions of a 300-point reward against 300 points | Exactly 1 succeeds                      |
| 20 retries of one redemption (same key)                           | One redemption; points debited once     |
| 20 deliveries of one payment confirmation                         | One earn                                |
| Two partial refunds of one order, each delivered 10 times at once | Two reversals totalling what was earned |

It works because every operation on a customer's points first locks that customer's loyalty
account row, so they queue. Operations that start from an order (award, refund) lock the order
first and the account second, always in that sequence, so they cannot deadlock.

## Not decided yet

- **Reservation timeout.** How long an unfulfilled reservation holds points before it expires.
  The mechanism exists (`release_redemption(..., expired => true)`); the schedule comes with
  checkout in M3.
- **Customer-initiated redemption.** Whether customers reserve rewards in the Rewards app ahead of
  time, or only at the till. Both use `redeem_points`; the flow is designed in M3 and M7.
- **Manual adjustments.** The ledger supports them (`adjust`, with a reason and the employee's
  id), but there is no admin screen or function for them yet.
- **Points expiry.** None. The ledger has an `expire` kind reserved for it.
