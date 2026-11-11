import { describe, expect, it } from 'vitest';

import { isMembershipCode, membershipQrPayload, parseMembershipQr } from './membership.ts';

const CODE = '0123456789abcdef0123456789abcdef';

describe('membership QR', () => {
  it('builds a payload with no personal data', () => {
    expect(membershipQrPayload(CODE)).toBe(`brobatch:member:${CODE}`);
  });

  it('refuses to encode a malformed code', () => {
    expect(() => membershipQrPayload('alice@example.com')).toThrow(RangeError);
  });

  it('round-trips', () => {
    expect(parseMembershipQr(membershipQrPayload(CODE))).toBe(CODE);
  });

  it('accepts a bare code, upper case and surrounding whitespace', () => {
    expect(parseMembershipQr(CODE)).toBe(CODE);
    expect(parseMembershipQr(`  ${CODE.toUpperCase()}\n`)).toBe(CODE);
    expect(parseMembershipQr(`BROBATCH:MEMBER:${CODE.toUpperCase()}`)).toBe(CODE);
  });

  it.each([
    '',
    'https://example.com/',
    'brobatch:member:',
    'brobatch:member:xyz',
    `brobatch:order:${CODE}`,
    CODE.slice(1),
    `${CODE}0`,
    `${CODE}' or 1=1 --`,
  ])('ignores %j', (scanned) => {
    expect(parseMembershipQr(scanned)).toBeNull();
  });

  it('validates code shape', () => {
    expect(isMembershipCode(CODE)).toBe(true);
    expect(isMembershipCode(CODE.toUpperCase())).toBe(false);
  });
});
