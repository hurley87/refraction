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
} from "@stellar/stellar-sdk";
import { networkPassphrase, rpcUrl, horizonUrl } from "./network";
import { wallet } from "./wallet";

/**
 * Get Soroban RPC server instance for the current network
 * Uses a proxy API route to avoid CORS issues in the browser
 */
export const getSorobanRpc = (): SorobanRpc.Server => {
  // In the browser, use the proxy API route to avoid CORS issues
  // On the server, use the direct RPC URL
  const isBrowser = typeof window !== "undefined";
  let effectiveRpcUrl: string;
  
  if (isBrowser) {
    // Use full URL for the proxy API route in browser
    const origin = window.location.origin;
    effectiveRpcUrl = `${origin}/api/soroban-rpc`;
  } else {
    // Use direct RPC URL on server
    effectiveRpcUrl = rpcUrl;
  }
  
  // Log network configuration for debugging (only in development)
  if (process.env.NODE_ENV === "development") {
    console.log("[Soroban] Network configuration:", {
      network: networkPassphrase.includes("Test") ? "TESTNET" : networkPassphrase.includes("Public") ? "MAINNET" : "UNKNOWN",
      rpcUrl: effectiveRpcUrl,
      originalRpcUrl: rpcUrl,
      isBrowser,
      networkPassphrase: networkPassphrase.substring(0, 30) + "...",
    });
  }
  
  return new SorobanRpc.Server(effectiveRpcUrl, {
    allowHttp: effectiveRpcUrl.startsWith("http://") || effectiveRpcUrl.includes("localhost"),
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
    throw new Error("Contract address cannot be empty");
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
  customNetworkPassphrase?: string,
): Promise<string> => {
  const rpc = getSorobanRpc();
  const contract = getContract(contractId);
  const passphrase = customNetworkPassphrase || networkPassphrase;

  // Get the current account to build the transaction
  // Use Horizon for account lookups as it's more reliable across networks
  let account;
  try {
    const horizonServer = new Horizon.Server(horizonUrl);
    account = await horizonServer.loadAccount(signerAddress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("not found") || errorMessage.includes("does not exist") || errorMessage.includes("404")) {
      // Verify the account on the correct network
      const networkName = passphrase.includes("Test") ? "TESTNET" : passphrase.includes("Public") ? "MAINNET" : "UNKNOWN";
      throw new Error(
        `Account not found on ${networkName}: ${signerAddress}. ` +
        `The account must be funded before it can invoke contracts. ` +
        `On testnet/futurenet, you can fund it using Friendbot: ` +
        `curl "https://friendbot.stellar.org/?addr=${signerAddress}" ` +
        `(or use the "Fund Account" button if available). ` +
        `Current network: ${networkName}, Horizon: ${horizonUrl}, RPC: ${rpcUrl}`
      );
    }
    throw error;
  }

  // Build the transaction
  const contractCall = contract.call(
    functionName,
    ...args.map((arg) => {
      // Convert arguments to ScVal based on type
      if (typeof arg === "string") {
        // Check if it's an address
        if (isValidAddress(arg)) {
          return addressToScVal(arg);
        }
        // Otherwise treat as string
        return nativeToScVal(arg, { type: "string" });
      } else if (typeof arg === "number") {
        return nativeToScVal(arg, { type: "i128" });
      } else if (typeof arg === "bigint") {
        return nativeToScVal(arg, { type: "i128" });
      }
      // For other types, try to convert directly
      return nativeToScVal(arg);
    }),
  );

  const transaction = new TransactionBuilder(account, {
    fee: "100",
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
      : "Unknown simulation error";
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

  // Prepare the transaction
  const preparedTransaction = await rpc.prepareTransaction(transaction);

  // Sign the transaction using the wallet kit
  // The wallet kit's signTransaction expects the XDR string and options
  const signedTransactionResult = await wallet.signTransaction(
    preparedTransaction.toXDR(),
    {
      networkPassphrase: passphrase || Networks.TESTNET,
      address: signerAddress,
    },
  );

  // Handle the signed transaction result
  // The wallet kit may return different formats depending on the wallet
  let signedTxXdrString: string;
  
  if (typeof signedTransactionResult === 'string') {
    // Direct string (XDR)
    signedTxXdrString = signedTransactionResult;
  } else if (signedTransactionResult && typeof signedTransactionResult === 'object') {
    // Check if it has an XDR property - try common property names
    if ('signedTxXdr' in signedTransactionResult && typeof signedTransactionResult.signedTxXdr === 'string') {
      signedTxXdrString = signedTransactionResult.signedTxXdr;
    } else if ('xdr' in signedTransactionResult && typeof signedTransactionResult.xdr === 'string') {
      signedTxXdrString = signedTransactionResult.xdr;
    } else if ('signedXdr' in signedTransactionResult && typeof signedTransactionResult.signedXdr === 'string') {
      signedTxXdrString = signedTransactionResult.signedXdr;
    } else if ('toXDR' in signedTransactionResult && typeof signedTransactionResult.toXDR === 'function') {
      // It's already a Transaction object
      signedTxXdrString = signedTransactionResult.toXDR();
    } else {
      // Try to stringify and see what we get
      console.error("[Soroban] Unexpected signTransaction result format:", signedTransactionResult);
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
  
  console.log("[Soroban] Signed transaction XDR length:", signedTxXdrString.length);
  console.log("[Soroban] Signed transaction XDR (first 100 chars):", signedTxXdrString.substring(0, 100));
  
  // Parse the signed transaction XDR
  // The wallet returns XDR that was signed, we need to parse it back to a Transaction object
  // Use the same network passphrase that was used to build the original transaction
  let signedTx;
  try {
    // Parse using TransactionBuilder.fromXDR with the correct network passphrase
    signedTx = TransactionBuilder.fromXDR(signedTxXdrString, passphrase || Networks.TESTNET);
    console.log("[Soroban] Successfully parsed signed transaction XDR");
  } catch (parseError) {
    // If parsing fails, it might be a network passphrase mismatch
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    console.error("[Soroban] Failed to parse signed transaction XDR:", errorMessage);
    console.error("[Soroban] XDR length:", signedTxXdrString.length);
    console.error("[Soroban] XDR (first 200 chars):", signedTxXdrString.substring(0, 200));
    console.error("[Soroban] Network passphrase used:", passphrase || Networks.TESTNET);
    
    // Try with the default testnet passphrase if we used a custom one
    if (passphrase && passphrase !== Networks.TESTNET) {
      console.log("[Soroban] Retrying with default TESTNET passphrase...");
      try {
        signedTx = TransactionBuilder.fromXDR(signedTxXdrString, Networks.TESTNET);
        console.log("[Soroban] Successfully parsed with default TESTNET passphrase");
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

  // Send the transaction
  const sendResponse = await rpc.sendTransaction(signedTx);

  if (sendResponse.status === "ERROR") {
    throw new Error(`Transaction failed: ${sendResponse.errorResult?.toString()}`);
  }

  // Wait for the transaction to complete
  const getTxResponse = await rpc.getTransaction(sendResponse.hash);

  if (getTxResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error(
      `Transaction failed: ${getTxResponse.resultXdr?.toString()}`,
    );
  }

  return sendResponse.hash;
};

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
  amount: number,
  signerAddress: string,
  customNetworkPassphrase?: string,
): Promise<string> => {
  // Convert XLM to stroops (1 XLM = 10,000,000 stroops)
  const stroops = BigInt(Math.floor(amount * 10_000_000));

  // Validate recipient address
  if (!isValidAddress(recipientAddress)) {
    throw new Error(`Invalid recipient address: ${recipientAddress}`);
  }

  // Common function names for payment contracts
  // Try "send" first, then "transfer", then "pay"
  const functionNames = ["send", "transfer", "pay"];
  const errors: string[] = [];

  for (const functionName of functionNames) {
    try {
      return await invokeContract(
        contractId,
        functionName,
        [recipientAddress, stroops],
        signerAddress,
        customNetworkPassphrase,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`${functionName}: ${errorMessage}`);
      
      // Check if this is a "function not found" or "unknown function" error
      const isFunctionNotFound = 
        errorMessage.toLowerCase().includes("not found") ||
        errorMessage.toLowerCase().includes("unknown function") ||
        errorMessage.toLowerCase().includes("function does not exist") ||
        errorMessage.toLowerCase().includes("invalid function");
      
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
    `Could not find a valid payment function. Tried: ${functionNames.join(", ")}. ` +
    `Errors: ${errors.join("; ")}. ` +
    `Make sure the contract is deployed and has one of these functions: ${functionNames.join(", ")}.`
  );
};

/**
 * Read a value from a contract (view function)
 * Note: For view functions, we can use a dummy account since we're only simulating
 */
export const readContract = async (
  contractId: string,
  functionName: string,
  args: any[],
): Promise<any> => {
  const rpc = getSorobanRpc();
  const contract = getContract(contractId);

  // Ensure we're using testnet configuration
  const passphrase = networkPassphrase || Networks.TESTNET;
  const effectiveHorizonUrl = horizonUrl || "https://horizon-testnet.stellar.org";
  
  // Build a simulation transaction (no signing needed for view functions)
  // Use Horizon to get a real account (more reliable than RPC getAccount)
  let account: any;
  const dummyAccount = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  
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
        sequenceNumber: "0",
      } as any;
    }
  }
  
  // Determine network name for logging
  const networkName = passphrase.includes("Test") ? "TESTNET" 
    : passphrase.includes("Public") ? "MAINNET" 
    : "UNKNOWN";
  
  if (process.env.NODE_ENV === "development") {
    console.log(`[readContract] Calling function "${functionName}" on contract ${contractId}`, {
      contractId,
      functionName,
      args,
      network: networkName,
      networkPassphrase: passphrase.substring(0, 30) + "...",
      horizonUrl: effectiveHorizonUrl,
      rpcUrl: rpcUrl,
      account: account.accountId || account.account?.accountId(),
    });
  }

  const contractCall = contract.call(
    functionName,
    ...args.map((arg) => {
      if (typeof arg === "string" && isValidAddress(arg)) {
        return addressToScVal(arg);
      }
      return nativeToScVal(arg);
    }),
  );

  const transaction = new TransactionBuilder(account as any, {
    fee: "100",
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
      : "Unknown simulation error";
    const errorMsg = `Simulation error for function "${functionName}" on ${networkName}: ${errorDetails}. ` +
      `This might indicate the function doesn't exist, has wrong arguments, or the contract isn't deployed on ${networkName}. ` +
      `Contract: ${contractId}, Network: ${networkName}, RPC: ${rpcUrl}, Horizon: ${effectiveHorizonUrl}`;
    if (process.env.NODE_ENV === "development") {
      console.error("[readContract] Simulation error:", errorMsg);
    }
    throw new Error(errorMsg);
  }

  if (!simulation.result) {
    const errorMsg = `Simulation returned no result for function "${functionName}" on ${networkName}. ` +
      `The contract might not exist or the function signature might be incorrect. ` +
      `Contract: ${contractId}, Network: ${networkName}, RPC: ${rpcUrl}`;
    if (process.env.NODE_ENV === "development") {
      console.error("[readContract] No simulation result:", errorMsg);
    }
    throw new Error(errorMsg);
  }

  if (!simulation.result.retval) {
    const errorMsg = `Simulation returned no retval for function "${functionName}" on ${networkName}. ` +
      `The function might not return a value or the contract might not be initialized. ` +
      `Contract: ${contractId}, Network: ${networkName}`;
    if (process.env.NODE_ENV === "development") {
      console.error("[readContract] No retval:", errorMsg);
    }
    throw new Error(errorMsg);
  }

  // Convert the result back to native JavaScript types
  try {
    const result = scValToNative(simulation.result.retval);
    if (process.env.NODE_ENV === "development") {
      console.log(`[readContract] Successfully called "${functionName}" on ${networkName}:`, result);
    }
    return result;
  } catch (convertError) {
    const errorMessage = convertError instanceof Error ? convertError.message : String(convertError);
    const errorMsg = `Failed to convert result for function "${functionName}" on ${networkName}: ${errorMessage}. ` +
      `Result: ${JSON.stringify(simulation.result.retval)}`;
    if (process.env.NODE_ENV === "development") {
      console.error("[readContract] Conversion error:", errorMsg);
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
  customNetworkPassphrase?: string,
): Promise<string> => {
  // Use the general invokeContract function
  return invokeContract(
    contractId,
    functionName,
    args,
    signerAddress,
    customNetworkPassphrase,
  );
};

/**
 * Mint an NFT to a recipient address with a payment of 1 XLM
 * @param contractId - The NFT contract address or ID
 * @param recipientAddress - Address to receive the minted NFT
 * @param signerAddress - Address of the account signing the transaction (any user can mint)
 * @param customNetworkPassphrase - Network passphrase for transaction building
 * @returns Transaction hash
 */
export const mintNFT = async (
  contractId: string,
  recipientAddress: string,
  signerAddress: string,
  customNetworkPassphrase?: string,
): Promise<string> => {
  if (!isValidAddress(recipientAddress)) {
    throw new Error(`Invalid recipient address: ${recipientAddress}`);
  }

  const rpc = getSorobanRpc();
  const contract = getContract(contractId);
  const passphrase = customNetworkPassphrase || networkPassphrase;

  // Get the current account to build the transaction
  let account;
  try {
    const horizonServer = new Horizon.Server(horizonUrl);
    account = await horizonServer.loadAccount(signerAddress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("not found") || errorMessage.includes("does not exist") || errorMessage.includes("404")) {
      const networkName = passphrase.includes("Test") ? "TESTNET" : passphrase.includes("Public") ? "MAINNET" : "UNKNOWN";
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
  const contractCall = contract.call(
    "mint",
    addressToScVal(recipientAddress),
  );

  // Note: Payment is now handled within the contract itself.
  // The contract's mint function automatically transfers 1 XLM from the recipient to the contract.
  // The recipient address must authorize the transaction (sign it) for the payment to work.

  // Build transaction with contract call
  const transaction = new TransactionBuilder(account, {
    fee: "100",
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
      : "Unknown simulation error";
    throw new Error(
      `Simulation error for mint function: ${errorDetails}. ` +
      `This might indicate the function doesn't exist, has wrong arguments, or the contract isn't deployed.`
    );
  }

  if (!simulation.result) {
    throw new Error(
      `Simulation returned no result for mint function. ` +
      `The contract might not exist or the function signature might be incorrect.`
    );
  }

  // Prepare the transaction
  const preparedTransaction = await rpc.prepareTransaction(transaction);

  // Sign the transaction using the wallet kit
  const signedTransactionResult = await wallet.signTransaction(
    preparedTransaction.toXDR(),
    {
      networkPassphrase: passphrase || Networks.TESTNET,
      address: signerAddress,
    },
  );

  // Handle the signed transaction result
  let signedTxXdrString: string;
  
  if (typeof signedTransactionResult === 'string') {
    signedTxXdrString = signedTransactionResult;
  } else if (signedTransactionResult && typeof signedTransactionResult === 'object') {
    if ('signedTxXdr' in signedTransactionResult && typeof signedTransactionResult.signedTxXdr === 'string') {
      signedTxXdrString = signedTransactionResult.signedTxXdr;
    } else if ('xdr' in signedTransactionResult && typeof signedTransactionResult.xdr === 'string') {
      signedTxXdrString = signedTransactionResult.xdr;
    } else if ('signedXdr' in signedTransactionResult && typeof signedTransactionResult.signedXdr === 'string') {
      signedTxXdrString = signedTransactionResult.signedXdr;
    } else if ('toXDR' in signedTransactionResult && typeof signedTransactionResult.toXDR === 'function') {
      signedTxXdrString = signedTransactionResult.toXDR();
    } else {
      console.error("[Soroban] Unexpected signTransaction result format:", signedTransactionResult);
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
    signedTx = TransactionBuilder.fromXDR(signedTxXdrString, passphrase || Networks.TESTNET);
  } catch (parseError) {
    const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
    console.error("[Soroban] Failed to parse signed transaction XDR:", errorMessage);
    
    if (passphrase && passphrase !== Networks.TESTNET) {
      try {
        signedTx = TransactionBuilder.fromXDR(signedTxXdrString, Networks.TESTNET);
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

  // Send the transaction
  const sendResponse = await rpc.sendTransaction(signedTx);

  if (sendResponse.status === "ERROR") {
    throw new Error(`Transaction failed: ${sendResponse.errorResult?.toString()}`);
  }

  // Wait for the transaction to complete
  const getTxResponse = await rpc.getTransaction(sendResponse.hash);

  if (getTxResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
    throw new Error(
      `Transaction failed: ${getTxResponse.resultXdr?.toString()}`,
    );
  }

  return sendResponse.hash;
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
  args: any[] = [],
): Promise<any> => {
  return readContract(contractId, functionName, args);
};

/**
 * Get the collection name
 * @param contractId - The NFT contract address or ID
 * @returns The collection name as a string
 */
export const getNFTName = async (contractId: string): Promise<string> => {
  return readNFTContract(contractId, "name", []);
};

/**
 * Get the collection symbol
 * @param contractId - The NFT contract address or ID
 * @returns The collection symbol as a string
 */
export const getNFTSymbol = async (contractId: string): Promise<string> => {
  return readNFTContract(contractId, "symbol", []);
};

/**
 * Get the total supply of minted NFTs
 * @param contractId - The NFT contract address or ID
 * @returns The total supply as a number
 */
export const getNFTTotalSupply = async (contractId: string): Promise<number> => {
  const result = await readNFTContract(contractId, "total_supply", []);
  // Ensure we return a number (result might be a string or other type)
  return typeof result === "number" ? result : Number(result);
};
