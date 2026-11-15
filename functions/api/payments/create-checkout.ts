/**
 * Cloudflare Pages Function — NOVA PRO Checkout Session Blueprint
 *
 * Configure environment variables in Cloudflare Pages > Settings > Environment Variables:
 * - PAYMENT_PROVIDER_SECRET (never expose to client)
 * - PAYMENT_MERCHANT_ID
 * - APP_ORIGIN
 */
export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Record<string, string | undefined>;
}): Promise<Response> => {
  if (!env.PAYMENT_PROVIDER_SECRET || !env.PAYMENT_MERCHANT_ID) {
    return new Response(
      JSON.stringify({
        error: "Payment provider credentials are not configured yet.",
      }),
      {
        status: 501,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  let body: { email?: string } = {};
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return new Response(
      JSON.stringify({ error: "A valid email address is required." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Server-side gateway integration point (e.g., CMI, Payzone, Stripe, Lemon Squeezy):
  // Create a signed checkout session on the server using env.PAYMENT_PROVIDER_SECRET,
  // enforce the authoritative 49 MAD price on the server, and return the hosted checkoutUrl.
  return new Response(
    JSON.stringify({
      error: "Gateway adapter not implemented yet.",
    }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    }
  );
};
