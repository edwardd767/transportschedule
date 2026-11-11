// Derives gender from a Malaysian IC (12 digits): odd last digit = Male, even = Female.
export function genderFromIdentity(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 12) return '';
  return Number(digits[11]) % 2 === 1 ? 'Male' : 'Female';
}
