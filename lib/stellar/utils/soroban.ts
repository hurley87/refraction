import {
  Contract,
  Networks,
  rpc as SorobanRpc,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  StrKey,
  TransactionBuilder,
  Horizon,
} from '@stellar/stellar-sdk';
import {
  networkPassphrase,
  rpcUrl,
  horizonUrl,
  getHorizonUrlForNetwork,
  getRpcUrlForNetwork,
} from './network';
import { wallet } from './wallet';
import { WalletNetwork } from '@creit.tech/stellar-wallets-kit';
import storage from './storage';

/**
 * Get Soroban RPC server instance for the current network
 * Uses a proxy API route to avoid CORS issues in the browser
 * @param customNetworkPassphrase - Optional network passphrase to determine which network to use
 */
export const getSorobanRpc = (
  customNetworkPassphrase?: string
): SorobanRpc.Server => {
  // In the browser, use the proxy API route to avoid CORS issues
  // On the server, use the direct RPC URL
  const isBrowser = typeof window !== 'undefined';
  const passphrase = customNetworkPassphrase || networkPassphrase;

  // Determine network from passphrase
  const isMainnet =
    passphrase.includes('Public') ||
    passphrase.includes('Public Global Stellar Network');
  const networkName = isMainnet
    ? 'mainnet'
    : passphrase.includes('Future')
      ? 'futurenet'
      : 'testnet';

  let effectiveRpcUrl: string;

  if (isBrowser) {
    // Use full URL for the proxy API route in browser with network parameter
    const origin = window.location.origin;
    effectiveRpcUrl = `${origin}/api/soroban-rpc?network=${networkName}`;
  } else {
    // On server: use RPC URL for the same network as the passphrase so simulation
    // hits the correct ledger (e.g. testnet when user wallet is on testnet)
    effectiveRpcUrl =
      customNetworkPassphrase !== undefined
        ? getRpcUrlForNetwork(networkName)
        : rpcUrl;
  }

  // Log network configuration for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('[Soroban] Network configuration:', {
      network: isMainnet ? 'MAINNET' : 'TESTNET',
      networkName,
      rpcUrl: effectiveRpcUrl,
      originalRpcUrl: rpcUrl,
      isBrowser,
      networkPassphrase: passphrase.substring(0, 30) + '...',
    });
  }

  return new SorobanRpc.Server(effectiveRpcUrl, {
    allowHttp:
      effectiveRpcUrl.startsWith('http://') ||
      effectiveRpcUrl.includes('localhost'),
  });
};

/**
 * Validate a Stellar address format
 */
