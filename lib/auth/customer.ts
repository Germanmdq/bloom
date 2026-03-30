/** Modo de login para clientes: `phone` requiere SMS en Supabase; `email` usa magic link / OTP por mail. */
export function getCustomerAuthMode(): "phone" | "email" {
  const m = process.env.NEXT_PUBLIC_CUSTOMER_AUTH_MODE?.trim().toLowerCase();
  if (m === "phone" || m === "sms") return "phone";
  return "email";
}
