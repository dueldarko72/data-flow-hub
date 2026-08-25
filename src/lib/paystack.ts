export const DEFAULT_PAYSTACK_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_89f8b1554a54065b1017190634b2755f9883993e";

export type PaystackPaymentChannel = "card" | "mobile_money" | "bank" | "ussd" | "qr";

export interface PaystackCheckoutOptions {
  key?: string;
  email: string;
  amount: number; // In GHS (e.g. 25 for GHS 25.00)
  currency?: string; // default "GHS"
  reference?: string;
  channels?: PaystackPaymentChannel[];
  callbackUrl?: string;
  metadata?: {
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string | number;
    }>;
    [key: string]: unknown;
  };
  onSuccess?: (response: {
    reference: string;
    trxref: string;
    status: string;
    message: string;
  }) => void;
  onCancel?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Initialize a Paystack transaction directly via Paystack's client API.
 * Returns the access_code and checkoutUrl (https://checkout.paystack.com/{access_code})
 */
export async function initializePaystackTransaction(options: PaystackCheckoutOptions): Promise<{
  accessCode: string;
  reference: string;
  checkoutUrl: string;
}> {
  const publicKey = options.key || DEFAULT_PAYSTACK_KEY;
  if (!publicKey) {
    throw new Error("Paystack Public Key is missing. Please configure it in settings.");
  }

  const amountInPesewas = Math.round(options.amount * 100);
  const ref =
    options.reference ||
    `DF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const currentOrigin = typeof window !== "undefined" ? window.location.origin : "";
  // Just point to /orders — Paystack appends ?trxref=REF&reference=REF automatically
  const callbackUrl = options.callbackUrl || `${currentOrigin}/orders`;

  const payload: Record<string, unknown> = {
    key: publicKey,
    email: options.email,
    amount: amountInPesewas,
    currency: options.currency || "GHS",
    ref,
    callback_url: callbackUrl,
    channels:
      options.channels && options.channels.length > 0 ? options.channels : undefined,
  };

  if (options.metadata) {
    payload.metadata = JSON.stringify(options.metadata);
  }

  const response = await fetch("https://api.paystack.co/checkout/request_inline", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!data.status || !data.data?.access_code) {
    throw new Error(data.message || "Failed to initialize transaction with Paystack.");
  }

  const accessCode = data.data.access_code;
  const checkoutUrl = `https://checkout.paystack.com/${accessCode}`;

  return {
    accessCode,
    reference: ref,
    checkoutUrl,
  };
}

/**
 * Open Paystack Checkout:
 * Redirects securely to Paystack's official checkout page (https://checkout.paystack.com/{access_code}).
 * This avoids all browser iframe/third-party cookie blocking issues and works seamlessly on all mobile & desktop browsers.
 */
export async function openPaystackCheckout(options: PaystackCheckoutOptions): Promise<{
  accessCode: string;
  reference: string;
  checkoutUrl: string;
}> {
  try {
    const initResult = await initializePaystackTransaction(options);

    // Persist ref in sessionStorage so /orders can recover it even if
    // the Paystack dashboard callback URL hasn't been updated yet.
    if (typeof window !== "undefined") {
      sessionStorage.setItem("ps-pending-ref", initResult.reference);
      sessionStorage.setItem("ps-pending-ts", Date.now().toString());
      // Redirect customer to Paystack's verified checkout page
      window.location.href = initResult.checkoutUrl;
    }

    return initResult;
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Paystack initialization error:", error);
    if (options.onError) {
      options.onError(error);
    }
    throw error;
  }
}
