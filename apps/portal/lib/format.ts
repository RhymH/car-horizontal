/**
 * Format an E.164 phone number into a human-readable form.
 * Examples:
 *   +33655555555 → +33 6 55 55 55 55
 *   +14155551234 → +1 415 555 1234
 *   0655555555   → 06 55 55 55 55
 *   anything else: returned untouched (after trim).
 */
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("+33")) {
    const rest = trimmed.slice(3).replace(/\D/g, "");
    if (rest.length === 9) {
      return `+33 ${rest[0]} ${rest.slice(1, 3)} ${rest.slice(3, 5)} ${rest.slice(5, 7)} ${rest.slice(7, 9)}`;
    }
  }

  if (/^0\d{9}$/.test(trimmed)) {
    return `${trimmed.slice(0, 2)} ${trimmed.slice(2, 4)} ${trimmed.slice(4, 6)} ${trimmed.slice(6, 8)} ${trimmed.slice(8, 10)}`;
  }

  if (trimmed.startsWith("+")) {
    const digits = trimmed.slice(1).replace(/\D/g, "");
    if (digits.length >= 7) {
      const cc = digits.slice(0, Math.min(3, digits.length - 7));
      const subscriber = digits.slice(cc.length);
      const groups: string[] = [];
      let i = subscriber.length;
      while (i > 0) {
        const start = Math.max(0, i - 3);
        groups.unshift(subscriber.slice(start, i));
        i = start;
      }
      return `+${cc} ${groups.join(" ")}`;
    }
  }

  return trimmed;
}
