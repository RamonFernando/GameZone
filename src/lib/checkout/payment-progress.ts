export type PaymentProgressStep =
  | "checking"
  | "paymentConfirmed"
  | "orderSaved"
  | "cartCleared"
  | "complete";

export const PAYMENT_PROGRESS_STEP_DELAY_MS = 5000;
export const PAYMENT_PROGRESS_STORAGE_PREFIX = "gamezone-payment-progress";

export function createPaymentProgressStorageKey(orderId: string) {
  return `${PAYMENT_PROGRESS_STORAGE_PREFIX}:${orderId}`;
}

export function getPaymentProgressStepFromStartedAt(
  startedAt: number,
  now = Date.now()
): PaymentProgressStep {
  const elapsed = Math.max(0, now - startedAt);

  if (elapsed < PAYMENT_PROGRESS_STEP_DELAY_MS) return "paymentConfirmed";
  if (elapsed < PAYMENT_PROGRESS_STEP_DELAY_MS * 2) return "orderSaved";
  if (elapsed < PAYMENT_PROGRESS_STEP_DELAY_MS * 3) return "cartCleared";
  return "complete";
}
