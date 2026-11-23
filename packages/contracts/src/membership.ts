// The membership QR code. Both apps must agree on this format: the Rewards
// app renders it and the POS app scans it.

const CODE_PATTERN = /^[0-9a-f]{32}$/;
const QR_PREFIX = 'brobatch:member:';

/** True for a well-formed membership code (32 lowercase hex characters). */
export function isMembershipCode(value: string): boolean {
  return CODE_PATTERN.test(value);
}

/** Text to encode in the customer's QR code. Contains no personal data. */
export function membershipQrPayload(membershipCode: string): string {
  if (!isMembershipCode(membershipCode)) {
    throw new RangeError('Invalid membership code');
  }
  return `${QR_PREFIX}${membershipCode}`;
}

/**
 * Extracts the membership code from scanned text. Accepts the QR payload or a
 * bare code (for manual entry). Returns null for anything else, so a random
 * QR code scanned by mistake is ignored rather than sent to the server.
 */
export function parseMembershipQr(scanned: string): string | null {
  const text = scanned.trim().toLowerCase();
  const code = text.startsWith(QR_PREFIX) ? text.slice(QR_PREFIX.length) : text;
  return isMembershipCode(code) ? code : null;
}
