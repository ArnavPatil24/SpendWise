/** Rules the server enforces too: 8 to 72 characters with at least one letter and one number. */
export const passwordProblem = pw => {
  if (pw.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.';
  return '';
};

/** 0 to 4, with a label. Only a hint for the user; the server rules above are what is enforced. */
export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '' };
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score += 1;
  if (passwordProblem(pw)) score = Math.min(score, 1);
  return { score, label: ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score] };
}
