"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { publicClient } from "@/lib/publicClient";
import { base } from "viem/chains";
import { createCreatorClient } from "@zoralabs/protocol-sdk";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { custom } from "viem";
import { createWalletClient } from "viem";

export default function CreateToken() {
  const { login, user } = usePrivy();
  const address = user?.wallet?.address;
  const [imageName, setImageName] = useState("");
  const [imageDescription, setImageDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [selectedEventAddress, setSelectedEventAddress] = useState<string>("");
  const { wallets } = useWallets();
  const wallet = wallets.find(
    (wallet) => (wallet.address as `0x${string}`) === address
  );
  const walletChainId = wallet?.chainId.split(":")[1];

  const events = [
    {
      name: "Graham Event",
      contractAddress: "0x54cb61509acc4c5e977d46628e05bbb724638d36",
    },
    {
      name: "Dave Event",
      contractAddress: "0xa31b79656b4fa6c03e36f44dae2071fa7d7c5650",
    },
  ];

  const chainId = base.id;
  const creatorClient = createCreatorClient({ chainId, publicClient });

  const addImageToken = async () => {
    try {
      setIsUpdatingToken(true);

      if (!imageFile) {
        toast.error("Please select an image file");
        return;
      }

      if (!selectedEventAddress) {
        toast.error("Please select an event");
        return;
      }

      // Convert file to base64
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: imageName,
          description: imageDescription,
          base64Image,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to upload");
      }

      toast.success("Successfully uploaded to IPFS!");
      console.log("IPFS URL: ", data.metadataUrl);

      const tokenMetadataURI = data.metadataUrl;

      const ethereumProvider = (await wallet?.getEthereumProvider()) as any;

      const walletClient = await createWalletClient({
        account: address as `0x${string}`,
        chain: base,
        transport: custom(ethereumProvider),
      });

      const { parameters } = await creatorClient.create1155OnExistingContract({
        contractAddress: selectedEventAddress as `0x${string}`,
        token: {
          tokenMetadataURI,
        },
        account: address as `0x${string}`,
      });

      // simulate the transaction
      const { request } = await publicClient.simulateContract(parameters);

      // execute the transaction
      const hash = await walletClient.writeContract(request);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log("receipt", receipt);

      toast.success("Successfully created token!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const switchNetwork = async () => {
    try {
      await wallet?.switchChain(8453);
    } catch (error) {
      console.error("Error switching network:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-6 bg-[#DBDFF2]/50 p-4 sm:p-8 rounded-lg max-w-[600px] font-sans mx-auto">
        <div className="grid w-full items-center gap-1.5">
          <Select
            value={selectedEventAddress}
            onValueChange={setSelectedEventAddress}
          >
            <SelectTrigger className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-[#E9E7FF] py-1.5 pl-3 pr-8 text-base outline outline-1 -outline-offset-1 outline-gray-300 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6 text-[#6101FF] border border-black">
              <SelectValue placeholder="Select an event" className="" />
            </SelectTrigger>
            <SelectContent className="bg-[#E9E7FF] text-[#6101FF] ">
              {events.map((event) => (
                <SelectItem
                  key={event.contractAddress}
                  value={event.contractAddress}
                >
                  {event.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label className="text-[#6101FF]">Name</Label>
          <Input
            className="bg-[#E9E7FF]"
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
          />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label className="text-[#6101FF]">Description</Label>
          <Input
            className="bg-[#E9E7FF]"
            value={imageDescription}
            onChange={(e) => setImageDescription(e.target.value)}
          />
        </div>
        <div className="grid w-full max-w-sm items-center gap-1.5 ">
          <Label className="text-[#6101FF]" htmlFor="picture">
            File
          </Label>
          <Input
            onChange={(e) => {
              if (e.target.files) {
                setImageFile(e.target.files[0]);
              }
            }}
            id="picture"
            type="file"
            className="bg-[#E9E7FF] text-[#6101FF]"
          />
          <p className="text-xs italic text-[#6101FF]">
            1:1 ratio is recommended
          </p>
        </div>
        <div>
          {wallet ? (
            <>
              {walletChainId === base.id.toString() ? (
                <Button
                  className="bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-900 inline-block text-transparent bg-clip-text uppercase bg-[#FFFFFF]] hover:bg-[#DDDDDD]/90 sm:w-auto"
                  disabled={isUpdatingToken}
                  onClick={addImageToken}
                >
                  {isUpdatingToken ? "Creating ..." : "Create"}
                </Button>
              ) : (
                <Button
                  className="bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-900 inline-block text-transparent bg-clip-text uppercase bg-[#FFFFFF]] hover:bg-[#DDDDDD]/90  sm:w-auto"
                  onClick={switchNetwork}
                >
                  Switch to Base
                </Button>
              )}
            </>
          ) : (
            <Button
              className="bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-900 inline-block text-transparent bg-clip-text uppercase bg-[#FFFFFF]] hover:bg-[#DDDDDD]/90  sm:w-auto"
              onClick={login}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
