/**
 * Stellar / Soroban contract addresses per network.
 * These are public and safe to commit. Update this file when you deploy new contracts;
 * no need to change Vercel (or other) env vars.
 * Env vars with the same names still override these values when set.
 */

export const STELLAR_CONTRACT_ADDRESSES = {
  nft: {
    testnet: 'CCXC3FLYXHAA264ZIU2IAS447H57CHOZQS3ULCVKHKGA57JZ2BDEVCYR',
    mainnet: 'CC3TXXYTH4LOA42ZD5F22DO2EVSYJXEFVS65MYQJPVTLNWCOLSLEZMSW',
  },
  simplePayment: {
    testnet: 'CAA7E7JCAAS4KANELJB5INPNSHPAOQDYGHRPW5I64C3RNK7VTSVJWXG4',
    mainnet: 'CD4NL2R7HPIF7YEG3NDBV35EPZFTSAU5INHYJ2N6CFKYZAY4YIHFXQ5B',
  },
  fungibleToken: {
    testnet: 'CCJWAHFMLATBTYIY5GROUK2OQEGGVBNYGRYJCH2EIQ5VMEHWMIYSLPWD',
    mainnet: 'CBBTE46FEJ7OCKNZG4SNUSTMGYXRFST3SCTMAADWR3GSZVENDVBF2UR6',
  },
} as const;
