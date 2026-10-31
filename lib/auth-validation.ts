export const PASSWORD_HELP = "Use at least 15 characters (72 bytes maximum).";

export function passwordIsValid(password: string) {
  const bytes = new TextEncoder().encode(password).length;
  return bytes >= 15 && bytes <= 72;
}
