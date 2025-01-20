import { NextResponse } from "next/server";
import pinataSDK from "@pinata/sdk";
import { z } from "zod";
import { Readable } from "stream";

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY!,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY!,
});

// Validate the incoming request body
const uploadSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  base64Image: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = uploadSchema.parse(body);

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(
      validatedData.base64Image.split(",")[1],
      "base64"
    );

    // Convert buffer to readable stream
    const stream = Readable.from(imageBuffer);

    // Upload to Pinata with stream
    const result = await pinata.pinFileToIPFS(stream, {
      pinataMetadata: {
        name: validatedData.name,
      },
      pinataOptions: {
        cidVersion: 0,
      },
    });

    // Create metadata JSON
    const metadata = {
      name: validatedData.name,
      description: validatedData.description,
      image: `ipfs://${result.IpfsHash}`,
    };

    // Pin metadata
    const metadataResult = await pinata.pinJSONToIPFS(metadata, {
      pinataMetadata: {
        name: `${validatedData.name}-metadata`,
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: `ipfs://${result.IpfsHash}`,
      metadataUrl: `ipfs://${metadataResult.IpfsHash}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload to IPFS" },
      { status: 500 }
    );
  }
}
