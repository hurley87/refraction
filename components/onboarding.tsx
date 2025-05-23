"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { publicClient, irlChain } from "@/lib/publicClient";
import {
  userManagerABI,
  userManagerAddress,
} from "@/lib/contracts/UserManager";
import { createWalletClient, custom } from "viem";

const usernameSchema = z
  .string()
  .min(1, "Username is required")
  .regex(/^[a-zA-Z0-9_]+$/, "Invalid username");

export default function Onboarding() {
  const { user, login, logout } = usePrivy();
  const { wallets } = useWallets();

  console.log("user", user);
  console.log("wallets", wallets);

  // Get the primary wallet address
  const address = (user?.wallet?.address || wallets[0]?.address) as
    | `0x${string}`
    | undefined;
  console.log("address:", address);

  // Find the wallet object
  const wallet = wallets.find((w) => w.address === address) || wallets[0];
  console.log("wallet:", wallet);

  // Parse chain ID safely
  const walletChainId = wallet?.chainId?.split(":")[1];
  console.log("walletChainId:", walletChainId);

  const [usernameInput, setUsernameInput] = useState("");
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    const fetchUsername = async () => {
      try {
        // Step 1: Get the user ID from address
        const userId = await publicClient.readContract({
          address: userManagerAddress,
          abi: userManagerABI,
          functionName: "addressToId",
          args: [address],
        });

        console.log("userId", userId);

        // Check if userId is 0 (no user registered for this address)
        if (!userId || userId === BigInt(0)) {
          console.log("No user ID found for address");
          return;
        }

        // Step 2: Get the username using the user ID
        const name = await publicClient.readContract({
          address: userManagerAddress,
          abi: userManagerABI,
          functionName: "getName",
          args: [userId],
        });

        console.log("name", name);

        if (name && typeof name === "string" && name.length > 0) {
          setCurrentUsername(name);
        }
      } catch (err) {
        console.error("Error fetching username", err);
      }
    };
    fetchUsername();
  }, [address]);

  const handleCreate = async () => {
    const parse = usernameSchema.safeParse(usernameInput);
    if (!parse.success) {
      toast.error(parse.error.errors[0].message);
      return;
    }

    if (!address || !wallet) {
      login();
      return;
    }

    try {
      setIsLoading(true);

      console.log("walletChainId", walletChainId);
      console.log("irlChain.id", irlChain.id);
      console.log("wallet", wallet);

      // Ensure we're on the correct chain before proceeding
      if (walletChainId !== irlChain.id.toString()) {
        await wallet.switchChain(irlChain.id);
        toast.info("Switching to IRL chain...");
        // Wait a bit for the chain switch to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const provider = (await wallet.getEthereumProvider()) as any;
      const walletClient = await createWalletClient({
        account: address,
        chain: irlChain,
        transport: custom(provider),
      });

      const { request } = await publicClient.simulateContract({
        address: userManagerAddress,
        abi: userManagerABI,
        functionName: "createUser",
        args: [usernameInput],
        account: address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      toast.success("Username created");
      setCurrentUsername(usernameInput);
    } catch (err) {
      console.error("Error creating username", err);
      toast.error("Failed to create username");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChainSwitch = async () => {
    if (!wallet) {
      toast.error("No wallet connected");
      return;
    }

    try {
      await wallet.switchChain(irlChain.id);
      toast.success("Switched to IRL chain");
    } catch (err) {
      console.error("Error switching chain:", err);
      toast.error(
        "Failed to switch chain. Please switch manually in your wallet."
      );
    }
  };

  if (!user) {
    return (
      <div className="p-6 flex justify-center">
        <Button onClick={login}>Connect Wallet</Button>
      </div>
    );
  }

  if (currentUsername) {
    return (
      <div className="p-6 flex flex-col gap-4 items-center">
        <p className="text-xl text-[#6101FF]">Your username</p>
        <p className="text-2xl font-bold">{currentUsername}</p>
      </div>
    );
  }

  console.log("wallet", wallet);

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6 bg-[#DBDFF2]/50 p-4 sm:p-8 rounded-lg max-w-[600px] font-sans mx-auto">
        <div className="grid w-full items-center gap-1.5">
          <Label className="text-[#6101FF]">Username</Label>
          <Input
            className="bg-[#E9E7FF]"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
          />
        </div>
        {wallet ? (
          walletChainId === irlChain.id.toString() ? (
            <Button
              className="bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-900 inline-block text-transparent bg-clip-text uppercase bg-[#FFFFFF]] hover:bg-[#DDDDDD]/90 sm:w-auto"
              disabled={isLoading}
              onClick={handleCreate}
            >
              {isLoading ? "Creating..." : "Create Username"}
            </Button>
          ) : (
            <Button
              className="bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-900 inline-block text-transparent bg-clip-text uppercase bg-[#FFFFFF]] hover:bg-[#DDDDDD]/90 sm:w-auto"
              onClick={handleChainSwitch}
            >
              Switch to IRL
            </Button>
          )
        ) : (
          <Button
            className="bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-900 inline-block text-transparent bg-clip-text uppercase bg-[#FFFFFF]] hover:bg-[#DDDDDD]/90 sm:w-auto"
            onClick={login}
          >
            Connect Wallet
          </Button>
        )}
        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}
