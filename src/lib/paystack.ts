export const DEFAULT_PAYSTACK_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || "pk_test_89f8b1554a54065b1017190634b2755f9883993e";

interface PaystackPopV1 {
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
}

interface PaystackPopV2Constructor {
  new (): {
    newTransaction: (options: {
      key: string;
      email: string;
      amount: number;
      currency?: string;
      reference?: string;
      metadata?: Record<string, unknown>;
      channels?: string[];
      onSuccess: (response: {
        reference: string;
        trxref?: string;
        status?: string;
        message?: string;
      }) => void;
      onCancel: () => void;
      onError?: (error: Error) => void;
    }) => void;
  };
}

type PaystackPopGlobal = (PaystackPopV1 & PaystackPopV2Constructor) | PaystackPopV1 | PaystackPopV2Constructor;

declare global {
  interface Window {
    PaystackPop?: PaystackPopGlobal;
  }
}

function isPaystackAvailable(): boolean {
  if (typeof window === "undefined") return false;
  const p = (window as unknown as { PaystackPop?: unknown }).PaystackPop;
  if (!p) return false;
  if (typeof p === "function") return true;
  if (typeof (p as { setup?: unknown }).setup === "function") return true;
  return false;
}

/**
 * Loads Paystack Inline SDK dynamically with foolproof fallback and polling.
 */
export function loadPaystackScript(): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }

  // 1. If already available globally, return immediately
  if (isPaystackAvailable()) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    // 2. Poll for 2 seconds in case script is in DOM and evaluating
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (isPaystackAvailable()) {
        clearInterval(interval);
        resolve(true);
      } else if (attempts > 40) {
        clearInterval(interval);
        // If still not found, try injecting explicitly
        injectScript(resolve);
      }
    }, 50);

    function injectScript(done: (ok: boolean) => void) {
      const existing = document.getElementById("paystack-inline-script");
      if (existing) {
        existing.remove();
      }

      const script = document.createElement("script");
      script.id = "paystack-inline-script";
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;

      const timeout = setTimeout(() => {
        done(isPaystackAvailable());
      }, 5000);

      script.onload = () => {
        clearTimeout(timeout);
        done(isPaystackAvailable());
      };

      script.onerror = () => {
        clearTimeout(timeout);
        console.error("Failed to load Paystack inline JS SDK");
        done(false);
      };

      document.head.appendChild(script);
    }
  });
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
  amount: number; // In GHS (e.g. 25 for GHS 25.00)
  currency?: string; // default "GHS"
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
 * Triggers Paystack Inline Modal popup safely.
 */
export async function openPaystackCheckout(options: PaystackCheckoutOptions): Promise<void> {
  const loaded = await loadPaystackScript();

  if (!loaded || !isPaystackAvailable()) {
    const error = new Error(
      "Unable to connect to Paystack payment gateway. Please check your internet connection and try again.",
    );
    if (options.onError) {
      options.onError(error);
      return;
    }
    throw error;
  }

  const publicKey = options.key || DEFAULT_PAYSTACK_KEY;
  if (!publicKey) {
    const error = new Error("Paystack Public Key is missing. Please configure it in settings.");
    if (options.onError) {
      options.onError(error);
      return;
    }
    throw error;
  }

  // Paystack expects amount in lowest currency unit (pesewas: GHS 1 = 100 pesewas)
  const amountInPesewas = Math.round(options.amount * 100);
  const ref =
    options.reference ||
    `DF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const paystackGlobal = (window as unknown as { PaystackPop?: Record<string, unknown> }).PaystackPop;

  try {
    // Mode A: PaystackPop.setup() (v1 inline.js)
    if (paystackGlobal && typeof (paystackGlobal as { setup?: unknown }).setup === "function") {
      const v1Setup = paystackGlobal as unknown as PaystackPopV1;
      const handler = v1Setup.setup({
        key: publicKey,
        email: options.email,
        amount: amountInPesewas,
        currency: options.currency || "GHS",
        ref,
        metadata: options.metadata,
        channels:
          options.channels && options.channels.length > 0 ? options.channels : undefined,
        callback: (response) => {
          options.onSuccess({
            reference: response.reference || ref,
            trxref: response.trxref || ref,
            status: response.status || "success",
            message: response.message || "Payment successful",
          });
        },
        onClose: () => {
          if (options.onCancel) {
            options.onCancel();
          }
        },
      });

      handler.openIframe();
      return;
    }

    // Mode B: new PaystackPop() (v2 SDK constructor)
    if (typeof paystackGlobal === "function") {
      const PaystackConstructor = paystackGlobal as unknown as PaystackPopV2Constructor;
      const paystackInstance = new PaystackConstructor();
      paystackInstance.newTransaction({
        key: publicKey,
        email: options.email,
        amount: amountInPesewas,
        currency: options.currency || "GHS",
        reference: ref,
        metadata: options.metadata,
        channels:
          options.channels && options.channels.length > 0 ? options.channels : undefined,
        onSuccess: (res) => {
          options.onSuccess({
            reference: res.reference || ref,
            trxref: res.trxref || ref,
            status: res.status || "success",
            message: res.message || "Payment successful",
          });
        },
        onCancel: () => {
          if (options.onCancel) {
            options.onCancel();
          }
        },
        onError: (err: Error) => {
          if (options.onError) {
            options.onError(err);
          }
        },
      });
      return;
    }

    throw new Error("Paystack SDK is not compatible with this browser.");
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error opening Paystack modal:", error);
    if (options.onError) {
      options.onError(error);
    } else {
      throw error;
    }
  }
}
