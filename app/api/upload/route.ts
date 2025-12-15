import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { z } from "zod";

// Validate the incoming request body
const uploadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  base64Image: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // Handle FormData (from interactive-map and admin perks) - upload to Supabase Storage
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "No file provided" },
          { status: 400 },
        );
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from("images")
        .upload(filePath, arrayBuffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Supabase Storage upload error:", uploadError);
        return NextResponse.json(
          {
            success: false,
            error: uploadError.message || "Failed to upload to storage",
          },
          { status: 500 },
        );
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("images")
        .getPublicUrl(filePath);

      return NextResponse.json({
        success: true,
        url: urlData.publicUrl,
        imageUrl: urlData.publicUrl, // for backward compatibility
      });
    }
    // Handle JSON with base64 (for interactive-map location creation)
    else {
      const body = await request.json();
      const validatedData = uploadSchema.parse(body);

      // Extract base64 data (handle both data:image/...;base64,xxx and plain base64)
      let base64Data = validatedData.base64Image;
      if (base64Data.includes(",")) {
        base64Data = base64Data.split(",")[1];
      }

      // Convert base64 to buffer
      let imageBuffer: Buffer;
      try {
        imageBuffer = Buffer.from(base64Data, "base64");
      } catch (bufferError) {
        console.error("Buffer conversion error:", bufferError);
        return NextResponse.json(
          { success: false, error: "Invalid base64 image data" },
          { status: 400 },
        );
      }

      if (imageBuffer.length === 0) {
        return NextResponse.json(
          { success: false, error: "Empty image data" },
          { status: 400 },
        );
      }

      // Get file extension from base64 mime type
      // Handle both data URI format (data:image/...;base64,...) and plain base64
      let mimeType = "image/png"; // default fallback
      if (validatedData.base64Image.includes(":")) {
        // Has data URI prefix, extract mime type
        const mimeTypePart = validatedData.base64Image.split(";")[0];
        const extractedMimeType = mimeTypePart.split(":")[1];
        if (extractedMimeType) {
          mimeType = extractedMimeType;
        }
      }
      const extension = mimeType.split("/")[1] || "png";

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
      });
    }
  } catch (error: any) {
    console.error("Upload error:", error);

    // Handle validation errors
    if (error.name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: `Validation error: ${error.errors.map((e: any) => e.message).join(", ")}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to upload image",
      },
      { status: 500 },
    );
  }
}
