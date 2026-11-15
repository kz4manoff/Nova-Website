/**
 * Cloudflare Pages Function — NOVA PRO Server-Side Payment Verification Blueprint
 *
 * PRO activation must ONLY be issued after validating the transaction signature / webhook
 * with the payment provider using server-side secret credentials.
 */
export const onRequestGet = async ({
  request,
  env,
}: {
  request: Request;
  env: Record<string, string | undefined>;
}): Promise<Response> => {
  if (!env.PAYMENT_PROVIDER_SECRET) {
    return new Response(
      JSON.stringify({
        verified: false,
        message: "Payment verification is not configured on the server yet.",
      }),
      {
        status: 501,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id");
  if (!sessionId) {
    return new Response(
      JSON.stringify({ verified: false, message: "Missing session_id." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      verified: false,
      message: "Verification adapter pending gateway activation.",
    }),
    {
      status: 501,
      headers: { "Content-Type": "application/json" },
    }
  );
};
