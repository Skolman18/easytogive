/**
 * The admin email address.
 * - Server-side code: set ADMIN_EMAIL in your environment.
 * - Client-side code: set NEXT_PUBLIC_ADMIN_EMAIL (exposed to the browser).
 * Both fall back to the default if unset.
 */
export const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ??
  process.env.ADMIN_EMAIL ??
  "sethmitzel@gmail.com";
