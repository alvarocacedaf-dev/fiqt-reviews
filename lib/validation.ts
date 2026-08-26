export const UNI_EMAIL_DOMAIN = '@uni.pe';

export function normalizeEmail(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function isUniEmail(email: string) {
  return email.endsWith(UNI_EMAIL_DOMAIN);
}

export function validateRegistrationInput(input: {
  email: string;
  password: string;
  fullName: string;
}) {
  if (!isUniEmail(input.email)) return 'Usa tu correo institucional @uni.pe.';
  if (input.password.length < 8 || !input.fullName) {
    return 'Completa tu nombre y usa una contraseña de al menos 8 caracteres.';
  }
  return null;
}

export function validateLoginInput(input: { email: string; password: string }) {
  return input.email && input.password ? null : 'Completa el correo y la contraseña.';
}

export function validatePasswordResetInput(email: string) {
  return email ? null : 'Ingresa tu correo.';
}

const forbiddenReviewLanguage = /\b(corrupto|corrupta|acosador|acosadora|ladr[oó]n|ladrona|idiota|imb[eé]cil|mierda|puta|maric[oó]n)\b/i;

export function containsForbiddenReviewLanguage(comment: string) {
  return forbiddenReviewLanguage.test(comment);
}
