import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { z } from "zod";

// Validate the incoming request body
const uploadSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  base64Image: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedData = uploadSchema.parse(body);

    // Convert base64 to buffer
    const base64Data = validatedData.base64Image.split(",")[1];
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Get file extension from base64 mime type
    const mimeType = validatedData.base64Image.split(";")[0].split(":")[1];
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
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to upload image"
      },
      { status: 500 }
    );
  }
}
