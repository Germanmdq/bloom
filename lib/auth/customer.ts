/** Cliente Bloom: login con email y contraseña (Supabase Auth). Sin OTP ni teléfono. */
export const CUSTOMER_AUTH_MODE = "email-password" as const;

export type CustomerAuthMode = typeof CUSTOMER_AUTH_MODE;

export function getCustomerAuthMode(): CustomerAuthMode {
  return CUSTOMER_AUTH_MODE;
}
