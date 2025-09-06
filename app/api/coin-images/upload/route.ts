import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const coinAddress = (formData.get("coinAddress") as string | null) || "";
    const walletAddress =
      (formData.get("walletAddress") as string | null) || "";

    if (!file || !coinAddress || !walletAddress) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const originalName = (file as any)?.name as string | undefined;
    const inferredExt = originalName?.includes(".")
      ? originalName.split(".").pop()
      : undefined;
    const mimeExt = file.type?.split("/")[1];
    const extension = (inferredExt || mimeExt || "png").toLowerCase();

    const fileName = `${walletAddress}/${coinAddress}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from("coin-images")
      .upload(fileName, buffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });

    if (error) {
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from("coin-images")
      .getPublicUrl(fileName);

    return NextResponse.json({ success: true, publicUrl: urlData.publicUrl });
  } catch (error) {
    console.error("Supabase image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 },
    );
  }
}
