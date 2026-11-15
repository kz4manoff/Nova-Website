import { siteConfig } from "../config/siteConfig";

export interface CheckoutSessionRequest {
  email: string;
  deviceLabel?: string;
}

export interface CheckoutSessionResult {
  status: "redirect_ready" | "coming_soon" | "error";
  checkoutUrl?: string;
  sessionId?: string;
  message: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  licenseReference?: string;
  message: string;
}

/**
 * Initiates a server-verified checkout session for NOVA PRO.
 * Never embeds secret keys or performs client-side entitlement grants.
 */
export async function createProCheckoutSession(
  payload: CheckoutSessionRequest
): Promise<CheckoutSessionResult> {
  const { paymentProvider } = siteConfig.pro;

  if (!paymentProvider.configured) {
    return {
      status: "coming_soon",
      message:
        "NOVA PRO online checkout is coming soon. Payment activation will go live once server-side gateway verification is connected.",
    };
  }

  try {
    const response = await fetch(paymentProvider.createCheckoutEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: payload.email,
        deviceLabel: payload.deviceLabel,
        product: "nova_pro_lifetime",
        currency: siteConfig.pro.currencyIso,
      }),
    });

    if (response.status === 501) {
      return {
        status: "coming_soon",
        message:
          "Payment gateway credentials are not yet active on the server. Coming soon.",
      };
    }

    if (!response.ok) {
      const errorData = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      return {
        status: "error",
        message:
          errorData?.error ??
          "Unable to start secure checkout right now. Please try again shortly.",
      };
    }

    const data = (await response.json()) as {
      checkoutUrl?: string;
      sessionId?: string;
    };

    if (!data.checkoutUrl) {
      return {
        status: "error",
        message: "Payment provider did not return a valid checkout URL.",
      };
    }

    return {
      status: "redirect_ready",
      checkoutUrl: data.checkoutUrl,
      sessionId: data.sessionId,
      message: "Redirecting to secure payment gateway.",
    };
  } catch {
    return {
      status: "error",
      message:
        "Network error while contacting the payment verification server.",
    };
  }
}

/**
 * Verifies a completed checkout session strictly against the backend server.
 */
export async function verifyProPaymentSession(
  sessionId: string
): Promise<PaymentVerificationResult> {
  const { paymentProvider } = siteConfig.pro;

  if (!paymentProvider.configured) {
    return {
      verified: false,
      message: "Payment verification is not active yet.",
    };
  }

  try {
    const response = await fetch(
      `${paymentProvider.verifyPaymentEndpoint}?session_id=${encodeURIComponent(sessionId)}`,
      { method: "GET" }
    );

    if (!response.ok) {
      return {
        verified: false,
        message: "Could not verify payment session.",
      };
    }

    const data = (await response.json()) as {
      verified?: boolean;
      licenseReference?: string;
      message?: string;
    };

    return {
      verified: Boolean(data.verified),
      licenseReference: data.licenseReference,
      message:
        data.message ??
        (data.verified
          ? "Payment verified by server."
          : "Payment has not been confirmed."),
    };
  } catch {
    return {
      verified: false,
      message: "Unable to reach verification service.",
    };
  }
}
