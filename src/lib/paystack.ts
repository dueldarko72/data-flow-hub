// @ts-expect-error - @paystack/inline-js does not ship TypeScript types by default
import PaystackPop from "@paystack/inline-js";

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
 * Triggers Paystack Inline Modal popup safely using the official SDK.
 */
export async function openPaystackCheckout(options: PaystackCheckoutOptions): Promise<void> {
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

  try {
    const paystack = new PaystackPop();

    paystack.newTransaction({
      key: publicKey,
      email: options.email,
      amount: amountInPesewas,
      currency: options.currency || "GHS",
      reference: ref,
      channels:
        options.channels && options.channels.length > 0 ? options.channels : undefined,
      metadata: options.metadata,
      onSuccess: (transaction: {
        reference?: string;
        trxref?: string;
        status?: string;
        message?: string;
      }) => {
        options.onSuccess({
          reference: transaction.reference || ref,
          trxref: transaction.trxref || ref,
          status: transaction.status || "success",
          message: transaction.message || "Payment successful",
        });
      },
      onCancel: () => {
        if (options.onCancel) {
          options.onCancel();
        }
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Error opening Paystack checkout modal:", error);
    if (options.onError) {
      options.onError(error);
    } else {
      throw error;
    }
  }
}
