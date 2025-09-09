import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { createCoin, CreateConstants } from "@zoralabs/coins-sdk";
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// No need to set API key on server since metadata is created on frontend

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      place_id,
      display_name,
      name,
      lat,
      lon,
      type,
      coinName,
      coinSymbol,
      coinImageUrl,
      userWalletAddress,
      username,
      metadata,
    } = body;

    // Validate required fields
    if (
      !place_id ||
      !display_name ||
      !name ||
      !lat ||
      !lon ||
      !coinName ||
      !coinSymbol ||
      !metadata
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Get server wallet private key from environment
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json(
        { error: "Server wallet not configured" },
        { status: 500 },
      );
    }

    // Create server wallet account
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Create wallet and public clients
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(
        process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC,
      ),
    });

    const publicClient = createPublicClient({
      chain: base,
      transport: http(
        process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC,
      ),
    });

    // Use metadata created on frontend
    console.log("Using metadata from frontend:", metadata);

    // Create the coin using server wallet
    const coinCreationArgs = {
      creator: account.address,
      name: coinName,
      symbol: coinSymbol,
      metadata: metadata,
      currency: CreateConstants.ContentCoinCurrencies.CREATOR_COIN,
      chainId: base.id,
      startingMarketCap: CreateConstants.StartingMarketCaps.LOW,
      platformReferrerAddress:
        "0x1d15241ac2bb3e426e2379234d6cbc545b4bfb67" as `0x${string}`,
    };

    console.log("Creating coin with server wallet:", account.address);

    const result = await createCoin({
      call: coinCreationArgs,
      walletClient,
      publicClient,
    });

    if (!result.address) {
      throw new Error("Failed to create coin - no address returned");
    }

    console.log("Coin created:", result.address, "TX:", result.hash);

    // Save location to database
    const { data: locationData, error: locationError } = await supabase
      .from("locations")
      .insert({
        place_id,
        display_name,
        name,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        type: type || "location",
        points_value: 100,
        coin_address: result.address,
        coin_transaction_hash: result.hash,
        coin_symbol: coinSymbol,
        coin_name: coinName,
        coin_image_url: coinImageUrl,
        creator_wallet_address: userWalletAddress,
        creator_username: username,
        context: JSON.stringify({
          coinAddress: result.address,
          coinMetadata: metadata,
          transactionHash: result.hash,
          coinImageUrl,
          createdByServer: true,
        }),
      })
      .select()
      .single();

    if (locationError) {
      console.error("Database error:", locationError);
      throw locationError;
    }

    return NextResponse.json({
      success: true,
      location: locationData,
      coin: {
        address: result.address,
        transactionHash: result.hash,
        deployment: result.deployment,
      },
    });
  } catch (error) {
    console.error("Create location with coin API error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to create location with coin: " + (error as Error).message,
      },
      { status: 500 },
    );
  }
}

// Update location with coin information after coin is created
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { locationId, coinAddress, coinTransactionHash } = body;

    if (!locationId || !coinAddress) {
      return NextResponse.json(
        { error: "Location ID and coin address are required" },
        { status: 400 },
      );
    }

    // Update location with coin information
    const { supabase } = await import("@/lib/supabase");

    const { data, error } = await supabase
      .from("locations")
      .update({
        coin_address: coinAddress,
        coin_transaction_hash: coinTransactionHash,
      })
      .eq("id", locationId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      location: data,
    });
  } catch (error) {
    console.error("Update location coin API error:", error);
    return NextResponse.json(
      { error: "Failed to update location with coin information" },
      { status: 500 },
    );
  }
}
