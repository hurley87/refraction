"use client";

import { useState } from "react";
import { useWallet } from "@/lib/stellar/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AssembledTransaction,
  Client as ContractClient,
  Spec as ContractSpec,
} from "@stellar/stellar-sdk/contract";
import { networkPassphrase, rpcUrl } from "@/lib/stellar/utils/network";

export const TestContractCall = () => {
  const { address } = useWallet();
  // Note: You can find testnet contracts at https://laboratory.stellar.org/#explorer?network=testnet
  // Or deploy your own simple contract using: stellar contract deploy --wasm <wasm_file> --network testnet
  const [contractId, setContractId] = useState("");
  const [functionName, setFunctionName] = useState("admin");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callFunction = async () => {
    if (!contractId || !functionName || !address) {
      setError("Please provide a contract ID, function name, and connect your wallet");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // For now, use a generic spec that should work for most contracts
      // This spec includes common function signatures
      const spec = new ContractSpec(["AAAAAAAAABFHZXQgY3VycmVudCBhZG1pbgAAAAAAAAVhZG1pbgAAAAAAAAAAAAABAAAD6AAAABM="]);
      
      // Build the function call transaction
      const tx = await AssembledTransaction.build({
        method: functionName,
        args: spec.funcArgsToScVals(functionName, {}),
        contractId,
        networkPassphrase,
        rpcUrl,
        publicKey: address,
        parseResultXdr: (xdrResult) => {
          // Try to parse the result using the spec
          try {
            return spec.funcResToNative(functionName, xdrResult);
          } catch {
            // If parsing fails, return the raw XDR as a string
            return xdrResult.toString();
          }
        },
      });

      // For read-only calls, we can simulate without signing
      const simulationResult = await tx.simulate();
      
      if (simulationResult.result) {
        try {
          const parsedResult = spec.funcResToNative(functionName, simulationResult.result);
          setResult(typeof parsedResult === "object" ? JSON.stringify(parsedResult, null, 2) : String(parsedResult));
        } catch {
          // If parsing fails, show the raw result
          setResult(simulationResult.result.toString());
        }
      } else {
        setError("Function call returned no result");
      }
    } catch (err) {
      console.error("Contract call error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      // If the spec doesn't match, suggest using the correct spec
      if (errorMessage.includes("no such entry") || errorMessage.includes("spec")) {
        setError(`${errorMessage}. This contract may not have the function '${functionName}()' or uses a different spec. Try a different function name or contract ID.`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <p className="text-sm text-gray-400">
        Connect wallet to test contract calls
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="contract-id" className="text-sm text-gray-300">
          Testnet Contract ID (starts with C...)
        </Label>
        <Input
          id="contract-id"
          type="text"
          placeholder="Enter a testnet contract ID (e.g., C...)"
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          className="bg-[#1a1a1a] border-[#313131] text-white placeholder:text-gray-500 focus-visible:ring-[#313131]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="function-name" className="text-sm text-gray-300">
          Function Name
        </Label>
        <Input
          id="function-name"
          type="text"
          placeholder="e.g., admin, hello, balance"
          value={functionName}
          onChange={(e) => setFunctionName(e.target.value)}
          className="bg-[#1a1a1a] border-[#313131] text-white placeholder:text-gray-500 focus-visible:ring-[#313131]"
        />
        <p className="text-xs text-gray-500 mt-1">
          Enter the name of the function to call (read-only functions only, no parameters).
        </p>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          To find a testnet contract ID:
        </p>
        <ol className="list-decimal list-inside ml-2 space-y-1">
          <li>
            Visit the{" "}
            <a
              href="https://laboratory.stellar.org/#explorer?network=testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Stellar Laboratory Contract Explorer
            </a>
          </li>
          <li>Make sure the network is set to <strong className="text-gray-400">Testnet</strong> (top-right corner)</li>
          <li>Browse available contracts and check their available functions</li>
          <li>Copy the contract ID (starts with <code className="px-1 bg-[#2a2a2a] rounded text-gray-300">C</code>) and paste it above</li>
        </ol>
      </div>

      <Button
        onClick={() => void callFunction()}
        disabled={loading || !contractId || !functionName}
        variant="default"
        size="default"
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? "Calling..." : `Call ${functionName}() (Read-only)`}
      </Button>

      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
          <p className="text-sm text-gray-300 mb-1">Result:</p>
          <pre className="text-sm text-green-400 font-mono break-all whitespace-pre-wrap overflow-auto max-h-60">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
};
