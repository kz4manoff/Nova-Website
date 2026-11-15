/**
 * Cloudflare Pages Function — Support Contact Relay Blueprint
 *
 * Connect your email provider (e.g. Resend, Postmark, or MailChannels)
 * via Cloudflare Pages environment secrets before enabling `siteConfig.support.formEndpoint`.
 */
export const onRequestPost = async ({
  request,
  env,
}: {
  request: Request;
  env: Record<string, string | undefined>;
}): Promise<Response> => {
  if (!env.SUPPORT_WEBHOOK_OR_EMAIL_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "Support email delivery is not configured on the server yet.",
      }),
      {
        status: 501,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const data = (await request.json()) as {
      name?: string;
      email?: string;
      topic?: string;
      message?: string;
    };

    if (!data.name || !data.email || !data.message) {
      return new Response(
        JSON.stringify({ error: "All required fields must be filled." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Email relay adapter not wired yet.",
      }),
      { status: 501, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
