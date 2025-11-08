import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";
<<<<<<< HEAD
=======
import { Readable } from "stream";
import { supabase } from "@/lib/supabase";

const pinata = new pinataSDK({
  pinataApiKey: process.env.PINATA_API_KEY!,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY!,
});
>>>>>>> 672e6be86dca1cb0384451091ebd80504fd36132

// Validate the incoming request body
const uploadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  base64Image: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let imageBuffer: Buffer;
    let fileName: string;
    let description: string;

    // Handle FormData (from interactive-map and admin perks) - upload to Supabase Storage
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided" },
          { status: 400 }
        );
      }

<<<<<<< HEAD
    // Convert base64 to buffer
    const base64Data = validatedData.base64Image.split(",")[1];
    const imageBuffer = Buffer.from(base64Data, "base64");
=======
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);
        return NextResponse.json(
          { success: false, error: uploadError.message || "Failed to upload to storage" },
          { status: 500 }
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return NextResponse.json({
        success: true,
        url: urlData.publicUrl,
      });
    } 
    // Handle JSON with base64 (legacy support)
    else {
      const body = await request.json();
      const validatedData = uploadSchema.parse(body);

      // Extract base64 data (handle both data:image/...;base64,xxx and plain base64)
      let base64Data = validatedData.base64Image;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }

      // Convert base64 to buffer
      try {
        imageBuffer = Buffer.from(base64Data, "base64");
      } catch (bufferError) {
        console.error("Buffer conversion error:", bufferError);
        return NextResponse.json(
          { success: false, error: "Invalid base64 image data" },
          { status: 400 }
        );
      }

      fileName = validatedData.name;
      description = validatedData.description;
    }

    if (imageBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "Empty image data" },
        { status: 400 }
      );
    }
>>>>>>> 672e6be86dca1cb0384451091ebd80504fd36132

    // Get file extension from base64 mime type
    const mimeType = validatedData.base64Image.split(";")[0].split(":")[1];
    const extension = mimeType.split("/")[1] || "png";

<<<<<<< HEAD
    // Generate unique filename
    const filename = `${Date.now()}-${validatedData.name.replace(/[^a-zA-Z0-9]/g, "-")}.${extension}`;
    const filepath = `location-images/${filename}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from("images")
      .upload(filepath, imageBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw error;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("images").getPublicUrl(filepath);

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      url: publicUrl, // for backward compatibility
=======
    // Upload to Pinata with stream
    let result;
    try {
      result = await pinata.pinFileToIPFS(stream, {
        pinataMetadata: {
          name: fileName,
        },
        pinataOptions: {
          cidVersion: 0,
        },
      });
    } catch (pinataError: any) {
      console.error("Pinata upload error:", pinataError);
      return NextResponse.json(
        { 
          success: false, 
          error: pinataError.message || "Failed to upload to Pinata IPFS" 
        },
        { status: 500 }
      );
    }

    // Convert IPFS URL to HTTP gateway URL
    const httpUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
    const ipfsUrl = `ipfs://${result.IpfsHash}`;

    // For FormData requests (interactive-map, admin perks), return simpler response with url field
    if (contentType.includes("multipart/form-data")) {
      return NextResponse.json({
        success: true,
        imageUrl: ipfsUrl,
        url: httpUrl, // This is what interactive-map expects
      });
    }

    // For JSON requests, create metadata and return full response
    const metadata = {
      name: fileName,
      description: description,
      image: ipfsUrl,
    };

    // Pin metadata
    let metadataResult;
    try {
      metadataResult = await pinata.pinJSONToIPFS(metadata, {
        pinataMetadata: {
          name: `${fileName}-metadata`,
        },
      });
    } catch (metadataError: any) {
      console.error("Metadata pin error:", metadataError);
      // Still return success with image URL even if metadata fails
      return NextResponse.json({
        success: true,
        imageUrl: ipfsUrl,
        url: httpUrl, // For backward compatibility
        metadataUrl: null,
        warning: "Image uploaded but metadata pin failed",
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: ipfsUrl,
      url: httpUrl, // For backward compatibility
      metadataUrl: `ipfs://${metadataResult.IpfsHash}`,
>>>>>>> 672e6be86dca1cb0384451091ebd80504fd36132
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    
    // Handle validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: `Validation error: ${error.errors.map((e: any) => e.message).join(", ")}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
<<<<<<< HEAD
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload image"
=======
      { 
        success: false, 
        error: error.message || "Failed to upload to IPFS" 
>>>>>>> 672e6be86dca1cb0384451091ebd80504fd36132
      },
      { status: 500 }
    );
  }
}
