import type { PaymentOptionsResponse } from "@walletconnect/pay";

function stringifyWithFallback(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function buildWalletConnectPayErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    return stringifyWithFallback({
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    });
  }

  return stringifyWithFallback(error);
}

export function buildNoPaymentOptionsDetail(params: {
  projectId: string;
  walletAddress: string;
  paymentLink: string;
  response: PaymentOptionsResponse;
}): string {
  return [
    "No payment options for your wallet.",
    `projectId=${JSON.stringify(params.projectId)}`,
    `wallet=${params.walletAddress}`,
    `paymentLink=${params.paymentLink}`,
    `response=${stringifyWithFallback(params.response)}`,
  ].join(" ");
}
