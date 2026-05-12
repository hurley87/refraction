export {
  SPEND_RAIL_ANALYTICS_CODES,
  spendRailErrorDuplicateRequest,
  spendRailErrorFundingFailed,
  spendRailErrorInvalidReceivingWallet,
  spendRailErrorNetworkUnavailable,
  spendRailErrorPaymentFailed,
  spendRailErrorRailOperationNotSupported,
  spendRailErrorTreasuryInsufficientFunds,
  spendRailErrorWalletReadinessFailed,
  spendRailErrorWalletUnavailable,
  isSpendRailError,
  type SpendRailAnalyticsCode,
  type SpendRailError,
  type SpendRailErrorCategory,
} from '@/lib/spend/payment-rails/errors';

export { getSpendPaymentRail } from '@/lib/spend/payment-rails/registry';

export {
  errSpendRail,
  okSpendRail,
  spendPaymentRailExplorerUrl,
  type SpendPaymentRail,
  type SpendRailResult,
} from '@/lib/spend/payment-rails/spend-payment-rail';

export {
  isTerminalSpendRailFundingStatus,
  isTerminalSpendRailPaymentStatus,
  type SpendPaymentRailReconcileContext,
  type SpendPaymentRailSessionContext,
  type SpendRailFundingOperationStatus,
  type SpendRailPaymentOperationStatus,
  type SpendWalletReadinessStatus,
} from '@/lib/spend/payment-rails/types';
