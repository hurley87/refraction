"use client";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { MinusIcon, PlusIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  PublicClient,
} from "viem";
import { createCollectorClient } from "@zoralabs/protocol-sdk";
import { base } from "viem/chains";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "./ui/toast";
import Link from "next/link";

export const Mint = () => {
  const { user, login, linkEmail } = usePrivy();
  const minterAccount = user?.wallet?.address as `0x${string}`;
  const tokenContract =
    "0xec6f57cb913cdb21ed021d22ad2f47e67e59ac09" as `0x${string}`;
  const [mintComment, setMintComment] = useState("");
  const [quantityToMint, setQuantityToMint] = useState(1);
  const [isMinting, setIsMinting] = useState(false);
  const mintReferral =
    "0xbD78783a26252bAf756e22f0DE764dfDcDa7733c" as `0x${string}`;
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  }) as PublicClient;
  const collectorClient = createCollectorClient({
    chainId: base.id,
    publicClient,
  });
  const mintType = "1155" as const;
  const { wallets } = useWallets();
  const wallet = wallets.find(
    (wallet) => (wallet.address as `0x${string}`) === minterAccount
  );
  const chain = base;
  const chainId = wallet?.chainId.split(":")[1];
  const { toast } = useToast();

  const handleMint = async () => {
    setIsMinting(true);

    const mintParams = {
      tokenContract,
      mintType,
      tokenId: 1,
      mintReferral,
      mintComment,
      quantityToMint,
      minterAccount,
    };

    try {
      const { parameters } = await collectorClient.mint(mintParams);
      const ethereumProvider = (await wallet?.getEthereumProvider()) as any;

      const walletClient = await createWalletClient({
        account: minterAccount,
        chain,
        transport: custom(ethereumProvider),
      });

      const hash = await walletClient.writeContract(parameters);

      await publicClient.waitForTransactionReceipt({
        hash,
      });

      toast({
        title: "Minted!",
        description: "View transaction",
        action: (
          <Link target="_blank" href={`https://basescan.org/tx/${hash}`}>
            <ToastAction altText="Goto schedule to undo">View</ToastAction>
          </Link>
        ),
      });

      setIsMinting(false);
      setMintComment("");
      setQuantityToMint(1);
    } catch (error) {
      console.error("Error minting:", error);
      toast({
        title: "Error",
        description: "Error minting",
        variant: "destructive",
      });
      setIsMinting(false);
      return;
    }
  };

  if (user?.email) {
    return (
      <div className="flex flex-col gap-12">
        <div>
          <Dialog>
            <DialogTrigger>
              <div className="bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-2 rounded-md">
                Claim Your Free Mint
              </div>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Refracting Culture IRL</DialogTitle>
                <DialogDescription>
                  <img
                    src="/nft.jpg"
                    alt="Refracting Culture IRL"
                    className="w-full"
                  />
                </DialogDescription>
                <DialogFooter>
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex items-center justify-center gap-6 max-w-64 mx-auto">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full"
                        onClick={() => {
                          if (quantityToMint !== 1) {
                            setQuantityToMint(quantityToMint - 1);
                          }
                        }}
                      >
                        <MinusIcon className="h-4 w-4" />
                        <span className="sr-only">Decrease</span>
                      </Button>
                      <div className="flex-1 text-center">
                        <div className="text-4xl font-bold tracking-tighter">
                          {quantityToMint}
                        </div>
                        <div className="text-xs uppercase text-muted-foreground">
                          {0.000111 * quantityToMint} ETH
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full"
                        onClick={() => setQuantityToMint(quantityToMint + 1)}
                        disabled={quantityToMint >= 400}
                      >
                        <PlusIcon className="h-4 w-4" />
                        <span className="sr-only">Increase</span>
                      </Button>
                    </div>
                    <Input
                      value={mintComment}
                      onChange={(e) => setMintComment(e.target.value)}
                      type="text"
                      placeholder="Comment"
                    />
                    {chainId !== "8453" ? (
                      <Button
                        size="lg"
                        className="bg-yellow-500 hover:bg-yellow-400 text-black"
                        onClick={() => wallet?.switchChain(8453)}
                      >
                        Switch Network
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        className="bg-yellow-500 hover:bg-yellow-400 text-black"
                        onClick={handleMint}
                      >
                        {isMinting ? "Minting..." : "Mint"}
                      </Button>
                    )}
                  </div>
                </DialogFooter>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-xs md:text-sm italic">
          You did it! We’ll send you details soon! You can now mint this
          commemorative artwork on Zora.
        </p>
      </div>
    );
  }

  if (user && !user.email) {
    return (
      <div className="flex flex-col gap-12">
        <div>
          <Button
            className="bg-yellow-500 hover:bg-yellow-400 text-black"
            size="lg"
            onClick={linkEmail}
          >
            Link Email
          </Button>
        </div>
        <p className="text-xs md:text-sm italic">
          Claim your free commemorative mint and take an early spot in line for
          the release.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      <div>
        <Button
          className="bg-yellow-500 hover:bg-yellow-400 text-black"
          size="lg"
          onClick={login}
        >
          Connect Wallet
        </Button>
      </div>
      <p className="text-xs md:text-sm italic">
        Claim your free commemorative mint and take an early spot in line for
        the release.
      </p>
    </div>
  );
};
