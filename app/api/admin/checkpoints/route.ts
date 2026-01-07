import { NextRequest, NextResponse } from "next/server";
import { listAllCheckpoints, createCheckpoint } from "@/lib/db/checkpoints";
import { createCheckpointRequestSchema } from "@/lib/schemas/api";
import { apiSuccess, apiError, apiValidationError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth";
import { supabase } from "@/lib/db/client";

// GET /api/admin/checkpoints - Get all checkpoints
export async function GET(request: NextRequest) {
  try {
    // Check admin permission
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 },
      );
    }

    const checkpoints = await listAllCheckpoints();
    return NextResponse.json({ checkpoints });
  } catch (error) {
    console.error("Error fetching checkpoints:", error);
    return NextResponse.json(
      { error: "Failed to fetch checkpoints" },
      { status: 500 },
    );
  }
}

// POST /api/admin/checkpoints - Create a new checkpoint
export async function POST(request: NextRequest) {
  try {
    // Check admin permission
    const adminCheck = await requireAdmin(request);
    if (!adminCheck.isValid) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 },
      );
    }

    const adminEmail = adminCheck.user?.email || undefined;
    const contentType = request.headers.get("content-type") || "";

    // Handle multipart/form-data (with image upload)
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("partner_image") as File | null;

      // Extract and validate form fields
      const name = formData.get("name") as string;
      const description = formData.get("description") as string | null;
      const chain_type = formData.get("chain_type") as string;
      const points_value = formData.get("points_value");
      const is_active = formData.get("is_active");

      // Normalize form data for Zod validation
      const formFields = {
        name: name || "",
        description: description || undefined,
        chain_type,
        points_value: points_value ? Number(points_value) : 100,
        is_active: is_active === "true" || String(is_active) === "true",
      };

      const validationResult =
        createCheckpointRequestSchema.safeParse(formFields);

      if (!validationResult.success) {
        return apiValidationError(validationResult.error);
      }

      // Generate checkpoint ID first (needed for storage path)
      const checkpointId = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
      let partnerImageUrl: string | null = null;

      // Upload image if provided
      if (file && file.size > 0) {
        // Validate file type
        const allowedTypes = [
          "image/png",
          "image/jpeg",
          "image/jpg",
          "image/webp",
        ];
        if (!allowedTypes.includes(file.type)) {
          return apiError(
            "Invalid file type. Only PNG, JPEG, and WebP images are allowed.",
            400,
          );
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          return apiError("File size exceeds 5MB limit.", 400);
        }

        // Get file extension
        const fileExt = file.name.split(".").pop() || "jpg";
        const filePath = `checkpoint-partners/${checkpointId}.${fileExt}`;

        // Upload to Supabase Storage
        const arrayBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(filePath, arrayBuffer, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          console.error("Supabase Storage upload error:", uploadError);
          return apiError(uploadError.message || "Failed to upload image", 500);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(filePath);

        partnerImageUrl = urlData.publicUrl;
      }

      // Create checkpoint with image URL
      const checkpoint = await createCheckpoint(
        {
          ...validationResult.data,
          partner_image_url: partnerImageUrl,
          created_by: adminEmail,
        },
        checkpointId,
      );

      const checkpointUrl = `/c/${checkpoint.id}`;

      return apiSuccess(
        { checkpoint, url: checkpointUrl },
        `Checkpoint created! URL: ${checkpointUrl}`,
      );
    } else {
      // Handle JSON (existing flow, no image)
      const body = await request.json();
      const validationResult = createCheckpointRequestSchema.safeParse(body);

      if (!validationResult.success) {
        return apiValidationError(validationResult.error);
      }

      const checkpoint = await createCheckpoint({
        ...validationResult.data,
        created_by: adminEmail,
      });

      const checkpointUrl = `/c/${checkpoint.id}`;

      return apiSuccess(
        { checkpoint, url: checkpointUrl },
        `Checkpoint created! URL: ${checkpointUrl}`,
      );
    }
  } catch (error) {
    console.error("Error creating checkpoint:", error);
    return apiError("Failed to create checkpoint", 500);
  }
}