export const isValidAddress = (address: string): boolean => {
  try {
    StrKey.decodeEd25519PublicKey(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validate a contract address format
 * Soroban contract addresses must be in StrKey format starting with 'C'
 */
export const isValidContractAddress = (address: string): boolean => {
  if (!address || typeof address !== 'string') {
    return false;
  }

  const trimmed = address.trim();
  if (!trimmed) {
    return false;
  }

  try {
    // Soroban contract addresses must start with 'C' and be valid StrKey format
    // Contract addresses are typically 56 characters long and start with 'C'
    if (trimmed.startsWith('C') && trimmed.length === 56) {
      // Try to decode as a contract address (StrKey format)
      // Contract addresses use StrKey encoding similar to account addresses
      try {
        // Try to decode using StrKey - contract addresses use the same encoding
        StrKey.decodeEd25519PublicKey(trimmed);
        return true;
      } catch {
        // If decoding fails, check if it matches the StrKey pattern
        // Contract addresses are base32-encoded (A-Z, 2-7)
        const strkeyPattern = /^C[A-Z2-7]{55}$/;
        return strkeyPattern.test(trimmed);
      }
    }
    // Also accept regular Stellar addresses (starting with 'G') as they might be used
    if (isValidAddress(trimmed)) {
      return true;
    }
    // Contract IDs in hex format (64 hex characters) are also valid
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Convert a contract address string to an Address object
 */
export const addressToScVal = (address: string): xdr.ScVal => {
  try {
    const addr = new Address(address);
    return addr.toScVal();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid address format: ${address}. ${errorMessage}`);
  }
};

/**
 * Build a contract instance for interaction
 */
export const getContract = (contractId: string): Contract => {
  const trimmed = contractId.trim();
  if (!trimmed) {
    throw new Error('Contract address cannot be empty');
  }

  if (!isValidContractAddress(trimmed)) {
    throw new Error(
      `Invalid contract address format: "${trimmed}". ` +
        `Contract addresses must start with 'C' and be 56 characters long, ` +
        `or be a valid Stellar address starting with 'G', ` +
        `or be a 64-character hex string.`
    );
  }

  try {
    return new Contract(trimmed);
  } catch (error) {
    throw new Error(
      `Failed to create contract instance: ${error instanceof Error ? error.message : String(error)}. ` +
        `Please ensure the contract address is valid and in the correct format.`
    );
  }
};

/**
 * Invoke a Soroban contract function
 * @param contractId - The contract address or ID
 * @param functionName - Name of the function to invoke
 * @param args - Array of arguments to pass to the function (will be converted to ScVal)
 * @param signerAddress - Address of the account signing the transaction
 * @param customNetworkPassphrase - Network passphrase for transaction building
 */
export const invokeContract = async (
  contractId: string,
  functionName: string,
  args: any[],
  signerAddress: string,
  customNetworkPassphrase?: string
): Promise<string> => {
  // Use customNetworkPassphrase if provided, otherwise fall back to module-level networkPassphrase
  // IMPORTANT: For WalletConnect, customNetworkPassphrase should always be provided from the wallet's detected network
  const passphrase = customNetworkPassphrase || networkPassphrase;

  console.log('[Soroban] invokeContract called with:', {
    contractId,
    functionName,
    signerAddress,
    hasCustomPassphrase: !!customNetworkPassphrase,
    passphrase: passphrase?.substring(0, 30) + '...',
    network: passphrase?.includes('Test')
      ? 'TESTNET'
      : passphrase?.includes('Public')
        ? 'MAINNET'
        : 'UNKNOWN',
  });
  const rpc = getSorobanRpc(passphrase);
  const contract = getContract(contractId);

  // Determine the correct Horizon URL based on network passphrase
  const networkName = passphrase.includes('Test')
    ? 'TESTNET'
    : passphrase.includes('Public')
      ? 'MAINNET'
      : passphrase.includes('Future')
        ? 'FUTURENET'
        : 'TESTNET';
  const effectiveHorizonUrl = getHorizonUrlForNetwork(networkName);

  // Get the current account to build the transaction
  // Use Horizon for account lookups as it's more reliable across networks
  let account;
  try {
    const horizonServer = new Horizon.Server(effectiveHorizonUrl);
    account = await horizonServer.loadAccount(signerAddress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('404')
    ) {
      // Verify the account on the correct network
      throw new Error(
        `Account not found on ${networkName}: ${signerAddress}. ` +
          `The account must be funded before it can invoke contracts. ` +
          `On testnet/futurenet, you can fund it using Friendbot: ` +
          `curl "https://friendbot.stellar.org/?addr=${signerAddress}" ` +
          `(or use the "Fund Account" button if available). ` +
          `Current network: ${networkName}, Horizon: ${effectiveHorizonUrl}, RPC: ${rpcUrl}`
      );
    }
    throw error;
  }

  // Build the transaction
  const contractCall = contract.call(
    functionName,
    ...args.map((arg) => {
      // Convert arguments to ScVal based on type
      if (typeof arg === 'string') {
        // Check if it's an address
        if (isValidAddress(arg)) {
          return addressToScVal(arg);
        }
        // Otherwise treat as string
        return nativeToScVal(arg, { type: 'string' });
      } else if (typeof arg === 'number') {
        return nativeToScVal(arg, { type: 'i128' });
      } else if (typeof arg === 'bigint') {
        return nativeToScVal(arg, { type: 'i128' });
      }
      // For other types, try to convert directly
      return nativeToScVal(arg);
    })
  );

  // Use higher fees for mainnet Soroban transactions
  // Mainnet typically requires 100,000+ stroops (0.01+ XLM) for Soroban contract invocations
  // Testnet can use lower fees (100 stroops = 0.00001 XLM)
  const isMainnet =
    passphrase.includes('Public') ||
    passphrase.includes('Public Global Stellar Network');
  const baseFee = isMainnet ? '100000' : '100'; // 0.01 XLM for mainnet, 0.00001 XLM for testnet

  // Build initial transaction for simulation
  let transaction = new TransactionBuilder(account, {
    fee: baseFee,
    networkPassphrase: passphrase || Networks.TESTNET,
  })
    .addOperation(contractCall)
    .setTimeout(30)
    .build();

  // Simulate the transaction first
  const simulation = await rpc.simulateTransaction(transaction);

  if (SorobanRpc.Api.isSimulationError(simulation)) {
    const errorDetails = simulation.error
      ? JSON.stringify(simulation.error, null, 2)
      : 'Unknown simulation error';
    throw new Error(
      `Simulation error for function "${functionName}": ${errorDetails}. ` +
        `This might indicate the function doesn't exist, has wrong arguments, or the contract isn't deployed.`
    );
  }

  if (!simulation.result) {
    throw new Error(
      `Simulation returned no result for function "${functionName}". ` +
        `The contract might not exist or the function signature might be incorrect.`
    );
  }

  // Retry logic for txBadSeq errors - fetch fresh account and rebuild transaction
  const MAX_RETRIES = 3;
  let preparedTransaction;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Fetch fresh account right before preparing to ensure correct sequence number
      // This prevents txBadSeq errors that can occur if the account sequence changed
      // Use RPC for more up-to-date sequence numbers
      try {
        account = await rpc.getAccount(signerAddress);
      } catch (rpcError) {
        // Fallback to Horizon if RPC fails
        try {
          const horizonServer = new Horizon.Server(effectiveHorizonUrl);
          account = await horizonServer.loadAccount(signerAddress);
        } catch (horizonError) {
          // If both fail, proceed with existing account - prepareTransaction will handle it
          console.warn(
            '[Soroban] Failed to refresh account before prepareTransaction:',
            {
              rpcError:
                rpcError instanceof Error ? rpcError.message : String(rpcError),
              horizonError:
                horizonError instanceof Error
                  ? horizonError.message
                  : String(horizonError),
            }
          );
        }
      }

      // Rebuild transaction with fresh account to ensure correct sequence number
      transaction = new TransactionBuilder(account, {
        fee: baseFee,
        networkPassphrase: passphrase || Networks.TESTNET,
      })
        .addOperation(contractCall)
        .setTimeout(30)
        .build();

      // Prepare the transaction (this will update sequence numbers and fees if needed)
      preparedTransaction = await rpc.prepareTransaction(transaction);

      // If we get here, preparation succeeded
      break;
    } catch (prepareError) {
      const errorMessage =
        prepareError instanceof Error
          ? prepareError.message
          : String(prepareError);
      lastError =
        prepareError instanceof Error
          ? prepareError
          : new Error(String(prepareError));

      // Check if it's a sequence number error
      if (
        errorMessage.includes('txBadSeq') ||
        errorMessage.includes('bad sequence') ||
        errorMessage.includes('sequence')
      ) {
        if (attempt < MAX_RETRIES - 1) {
          // Wait a bit before retrying (exponential backoff)
          const delayMs = Math.min(100 * Math.pow(2, attempt), 500);
          console.warn(
            `[Soroban] Sequence number error on attempt ${attempt + 1}/${MAX_RETRIES}, retrying in ${delayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }
      // If it's not a sequence error or we've exhausted retries, throw
      throw lastError;
    }
  }

  if (!preparedTransaction) {
    throw lastError || new Error('Failed to prepare transaction after retries');
  }

  // Sign the transaction using the wallet kit
  // The wallet kit's signTransaction expects the XDR string and options
  // For WalletConnect, we need to use WalletNetwork enum instead of passphrase string
  const walletId = storage.getItem('walletId');
  const isWalletConnect = walletId === 'wallet_connect';

  // IMPORTANT: Ensure the wallet is set before signing, especially for WalletConnect
  // This is critical for WalletConnect to properly route the signing request to the mobile wallet
  if (walletId) {
    wallet.setWallet(walletId);
    console.log('[Soroban] Set wallet before signing:', walletId);
  }

  // Convert passphrase to WalletNetwork enum for WalletConnect compatibility
  // WalletConnect expects WalletNetwork enum, not the passphrase string
  let networkPassphraseForSigning: string | WalletNetwork;
  if (isWalletConnect) {
    // Convert passphrase to WalletNetwork enum for WalletConnect
    if (passphrase?.includes('Test')) {
      networkPassphraseForSigning = WalletNetwork.TESTNET;
    } else if (passphrase?.includes('Public')) {
      networkPassphraseForSigning = WalletNetwork.PUBLIC;
    } else if (passphrase?.includes('Future')) {
      networkPassphraseForSigning = WalletNetwork.FUTURENET;
    } else {
      networkPassphraseForSigning = WalletNetwork.TESTNET;
    }
  } else {
    // For other wallets, use the passphrase string directly
    networkPassphraseForSigning = passphrase || Networks.TESTNET;
  }

  console.log('[Soroban] Signing transaction with network passphrase:', {
    passphrase: passphrase || Networks.TESTNET,
    networkPassphraseForSigning,
    signerAddress,
    walletId,
    isWalletConnect,
    networkName: passphrase?.includes('Test')
      ? 'TESTNET'
      : passphrase?.includes('Public')
        ? 'MAINNET'
        : 'TESTNET',
    xdrLength: preparedTransaction.toXDR().length,
  });

  const signOptions = {
    networkPassphrase: networkPassphraseForSigning,
    address: signerAddress,
  };

  console.log(
    '[Soroban] Calling wallet.signTransaction, waiting for mobile wallet prompt...'
  );
  let signedTransactionResult;
  try {
    signedTransactionResult = await wallet.signTransaction(
      preparedTransaction.toXDR(),
      signOptions
    );
    console.log('[Soroban] signTransaction returned:', {
      resultType: typeof signedTransactionResult,
      hasSignedTxXdr:
        signedTransactionResult &&
        typeof signedTransactionResult === 'object' &&
        'signedTxXdr' in signedTransactionResult,
    });
  } catch (signError) {
    const errorMessage =
      signError instanceof Error ? signError.message : String(signError);
    console.error('[Soroban] signTransaction error:', {
      error: errorMessage,
      walletId,
      isWalletConnect,
      signOptions,
      xdrLength: preparedTransaction.toXDR().length,
    });
    throw signError;
  }

  // Handle the signed transaction result
  // The wallet kit may return different formats depending on the wallet
  let signedTxXdrString: string;

  if (typeof signedTransactionResult === 'string') {
    // Direct string (XDR)
    signedTxXdrString = signedTransactionResult;
  } else if (
    signedTransactionResult &&
    typeof signedTransactionResult === 'object'
  ) {
    // Check if it has an XDR property - try common property names
    if (
      'signedTxXdr' in signedTransactionResult &&
      typeof signedTransactionResult.signedTxXdr === 'string'
    ) {
      signedTxXdrString = signedTransactionResult.signedTxXdr;
    } else if (
      'xdr' in signedTransactionResult &&
      typeof signedTransactionResult.xdr === 'string'
    ) {
      signedTxXdrString = signedTransactionResult.xdr;
    } else if (
      'signedXdr' in signedTransactionResult &&
      typeof signedTransactionResult.signedXdr === 'string'
    ) {
      signedTxXdrString = signedTransactionResult.signedXdr;
    } else if (
      'toXDR' in signedTransactionResult &&
      typeof signedTransactionResult.toXDR === 'function'
    ) {
      // It's already a Transaction object
      signedTxXdrString = signedTransactionResult.toXDR();
    } else {
      // Try to stringify and see what we get
      console.error(
        '[Soroban] Unexpected signTransaction result format:',
        signedTransactionResult
      );
      const keys = Object.keys(signedTransactionResult);
      throw new Error(
        `Wallet returned unexpected format from signTransaction. ` +
          `Expected string or object with 'signedTxXdr'/'xdr'/'signedXdr' property. ` +
          `Got object with keys: ${keys.join(', ')}. ` +
          `Full object: ${JSON.stringify(signedTransactionResult)}`
      );
    }
  } else {
    throw new Error(
      `Wallet signTransaction returned unexpected type: ${typeof signedTransactionResult}. ` +
        `Expected string or object.`
    );
  }

  console.log(
    '[Soroban] Signed transaction XDR length:',
    signedTxXdrString.length
  );
  console.log(
    '[Soroban] Signed transaction XDR (first 100 chars):',
    signedTxXdrString.substring(0, 100)
  );

  // Parse the signed transaction XDR
  // The wallet returns XDR that was signed, we need to parse it back to a Transaction object
  // Use the same network passphrase that was used to build the original transaction
  let signedTx;
  try {
    // Parse using TransactionBuilder.fromXDR with the correct network passphrase
    signedTx = TransactionBuilder.fromXDR(
      signedTxXdrString,
      passphrase || Networks.TESTNET
    );
    console.log('[Soroban] Successfully parsed signed transaction XDR');
  } catch (parseError) {
    // If parsing fails, it might be a network passphrase mismatch
    const errorMessage =
      parseError instanceof Error ? parseError.message : String(parseError);
    console.error(
      '[Soroban] Failed to parse signed transaction XDR:',
      errorMessage
    );
    console.error('[Soroban] XDR length:', signedTxXdrString.length);
    console.error(
      '[Soroban] XDR (first 200 chars):',
      signedTxXdrString.substring(0, 200)
    );
    console.error(
      '[Soroban] Network passphrase used:',
      passphrase || Networks.TESTNET
    );

    // Try with the default testnet passphrase if we used a custom one
    if (passphrase && passphrase !== Networks.TESTNET) {
      console.log('[Soroban] Retrying with default TESTNET passphrase...');
      try {
        signedTx = TransactionBuilder.fromXDR(
          signedTxXdrString,
          Networks.TESTNET
        );
        console.log(
          '[Soroban] Successfully parsed with default TESTNET passphrase'
        );
      } catch {
        throw new Error(
          `Failed to parse signed transaction XDR: ${errorMessage}. ` +
            `Tried passphrases: "${passphrase}" and "${Networks.TESTNET}". ` +
            `This might indicate the wallet signed with a different network passphrase than expected.`
        );
      }
    } else {
      throw new Error(
        `Failed to parse signed transaction XDR: ${errorMessage}. ` +
          `Network passphrase: ${passphrase || Networks.TESTNET}. ` +
          `This might indicate a network passphrase mismatch between the transaction and the wallet.`
      );
    }
  }

  // Send the transaction with retry logic for txBadSeq errors
  let sendResponse;
  const SEND_MAX_RETRIES = 3;
  let sendLastError: Error | null = null;

  for (let sendAttempt = 0; sendAttempt < SEND_MAX_RETRIES; sendAttempt++) {
    try {
      sendResponse = await rpc.sendTransaction(signedTx);

      if (sendResponse.status === 'ERROR') {
        let errorMessage = 'Unknown error';
        if (sendResponse.errorResult) {
          if (typeof sendResponse.errorResult === 'string') {
            errorMessage = sendResponse.errorResult;
          } else if (sendResponse.errorResult instanceof Error) {
            errorMessage = sendResponse.errorResult.message;
          } else {
            try {
              errorMessage = JSON.stringify(sendResponse.errorResult, null, 2);
            } catch {
              errorMessage = String(sendResponse.errorResult);
            }
          }
        }

        // Check if it's a sequence number error
        const isSeqError =
          errorMessage.includes('txBadSeq') ||
          errorMessage.includes('bad sequence') ||
          errorMessage.includes('sequence') ||
          (typeof sendResponse.errorResult === 'object' &&
            sendResponse.errorResult !== null &&
            JSON.stringify(sendResponse.errorResult).includes('txBadSeq'));

        if (isSeqError && sendAttempt < SEND_MAX_RETRIES - 1) {
          // Fetch fresh account and rebuild transaction
          console.warn(
            `[Soroban] Sequence number error on send attempt ${sendAttempt + 1}/${SEND_MAX_RETRIES}, refreshing account and retrying...`
          );

          // Wait a bit before retrying (exponential backoff)
          const delayMs = Math.min(200 * Math.pow(2, sendAttempt), 1000);
          await new Promise((resolve) => setTimeout(resolve, delayMs));

          // Fetch fresh account
          try {
            account = await rpc.getAccount(signerAddress);
          } catch {
            // Fallback to Horizon if RPC fails
            try {
              const horizonServer = new Horizon.Server(effectiveHorizonUrl);
              account = await horizonServer.loadAccount(signerAddress);
            } catch (horizonError) {
              throw new Error(
                `Failed to refresh account for retry: ${horizonError instanceof Error ? horizonError.message : String(horizonError)}`
              );
            }
          }

          // Rebuild transaction with fresh account
          transaction = new TransactionBuilder(account, {
            fee: baseFee,
            networkPassphrase: passphrase || Networks.TESTNET,
          })
            .addOperation(contractCall)
            .setTimeout(30)
            .build();

          // Re-prepare transaction
          preparedTransaction = await rpc.prepareTransaction(transaction);

          // Re-sign transaction
          // For WalletConnect, use WalletNetwork enum instead of passphrase string
          let reNetworkPassphrase: string | WalletNetwork;
          if (isWalletConnect) {
            if (passphrase?.includes('Test')) {
              reNetworkPassphrase = WalletNetwork.TESTNET;
            } else if (passphrase?.includes('Public')) {
              reNetworkPassphrase = WalletNetwork.PUBLIC;
            } else if (passphrase?.includes('Future')) {
              reNetworkPassphrase = WalletNetwork.FUTURENET;
            } else {
              reNetworkPassphrase = WalletNetwork.TESTNET;
            }
          } else {
            reNetworkPassphrase = passphrase || Networks.TESTNET;
          }

          const reSignOptions = {
            networkPassphrase: reNetworkPassphrase,
            address: signerAddress,
          };

          const reSignedResult = await wallet.signTransaction(
            preparedTransaction.toXDR(),
            reSignOptions
          );

          // Parse re-signed transaction
          let reSignedXdrString: string;
          if (typeof reSignedResult === 'string') {
            reSignedXdrString = reSignedResult;
          } else if (reSignedResult && typeof reSignedResult === 'object') {
            if (
              'signedTxXdr' in reSignedResult &&
              typeof reSignedResult.signedTxXdr === 'string'
            ) {
              reSignedXdrString = reSignedResult.signedTxXdr;
            } else if (
              'xdr' in reSignedResult &&
              typeof reSignedResult.xdr === 'string'
            ) {
              reSignedXdrString = reSignedResult.xdr;
            } else if (
              'signedXdr' in reSignedResult &&
              typeof reSignedResult.signedXdr === 'string'
            ) {
              reSignedXdrString = reSignedResult.signedXdr;
            } else if (
              'toXDR' in reSignedResult &&
              typeof reSignedResult.toXDR === 'function'
            ) {
              reSignedXdrString = reSignedResult.toXDR();
            } else {
              throw new Error(
                'Wallet returned unexpected format from signTransaction on retry'
              );
            }
          } else {
            throw new Error(
              'Wallet signTransaction returned unexpected type on retry'
            );
          }

          signedTx = TransactionBuilder.fromXDR(
            reSignedXdrString,
            passphrase || Networks.TESTNET
          );

          // Continue to next iteration to retry sending
          continue;
        }

        // If not a sequence error or we've exhausted retries, throw
        throw new Error(`Transaction failed: ${errorMessage}`);
      }

      // If we get here, send succeeded
      break;
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error ? sendError.message : String(sendError);
      sendLastError =
        sendError instanceof Error ? sendError : new Error(String(sendError));

      // Check if it's a sequence number error that wasn't caught above
      const isSeqError =
        errorMessage.includes('txBadSeq') ||
        errorMessage.includes('bad sequence') ||
        errorMessage.includes('sequence');

      if (isSeqError && sendAttempt < SEND_MAX_RETRIES - 1) {
        // This will be handled in the next iteration
        continue;
      }

      // If not a sequence error or we've exhausted retries, throw
      throw sendLastError;
    }
  }

  if (!sendResponse) {
    throw (
      sendLastError || new Error('Failed to send transaction after retries')
    );
  }

  // Wait for the transaction to complete
  const getTxResponse = await rpc.getTransaction(sendResponse.hash);

  if (getTxResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    let errorMessage = 'Transaction failed';
    if (getTxResponse.resultXdr) {
      if (typeof getTxResponse.resultXdr === 'string') {
        errorMessage = getTxResponse.resultXdr;
      } else {
        try {
          errorMessage = JSON.stringify(getTxResponse.resultXdr, null, 2);
        } catch {
          errorMessage = String(getTxResponse.resultXdr);
        }
      }
    }
    if (getTxResponse.resultMetaXdr) {
      try {
        const metaStr =
          typeof getTxResponse.resultMetaXdr === 'string'
            ? getTxResponse.resultMetaXdr
            : JSON.stringify(getTxResponse.resultMetaXdr, null, 2);
        errorMessage += `\nTransaction metadata: ${metaStr}`;
      } catch {
        // Ignore metadata parsing errors
      }
    }
    throw new Error(`Transaction failed: ${errorMessage}`);
  }

  return sendResponse.hash;
};

/** Decimals for the claim-points custom token (1 token = 10^7 smallest units). */
export const CLAIM_POINTS_TOKEN_DECIMALS = 7;

/**
 * Convert display amount (tokens) to smallest units for the claim-points token.
 * @param displayAmount - Amount in display units (e.g. 100 for "100 tokens")
 */
export const toTokenSmallestUnits = (displayAmount: number): bigint =>
  BigInt(Math.floor(displayAmount * 10 ** CLAIM_POINTS_TOKEN_DECIMALS));

/**
 * Invoke a contract function that sends XLM to a recipient
 * This is a convenience wrapper for common payment contract patterns
 * @param contractId - The contract address or ID
 * @param recipientAddress - Address to send XLM to
 * @param amount - Amount in XLM (will be converted to stroops: 1 XLM = 10,000,000 stroops)
 * @param signerAddress - Address of the account signing the transaction
 * @param customNetworkPassphrase - Network passphrase for transaction building
 */
export const invokePaymentContract = async (
  contractId: string,
  recipientAddress: string,
  amount: number | undefined,
  signerAddress: string,
  customNetworkPassphrase?: string
): Promise<string> => {
  // Log network information for debugging
  const passphrase = customNetworkPassphrase || networkPassphrase;
  console.log('[Soroban] invokePaymentContract called with:', {
    contractId,
    recipientAddress,
    amount,
    signerAddress,
    hasCustomPassphrase: !!customNetworkPassphrase,
    passphrase: passphrase?.substring(0, 30) + '...',
    network: passphrase?.includes('Test')
      ? 'TESTNET'
      : passphrase?.includes('Public')
        ? 'MAINNET'
        : 'UNKNOWN',
  });
  // Validate amount if provided, or use default of 0.1 XLM for claim points
  const effectiveAmount = amount !== undefined ? amount : 0.1;

  if (isNaN(effectiveAmount) || effectiveAmount <= 0) {
    throw new Error(
      `Invalid amount: ${effectiveAmount}. Amount must be a positive number.`
    );
  }

  // Convert XLM to stroops (1 XLM = 10,000,000 stroops)
  // Default to 0.1 XLM (1,000,000 stroops) if amount is undefined (for claim points)
  const stroops = BigInt(Math.floor(effectiveAmount * 10_000_000));

  // Validate recipient address
  if (!isValidAddress(recipientAddress)) {
    throw new Error(`Invalid recipient address: ${recipientAddress}`);
  }

  // Common function names for payment contracts
  // Try "send" first, then "transfer", then "pay"
  const functionNames = ['send', 'transfer', 'pay'];
  const errors: string[] = [];

  for (const functionName of functionNames) {
    try {
      // First try with amount parameter (newer contract version)
      return await invokeContract(
        contractId,
        functionName,
        [recipientAddress, stroops],
        signerAddress,
        customNetworkPassphrase
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if this is a parameter mismatch error (contract might only accept recipient)
      const isParameterMismatch =
        errorMessage.includes('MismatchingParameterLen') ||
        errorMessage.includes('UnexpectedSize') ||
        (errorMessage.includes('parameter') &&
          errorMessage.includes('mismatch'));

      // If it's a parameter mismatch, try calling without amount (older contract version)
      if (isParameterMismatch) {
        try {
          console.log(
            `Function ${functionName} doesn't accept amount parameter, trying with recipient only...`
          );
          return await invokeContract(
            contractId,
            functionName,
            [recipientAddress],
            signerAddress,
            customNetworkPassphrase
          );
        } catch (retryError) {
          const retryErrorMessage =
            retryError instanceof Error
              ? retryError.message
              : String(retryError);
          errors.push(
            `${functionName} (with amount): ${errorMessage}; ${functionName} (without amount): ${retryErrorMessage}`
          );

          // Check if this is a "function not found" error
          const isFunctionNotFound =
            retryErrorMessage.toLowerCase().includes('not found') ||
            retryErrorMessage.toLowerCase().includes('unknown function') ||
            retryErrorMessage
              .toLowerCase()
              .includes('function does not exist') ||
            retryErrorMessage.toLowerCase().includes('invalid function');

          // If function doesn't exist, try next function
          if (isFunctionNotFound) {
            console.log(`Function ${functionName} not found, trying next...`);
            continue;
          }

          // Otherwise, throw the retry error
          throw new Error(
            `Error invoking ${functionName}: ${retryErrorMessage}. ` +
              `Tried with amount parameter (got: ${errorMessage}) and without amount parameter. ` +
              `This might indicate the contract doesn't exist, isn't deployed, or has a different function signature.`
          );
        }
      }

      errors.push(`${functionName}: ${errorMessage}`);

      // Check if this is a "function not found" or "unknown function" error
      const isFunctionNotFound =
        errorMessage.toLowerCase().includes('not found') ||
        errorMessage.toLowerCase().includes('unknown function') ||
        errorMessage.toLowerCase().includes('function does not exist') ||
        errorMessage.toLowerCase().includes('invalid function');

      // If this function doesn't exist, try the next one
      if (isFunctionNotFound) {
        console.log(`Function ${functionName} not found, trying next...`);
        continue;
      }

      // If it's a different error (like simulation error, auth error, etc.), throw it immediately
      // Don't try other functions if there's a real error
      throw new Error(
        `Error invoking ${functionName}: ${errorMessage}. ` +
          `This might indicate the contract doesn't exist, isn't deployed, or has a different function signature.`
      );
    }
  }

  // If we get here, all functions were tried and none worked
  throw new Error(
    `Could not find a valid payment function. Tried: ${functionNames.join(', ')}. ` +
      `Errors: ${errors.join('; ')}. ` +
      `Make sure the contract is deployed and has one of these functions: ${functionNames.join(', ')}.`
  );
};

/**
 * Read a value from a contract (view function)
 * Note: For view functions, we can use a dummy account since we're only simulating
 */
export const readContract = async (
  contractId: string,
  functionName: string,
  args: any[]
): Promise<any> => {
  // Ensure we're using testnet configuration
  const passphrase = networkPassphrase || Networks.TESTNET;
  const rpc = getSorobanRpc(passphrase);
  const contract = getContract(contractId);
  const effectiveHorizonUrl =
    horizonUrl || 'https://horizon-testnet.stellar.org';

  // Build a simulation transaction (no signing needed for view functions)
  // Use Horizon to get a real account (more reliable than RPC getAccount)
  let account: any;
  const dummyAccount =
    'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

  try {
    // Try Horizon first as it's more reliable
    const horizonServer = new Horizon.Server(effectiveHorizonUrl);
    account = await horizonServer.loadAccount(dummyAccount);
  } catch {
    // If Horizon fails, try RPC
    try {
      account = await rpc.getAccount(dummyAccount);
    } catch {
      // If both fail, create a minimal account object
      // This is fine for view functions - we just need an account for transaction building
      account = {
        accountId: dummyAccount,
        sequenceNumber: '0',
      } as any;
    }
  }

  // Determine network name for logging
  const networkName = passphrase.includes('Test')
    ? 'TESTNET'
    : passphrase.includes('Public')
      ? 'MAINNET'
      : 'UNKNOWN';

  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[readContract] Calling function "${functionName}" on contract ${contractId}`,
      {
        contractId,
        functionName,
        args,
        network: networkName,
        networkPassphrase: passphrase.substring(0, 30) + '...',
        horizonUrl: effectiveHorizonUrl,
        rpcUrl: rpcUrl,
        account: account.accountId || account.account?.accountId(),
      }
    );
  }

  const contractCall = contract.call(
    functionName,
    ...args.map((arg) => {
      if (typeof arg === 'string' && isValidAddress(arg)) {
        return addressToScVal(arg);
      }
      return nativeToScVal(arg);
    })
  );

  // Use higher fees for mainnet Soroban transactions
  const isMainnet =
    passphrase.includes('Public') ||
    passphrase.includes('Public Global Stellar Network');
  const baseFee = isMainnet ? '100000' : '100'; // 0.01 XLM for mainnet, 0.00001 XLM for testnet

  const transaction = new TransactionBuilder(account as any, {
    fee: baseFee,
    networkPassphrase: passphrase,
  })
    .addOperation(contractCall)
    .setTimeout(30)
    .build();

  // Simulate to get the result
  const simulation = await rpc.simulateTransaction(transaction);

  if (SorobanRpc.Api.isSimulationError(simulation)) {
    const errorDetails = simulation.error
      ? JSON.stringify(simulation.error, null, 2)
      : 'Unknown simulation error';
    const errorMsg =
      `Simulation error for function "${functionName}" on ${networkName}: ${errorDetails}. ` +
      `This might indicate the function doesn't exist, has wrong arguments, or the contract isn't deployed on ${networkName}. ` +
      `Contract: ${contractId}, Network: ${networkName}, RPC: ${rpcUrl}, Horizon: ${effectiveHorizonUrl}`;
    if (process.env.NODE_ENV === 'development') {
      console.error('[readContract] Simulation error:', errorMsg);
    }
    throw new Error(errorMsg);
  }

  if (!simulation.result) {
    const errorMsg =
      `Simulation returned no result for function "${functionName}" on ${networkName}. ` +
      `The contract might not exist or the function signature might be incorrect. ` +
      `Contract: ${contractId}, Network: ${networkName}, RPC: ${rpcUrl}`;
    if (process.env.NODE_ENV === 'development') {
      console.error('[readContract] No simulation result:', errorMsg);
    }
    throw new Error(errorMsg);
  }

  if (!simulation.result.retval) {
    const errorMsg =
      `Simulation returned no retval for function "${functionName}" on ${networkName}. ` +
      `The function might not return a value or the contract might not be initialized. ` +
      `Contract: ${contractId}, Network: ${networkName}`;
    if (process.env.NODE_ENV === 'development') {
      console.error('[readContract] No retval:', errorMsg);
    }
    throw new Error(errorMsg);
  }

  // Convert the result back to native JavaScript types
  try {
    const result = scValToNative(simulation.result.retval);
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[readContract] Successfully called "${functionName}" on ${networkName}:`,
        result
      );
    }
    return result;
  } catch (convertError) {
    const errorMessage =
      convertError instanceof Error
        ? convertError.message
        : String(convertError);
    const errorMsg =
      `Failed to convert result for function "${functionName}" on ${networkName}: ${errorMessage}. ` +
      `Result: ${JSON.stringify(simulation.result.retval)}`;
    if (process.env.NODE_ENV === 'development') {
      console.error('[readContract] Conversion error:', errorMsg);
    }
    throw new Error(errorMsg);
  }
};

/**
 * Invoke an NFT contract function
 * @param contractId - The NFT contract address or ID
 * @param functionName - Name of the function to invoke
 * @param args - Array of arguments to pass to the function
 * @param signerAddress - Address of the account signing the transaction
 * @param customNetworkPassphrase - Network passphrase for transaction building
 */
export const invokeNFTContract = async (
  contractId: string,
  functionName: string,
  args: any[],
  signerAddress: string,
  customNetworkPassphrase?: string
): Promise<string> => {
  // Use the general invokeContract function
  return invokeContract(
    contractId,
    functionName,
    args,
    signerAddress,
    customNetworkPassphrase
  );
};

/**
 * Mint an NFT to a recipient address with a payment of 0.01 XLM
 * @param contractId - The NFT contract address or ID
 * @param recipientAddress - Address to receive the minted NFT
 * @param signerAddress - Address of the account signing the transaction (any user can mint)
 * @param customNetworkPassphrase - Network passphrase for transaction building
 * @returns Object containing transaction hash, token ID, and contract ID
 */
export const mintNFT = async (
  contractId: string,
  recipientAddress: string,
  signerAddress: string,
  customNetworkPassphrase?: string
): Promise<{ txHash: string; tokenId: number; contractId: string }> => {
  if (!isValidAddress(recipientAddress)) {
    throw new Error(`Invalid recipient address: ${recipientAddress}`);
  }

  // Use customNetworkPassphrase if provided, otherwise fall back to module-level networkPassphrase
  // IMPORTANT: For WalletConnect, customNetworkPassphrase should always be provided from the wallet's detected network
  const passphrase = customNetworkPassphrase || networkPassphrase;

  // Determine if WalletConnect is being used
  // Note: WalletConnect derives chainId from the network configured during module initialization
  // We don't need to pass chainId to signTransaction
  const walletId = storage.getItem('walletId');
  const isWalletConnect = walletId === 'wallet_connect';

  console.log('[Soroban] mintNFT called with:', {
    contractId,
    recipientAddress,
    signerAddress,
    hasCustomPassphrase: !!customNetworkPassphrase,
    passphrase: passphrase?.substring(0, 30) + '...',
    network: passphrase?.includes('Test')
      ? 'TESTNET'
      : passphrase?.includes('Public')
        ? 'MAINNET'
        : 'UNKNOWN',
    walletId,
    isWalletConnect,
  });
  const rpc = getSorobanRpc(passphrase);
  const contract = getContract(contractId);

  // Determine the correct Horizon URL based on network passphrase
  const networkName = passphrase.includes('Test')
    ? 'TESTNET'
    : passphrase.includes('Public')
      ? 'MAINNET'
      : passphrase.includes('Future')
        ? 'FUTURENET'
        : 'TESTNET';
  const effectiveHorizonUrl = getHorizonUrlForNetwork(networkName);

  // Get the current account to build the transaction
  let account;
  try {
    const horizonServer = new Horizon.Server(effectiveHorizonUrl);
    account = await horizonServer.loadAccount(signerAddress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('404')
    ) {
      const networkName = passphrase.includes('Test')
        ? 'TESTNET'
        : passphrase.includes('Public')
          ? 'MAINNET'
          : 'UNKNOWN';
      throw new Error(
        `Account not found on ${networkName}: ${signerAddress}. ` +
          `The account must be funded before it can invoke contracts. ` +
          `On testnet/futurenet, you can fund it using Friendbot: ` +
          `curl "https://friendbot.stellar.org/?addr=${signerAddress}" ` +
          `Current network: ${networkName}, Horizon: ${horizonUrl}, RPC: ${rpcUrl}`
      );
    }
    throw error;
  }

  // Build the contract call
  const contractCall = contract.call('mint', addressToScVal(recipientAddress));

  // Note: Payment is now handled within the contract itself.
  // The contract's mint function automatically transfers 0.01 XLM from the recipient to the contract.
  // The recipient address must authorize the transaction (sign it) for the payment to work.

  // Use higher fees for mainnet Soroban transactions
  // Mainnet typically requires 100,000+ stroops (0.01+ XLM) for Soroban contract invocations
  // Testnet can use lower fees (100 stroops = 0.00001 XLM)
  const isMainnet =
    passphrase.includes('Public') ||
    passphrase.includes('Public Global Stellar Network');
  const baseFee = isMainnet ? '100000' : '100'; // 0.01 XLM for mainnet, 0.00001 XLM for testnet

  // Build transaction with contract call
  let transaction = new TransactionBuilder(account, {
    fee: baseFee,
    networkPassphrase: passphrase || Networks.TESTNET,
  })
    .addOperation(contractCall)
    .setTimeout(30)
    .build();

  // Check account balance before simulating
  // The mint requires 0.01 XLM payment + transaction fees + minimum reserve
  // The native token contract enforces a minimum balance (typically 1 XLM for basic accounts)
  // On mainnet: fee is ~0.01 XLM, minimum reserve is typically 1 XLM (enforced by native token contract)
  // On testnet: fee is ~0.00001 XLM, minimum reserve is typically 0.5 XLM
  const accountBalanceXlm = parseFloat(account.balances[0]?.balance || '0');
  const mintCostXlm = 0.01; // Payment to contract
  const estimatedFeeXlm = isMainnet ? 0.01 : 0.00001;
  // The native token contract requires maintaining a minimum balance after transfer
  // Based on the error, it appears the contract enforces ~1 XLM minimum
  // We need: payment + fee + minimum balance that must remain after transfer
  const minBalanceAfterTransferXlm = isMainnet ? 1.0 : 0.5; // Minimum balance that must remain
  const requiredBalanceXlm =
    mintCostXlm + estimatedFeeXlm + minBalanceAfterTransferXlm;

  if (accountBalanceXlm < requiredBalanceXlm) {
    throw new Error(
      `Insufficient balance to mint NFT. ` +
        `You have ${accountBalanceXlm.toFixed(2)} XLM, but need at least ${requiredBalanceXlm.toFixed(2)} XLM ` +
        `(0.01 XLM payment + ${estimatedFeeXlm.toFixed(5)} XLM fee + ${minBalanceAfterTransferXlm.toFixed(1)} XLM minimum balance that must remain). ` +
        `The native token contract requires maintaining a minimum balance after the transfer. Please add more XLM to your account.`
    );
  }

  // Simulate the transaction first
  const simulation = await rpc.simulateTransaction(transaction);

  if (SorobanRpc.Api.isSimulationError(simulation)) {
    const errorDetails = simulation.error
      ? JSON.stringify(simulation.error, null, 2)
      : 'Unknown simulation error';

    // Parse error to provide more helpful messages
    let helpfulMessage = '';
    if (
      errorDetails.includes('resulting balance is not within the allowed range')
    ) {
      // Extract balance values from error if possible
      const balanceMatch = errorDetails.match(/10000000.*?9000000/);
      if (balanceMatch) {
        // Account has 10 XLM, after transfer would have 9.99 XLM, but contract requires minimum
        // The native token contract requires maintaining a minimum balance (typically 1 XLM)
        helpfulMessage = ` Your account balance is too low. You have 10 XLM, but after paying 0.01 XLM, your balance would be 9.99 XLM, which is below the minimum required by the native token contract. Please ensure you have at least ${requiredBalanceXlm.toFixed(2)} XLM in your account (0.01 XLM payment + fees + ${minBalanceAfterTransferXlm.toFixed(1)} XLM minimum balance).`;
      } else {
        helpfulMessage = ` Your account balance is too low. After paying 0.01 XLM for the NFT, your account would fall below the minimum required balance enforced by the native token contract. Please ensure you have at least ${requiredBalanceXlm.toFixed(2)} XLM in your account.`;
      }
    } else if (errorDetails.includes('Insufficient balance')) {
      helpfulMessage = ` Your account doesn't have enough XLM to complete this transaction. Please add more XLM to your account.`;
    }

    throw new Error(
      `Simulation error for mint function: ${errorDetails}.${helpfulMessage} ` +
        `This might indicate insufficient balance, the function doesn't exist, has wrong arguments, or the contract isn't deployed.`
    );
  }

  if (!simulation.result) {
    throw new Error(
      `Simulation returned no result for mint function. ` +
        `The contract might not exist or the function signature might be incorrect.`
    );
  }

  // Retry logic for txBadSeq errors - fetch fresh account and rebuild transaction
  const MAX_RETRIES = 3;
  let preparedTransaction;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Fetch fresh account right before preparing to ensure correct sequence number
      try {
        account = await rpc.getAccount(signerAddress);
      } catch (rpcError) {
        // Fallback to Horizon if RPC fails
        try {
          const horizonServer = new Horizon.Server(effectiveHorizonUrl);
          account = await horizonServer.loadAccount(signerAddress);
        } catch (horizonError) {
          console.warn(
            '[Soroban] Failed to refresh account before prepareTransaction (mintNFT):',
            {
              rpcError:
                rpcError instanceof Error ? rpcError.message : String(rpcError),
              horizonError:
                horizonError instanceof Error
                  ? horizonError.message
                  : String(horizonError),
            }
          );
        }
      }

      // Rebuild transaction with fresh account
      transaction = new TransactionBuilder(account, {
        fee: baseFee,
        networkPassphrase: passphrase || Networks.TESTNET,
      })
        .addOperation(contractCall)
        .setTimeout(30)
        .build();

      // Prepare the transaction
      preparedTransaction = await rpc.prepareTransaction(transaction);

      // If we get here, preparation succeeded
      break;
    } catch (prepareError) {
      const errorMessage =
        prepareError instanceof Error
          ? prepareError.message
          : String(prepareError);
      lastError =
        prepareError instanceof Error
          ? prepareError
          : new Error(String(prepareError));

      // Check if it's a sequence number error
      if (
        errorMessage.includes('txBadSeq') ||
        errorMessage.includes('bad sequence') ||
        errorMessage.includes('sequence')
      ) {
        if (attempt < MAX_RETRIES - 1) {
          // Wait a bit before retrying (exponential backoff)
          const delayMs = Math.min(100 * Math.pow(2, attempt), 500);
          console.warn(
            `[Soroban] Sequence number error on prepare attempt ${attempt + 1}/${MAX_RETRIES} (mintNFT), retrying in ${delayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }
      // If it's not a sequence error or we've exhausted retries, throw
      throw lastError;
    }
  }

  if (!preparedTransaction) {
    throw lastError || new Error('Failed to prepare transaction after retries');
  }

  // Sign the transaction using the wallet kit
  // For WalletConnect, we need to use WalletNetwork enum instead of passphrase string
  // WalletConnect expects WalletNetwork enum, not the passphrase string
  // (walletId and isWalletConnect are already defined at function start)

  // IMPORTANT: Ensure the wallet is set before signing, especially for WalletConnect
  // This is critical for WalletConnect to properly route the signing request to the mobile wallet
  if (walletId) {
    wallet.setWallet(walletId);
    console.log('[Soroban] mintNFT: Set wallet before signing:', walletId);
  }

  // Convert passphrase to WalletNetwork enum for WalletConnect compatibility
  // WalletNetwork enum values ARE the passphrase strings, so this conversion ensures type compatibility
  let networkPassphraseForSigning: string | WalletNetwork;
  if (isWalletConnect) {
    // For WalletConnect, use WalletNetwork enum to ensure it matches module initialization
    if (passphrase?.includes('Test')) {
      networkPassphraseForSigning = WalletNetwork.TESTNET;
    } else if (passphrase?.includes('Public')) {
      networkPassphraseForSigning = WalletNetwork.PUBLIC;
    } else if (passphrase?.includes('Future')) {
      networkPassphraseForSigning = WalletNetwork.FUTURENET;
    } else {
      networkPassphraseForSigning = WalletNetwork.TESTNET;
    }
  } else {
    // For other wallets, use the passphrase string directly
    networkPassphraseForSigning = passphrase || Networks.TESTNET;
  }

  console.log(
    '[Soroban] mintNFT: Signing transaction with network passphrase:',
    {
      passphrase: passphrase || Networks.TESTNET,
      networkPassphraseForSigning,
      networkPassphraseType: typeof networkPassphraseForSigning,
      isWalletNetworkEnum: isWalletConnect
        ? networkPassphraseForSigning === WalletNetwork.TESTNET ||
          networkPassphraseForSigning === WalletNetwork.PUBLIC ||
          networkPassphraseForSigning === WalletNetwork.FUTURENET
        : 'N/A',
      signerAddress,
      walletId,
      isWalletConnect,
      networkName: passphrase?.includes('Test')
        ? 'TESTNET'
        : passphrase?.includes('Public')
          ? 'MAINNET'
          : 'TESTNET',
      xdrLength: preparedTransaction.toXDR().length,
    }
  );

  const signOptions = {
    networkPassphrase: networkPassphraseForSigning,
    address: signerAddress,
  };

  // For WalletConnect, verify connection before signing
  if (isWalletConnect) {
    try {
      // Verify WalletConnect is still connected by checking address
      const currentAddress = await wallet.getAddress();
      if (
        !currentAddress?.address ||
        currentAddress.address !== signerAddress
      ) {
        throw new Error(
          `WalletConnect address mismatch. Expected: ${signerAddress}, Got: ${currentAddress?.address || 'none'}. Please reconnect your wallet.`
        );
      }
      console.log(
        '[Soroban] mintNFT: WalletConnect connection verified:',
        currentAddress.address
      );
    } catch (connectionError) {
      const errorMessage =
        connectionError instanceof Error
          ? connectionError.message
          : String(connectionError);
      console.error(
        '[Soroban] mintNFT: WalletConnect connection check failed:',
        errorMessage
      );
      throw new Error(
        `WalletConnect session lost. Please reconnect your wallet. Original error: ${errorMessage}`
      );
    }
  }

  console.log(
    '[Soroban] mintNFT: Calling wallet.signTransaction, waiting for mobile wallet prompt...'
  );
  let signedTransactionResult;
  try {
    // Add a timeout for WalletConnect to detect if it's hanging
    const signPromise = wallet.signTransaction(
      preparedTransaction.toXDR(),
      signOptions
    );

    // For WalletConnect, add a longer timeout (60 seconds) as mobile wallets can be slow
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'Transaction signing timed out after 60 seconds. Please check your mobile wallet for the signing prompt.'
          )
        );
      }, 60000);
    });

    signedTransactionResult = await Promise.race([signPromise, timeoutPromise]);

    console.log('[Soroban] mintNFT: signTransaction returned:', {
      resultType: typeof signedTransactionResult,
      hasSignedTxXdr:
        signedTransactionResult &&
        typeof signedTransactionResult === 'object' &&
        'signedTxXdr' in signedTransactionResult,
    });
  } catch (signError) {
    const errorMessage =
      signError instanceof Error ? signError.message : String(signError);
    console.error('[Soroban] mintNFT: signTransaction error:', {
      error: errorMessage,
      walletId,
      isWalletConnect,
      signOptions,
      xdrLength: preparedTransaction.toXDR().length,
    });
    throw signError;
  }

  // Handle the signed transaction result
  let signedTxXdrString: string;

  if (typeof signedTransactionResult === 'string') {
    signedTxXdrString = signedTransactionResult;
  } else if (
    signedTransactionResult &&
    typeof signedTransactionResult === 'object'
  ) {
    if (
      'signedTxXdr' in signedTransactionResult &&
      typeof signedTransactionResult.signedTxXdr === 'string'
    ) {
      signedTxXdrString = signedTransactionResult.signedTxXdr;
    } else if (
      'xdr' in signedTransactionResult &&
      typeof signedTransactionResult.xdr === 'string'
    ) {
      signedTxXdrString = signedTransactionResult.xdr;
    } else if (
      'signedXdr' in signedTransactionResult &&
      typeof signedTransactionResult.signedXdr === 'string'
    ) {
      signedTxXdrString = signedTransactionResult.signedXdr;
    } else if (
      'toXDR' in signedTransactionResult &&
      typeof signedTransactionResult.toXDR === 'function'
    ) {
      signedTxXdrString = signedTransactionResult.toXDR();
    } else {
      console.error(
        '[Soroban] Unexpected signTransaction result format:',
        signedTransactionResult
      );
      const keys = Object.keys(signedTransactionResult);
      throw new Error(
        `Wallet returned unexpected format from signTransaction. ` +
          `Expected string or object with 'signedTxXdr'/'xdr'/'signedXdr' property. ` +
          `Got object with keys: ${keys.join(', ')}.`
      );
    }
  } else {
    throw new Error(
      `Wallet signTransaction returned unexpected type: ${typeof signedTransactionResult}. ` +
        `Expected string or object.`
    );
  }

  // Parse the signed transaction XDR
  let signedTx;
  try {
    signedTx = TransactionBuilder.fromXDR(
      signedTxXdrString,
      passphrase || Networks.TESTNET
    );
  } catch (parseError) {
    const errorMessage =
      parseError instanceof Error ? parseError.message : String(parseError);
    console.error(
      '[Soroban] Failed to parse signed transaction XDR:',
      errorMessage
    );

    if (passphrase && passphrase !== Networks.TESTNET) {
      try {
        signedTx = TransactionBuilder.fromXDR(
          signedTxXdrString,
          Networks.TESTNET
        );
      } catch {
        throw new Error(
          `Failed to parse signed transaction XDR: ${errorMessage}. ` +
            `Tried passphrases: "${passphrase}" and "${Networks.TESTNET}".`
        );
      }
    } else {
      throw new Error(
        `Failed to parse signed transaction XDR: ${errorMessage}. ` +
          `Network passphrase: ${passphrase || Networks.TESTNET}.`
      );
    }
  }

  // Send the transaction with retry logic for txBadSeq errors
  let sendResponse;
  const SEND_MAX_RETRIES = 3;
  let sendLastError: Error | null = null;

  for (let sendAttempt = 0; sendAttempt < SEND_MAX_RETRIES; sendAttempt++) {
    try {
      sendResponse = await rpc.sendTransaction(signedTx);

      if (sendResponse.status === 'ERROR') {
        let errorMessage = 'Unknown error';
        if (sendResponse.errorResult) {
          if (typeof sendResponse.errorResult === 'string') {
            errorMessage = sendResponse.errorResult;
          } else if (sendResponse.errorResult instanceof Error) {
            errorMessage = sendResponse.errorResult.message;
          } else {
            try {
              errorMessage = JSON.stringify(sendResponse.errorResult, null, 2);
            } catch {
              errorMessage = String(sendResponse.errorResult);
            }
          }
        }

        // Check if it's a sequence number error
        const isSeqError =
          errorMessage.includes('txBadSeq') ||
          errorMessage.includes('bad sequence') ||
          errorMessage.includes('sequence') ||
          (typeof sendResponse.errorResult === 'object' &&
            sendResponse.errorResult !== null &&
            JSON.stringify(sendResponse.errorResult).includes('txBadSeq'));

        if (isSeqError && sendAttempt < SEND_MAX_RETRIES - 1) {
          // Fetch fresh account and rebuild transaction
          console.warn(
            `[Soroban] Sequence number error on send attempt ${sendAttempt + 1}/${SEND_MAX_RETRIES} (mintNFT), refreshing account and retrying...`
          );

          // Wait a bit before retrying (exponential backoff)
          const delayMs = Math.min(200 * Math.pow(2, sendAttempt), 1000);
          await new Promise((resolve) => setTimeout(resolve, delayMs));

          // Fetch fresh account
          try {
            account = await rpc.getAccount(signerAddress);
          } catch {
            // Fallback to Horizon if RPC fails
            try {
              const horizonServer = new Horizon.Server(effectiveHorizonUrl);
              account = await horizonServer.loadAccount(signerAddress);
            } catch (horizonError) {
              throw new Error(
                `Failed to refresh account for retry: ${horizonError instanceof Error ? horizonError.message : String(horizonError)}`
              );
            }
          }

          // Rebuild transaction with fresh account
          transaction = new TransactionBuilder(account, {
            fee: baseFee,
            networkPassphrase: passphrase || Networks.TESTNET,
          })
            .addOperation(contractCall)
            .setTimeout(30)
            .build();

          // Re-prepare transaction
          const rePreparedTransaction =
            await rpc.prepareTransaction(transaction);

          // Re-sign transaction
          // For WalletConnect, use WalletNetwork enum instead of passphrase string
          let reNetworkPassphrase: string | WalletNetwork;
          if (isWalletConnect) {
            if (passphrase?.includes('Test')) {
              reNetworkPassphrase = WalletNetwork.TESTNET;
            } else if (passphrase?.includes('Public')) {
              reNetworkPassphrase = WalletNetwork.PUBLIC;
            } else if (passphrase?.includes('Future')) {
              reNetworkPassphrase = WalletNetwork.FUTURENET;
            } else {
              reNetworkPassphrase = WalletNetwork.TESTNET;
            }
          } else {
            reNetworkPassphrase = passphrase || Networks.TESTNET;
          }

          const reSignOptions = {
            networkPassphrase: reNetworkPassphrase,
            address: signerAddress,
          };

          const reSignedResult = await wallet.signTransaction(
            rePreparedTransaction.toXDR(),
            reSignOptions
          );

          // Parse re-signed transaction
          let reSignedXdrString: string;
          if (typeof reSignedResult === 'string') {
            reSignedXdrString = reSignedResult;
          } else if (reSignedResult && typeof reSignedResult === 'object') {
            if (
              'signedTxXdr' in reSignedResult &&
              typeof reSignedResult.signedTxXdr === 'string'
            ) {
              reSignedXdrString = reSignedResult.signedTxXdr;
            } else if (
              'xdr' in reSignedResult &&
              typeof reSignedResult.xdr === 'string'
            ) {
              reSignedXdrString = reSignedResult.xdr;
            } else if (
              'signedXdr' in reSignedResult &&
              typeof reSignedResult.signedXdr === 'string'
            ) {
              reSignedXdrString = reSignedResult.signedXdr;
            } else if (
              'toXDR' in reSignedResult &&
              typeof reSignedResult.toXDR === 'function'
            ) {
              reSignedXdrString = reSignedResult.toXDR();
            } else {
              throw new Error(
                'Wallet returned unexpected format from signTransaction on retry'
              );
            }
          } else {
            throw new Error(
              'Wallet signTransaction returned unexpected type on retry'
            );
          }

          signedTx = TransactionBuilder.fromXDR(
            reSignedXdrString,
            passphrase || Networks.TESTNET
          );

          // Continue to next iteration to retry sending
          continue;
        }

        // If not a sequence error or we've exhausted retries, throw
        throw new Error(`Transaction failed: ${errorMessage}`);
      }

      // If we get here, send succeeded
      break;
    } catch (sendError) {
      const errorMessage =
        sendError instanceof Error ? sendError.message : String(sendError);
      sendLastError =
        sendError instanceof Error ? sendError : new Error(String(sendError));

      // Check if it's a sequence number error that wasn't caught above
      const isSeqError =
        errorMessage.includes('txBadSeq') ||
        errorMessage.includes('bad sequence') ||
        errorMessage.includes('sequence');

      if (isSeqError && sendAttempt < SEND_MAX_RETRIES - 1) {
        // This will be handled in the next iteration
        continue;
      }

      // If not a sequence error or we've exhausted retries, throw
      throw sendLastError;
    }
  }

  if (!sendResponse) {
    throw (
      sendLastError || new Error('Failed to send transaction after retries')
    );
  }

  // Wait for the transaction to complete
  const getTxResponse = await rpc.getTransaction(sendResponse.hash);

  if (getTxResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    let errorMessage = 'Transaction failed';
    if (getTxResponse.resultXdr) {
      if (typeof getTxResponse.resultXdr === 'string') {
        errorMessage = getTxResponse.resultXdr;
      } else {
        try {
          errorMessage = JSON.stringify(getTxResponse.resultXdr, null, 2);
        } catch {
          errorMessage = String(getTxResponse.resultXdr);
        }
      }
    }
    if (getTxResponse.resultMetaXdr) {
      try {
        const metaStr =
          typeof getTxResponse.resultMetaXdr === 'string'
            ? getTxResponse.resultMetaXdr
            : JSON.stringify(getTxResponse.resultMetaXdr, null, 2);
        errorMessage += `\nTransaction metadata: ${metaStr}`;
      } catch {
        // Ignore metadata parsing errors
      }
    }
    throw new Error(`Transaction failed: ${errorMessage}`);
  }

  // Extract token ID from the simulation result
  // The mint function returns a u32 (token ID)
  // We use the simulation result since it's more reliable than parsing resultXdr
  let tokenId: number = 0;
  try {
    if (simulation.result && !SorobanRpc.Api.isSimulationError(simulation)) {
      const nativeValue = scValToNative(simulation.result.retval);
      tokenId =
        typeof nativeValue === 'number' ? nativeValue : Number(nativeValue);
    }
  } catch (error) {
    console.warn(
      '[Soroban] Failed to extract token ID from mint simulation:',
      error
    );
    // Token ID extraction failed, but transaction succeeded - continue with 0
  }

  return {
    txHash: sendResponse.hash,
    tokenId,
    contractId,
  };
};

/**
 * Read a value from an NFT contract (view function)
 * @param contractId - The NFT contract address or ID
 * @param functionName - Name of the view function to call
 * @param args - Array of arguments to pass to the function
 * @returns The result of the view function call
 */
export const readNFTContract = async (
  contractId: string,
  functionName: string,
  args: any[] = []
): Promise<any> => {
  return readContract(contractId, functionName, args);
};

/**
 * Get the collection name
 * @param contractId - The NFT contract address or ID
 * @returns The collection name as a string
 */
export const getNFTName = async (contractId: string): Promise<string> => {
  return readNFTContract(contractId, 'name', []);
};

/**
 * Get the collection symbol
 * @param contractId - The NFT contract address or ID
 * @returns The collection symbol as a string
 */
export const getNFTSymbol = async (contractId: string): Promise<string> => {
  return readNFTContract(contractId, 'symbol', []);
};

/**
 * Get the total supply of minted NFTs
 * @param contractId - The NFT contract address or ID
 * @returns The total supply as a number
 */
export const getNFTTotalSupply = async (
  contractId: string
): Promise<number> => {
  const result = await readNFTContract(contractId, 'total_supply', []);
  // Ensure we return a number (result might be a string or other type)
  return typeof result === 'number' ? result : Number(result);
};
