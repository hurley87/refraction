/**
 * Stellar / Soroban contract addresses per network.
 * These are public and safe to commit. Update this file when you deploy new contracts;
 * no need to change Vercel (or other) env vars.
 * Env vars with the same names still override these values when set.
 */

export const STELLAR_CONTRACT_ADDRESSES = {
  nft: {
    testnet: 'CCXC3FLYXHAA264ZIU2IAS447H57CHOZQS3ULCVKHKGA57JZ2BDEVCYR',
    mainnet: 'CBCTZAZJBG5TZEC2WHHAD4J4JKPQCUNTMULVYMUYLDQMAXUAIQPOOMKI',
  },
  simplePayment: {
    testnet: 'CAA7E7JCAAS4KANELJB5INPNSHPAOQDYGHRPW5I64C3RNK7VTSVJWXG4',
    mainnet: 'CCZVXRSVOOVWCS2GT24KPRZIWLC4TWUIIYTWJQYHFZGTXYQWR4JIFLVJ',
  },
  fungibleToken: {
    testnet: 'CBQC3XVF3YHDGTX7UK62HX4KPNUJBNELDVDGE5IFAL6OP6EMGBFCTJA2',
    mainnet: 'CBQC3XVF3YHDGTX7UK62HX4KPNUJBNELDVDGE5IFAL6OP6EMGBFCTJA2',
  },
} as const;
