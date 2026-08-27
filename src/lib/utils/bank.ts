/** "1234567890" -> "XXXXXX7890" — hides all but the last 4 digits for confirmations/receipts. */
export function maskAccountNumber(account: string): string {
  const digits = account.replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  return `${'X'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

/** Groups a raw account number for readability: "1234567890" -> "123-4-56789-0". */
export function formatAccountNumber(account: string): string {
  const digits = account.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 12) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 4)}-${digits.slice(4, -1)}-${digits.slice(-1)}`;
  }
  return account;
}
