export const DEFAULT_PAYSTACK_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_89f8b1554a54065b1017190634b2755f9883993e";

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        metadata?: Record<string, unknown>;
        channels?: string[];
        callback: (response: {
          reference: string;
          trxref: string;
          status: string;
          message: string;
          trans?: string;
          transaction?: string;
        }) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
    };
  }
}

let scriptLoadingPromise: Promise<boolean> | null = null;

export function loadPaystackScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  if (window.PaystackPop) {
    return Promise.resolve(true);
  }

  if (scriptLoadingPromise) {
    return scriptLoadingPromise;
  }

  scriptLoadingPromise = new Promise<boolean>((resolve) => {
    // Check if script tag already exists in DOM
    const existing = document.querySelector('script[src*="paystack.co"]');
    if (existing) {
      if (window.PaystackPop) {
        resolve(true);
        return;
      }
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Paystack inline script");
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
}

export type PaystackPaymentChannel =
  | "card"
  | "mobile_money"
  | "bank"
  | "bank_transfer"
  | "ussd"
  | "qr";

export interface PaystackCheckoutOptions {
  key?: string;
  email: string;
  amount: number; // in GHS (e.g. 15 for GHS 15.00)
  currency?: string; // defaults to 'GHS'
  reference?: string;
  channels?: PaystackPaymentChannel[];
  metadata?: {
    custom_fields?: Array<{
      display_name: string;
      variable_name: string;
      value: string | number;
    }>;
    [key: string]: unknown;
  };
  onSuccess: (response: {
    reference: string;
    trxref: string;
    status: string;
    message: string;
  }) => void;
  onCancel?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Trigger Paystack Inline Checkout popup.
 */
export async function openPaystackCheckout(options: PaystackCheckoutOptions): Promise<void> {
  const loaded = await loadPaystackScript();
  if (!loaded || !window.PaystackPop) {
    const error = new Error("Unable to initialize Paystack gateway. Please check your connection.");
    if (options.onError) {
      options.onError(error);
    } else {
      throw error;
    }
    return;
  }

  const publicKey = options.key || DEFAULT_PAYSTACK_KEY;
  if (!publicKey) {
    const error = new Error("Paystack public key is not configured.");
    if (options.onError) {
      options.onError(error);
    } else {
      throw error;
    }
    return;
  }

  // Paystack expects amount in the lowest currency unit (pesewas for GHS: GHS 1 = 100 pesewas)
  const amountInPesewas = Math.round(options.amount * 100);
  const ref = options.reference || `DF-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  const handler = window.PaystackPop.setup({
    key: publicKey,
    email: options.email,
    amount: amountInPesewas,
    currency: options.currency || "GHS",
    ref,
    metadata: options.metadata,
    channels: options.channels && options.channels.length > 0 ? options.channels : undefined,
    callback: (response) => {
      options.onSuccess({
        reference: response.reference || ref,
        trxref: response.trxref || ref,
        status: response.status || "success",
        message: response.message || "Payment complete",
      });
    },
    onClose: () => {
      if (options.onCancel) {
        options.onCancel();
      }
    },
  });

  handler.openIframe();
}
