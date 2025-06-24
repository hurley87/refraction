import { NextRequest, NextResponse } from "next/server";
import {
  getUserProfile,
  createOrUpdateUserProfile,
  awardProfileFieldPoints,
  type UserProfile,
} from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet_address");

    console.log("walletAddress", walletAddress);

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const profile = await getUserProfile(walletAddress);

    console.log("profile", profile);

    if (!profile) {
      return NextResponse.json(
        {
          wallet_address: walletAddress,
          email: "",
          name: "",
          username: "",
          twitter_handle: "",
          towns_handle: "",
          farcaster_handle: "",
          telegram_handle: "",
          profile_picture_url: "",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(profile, { status: 200 });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { wallet_address, ...profileData } = body;

    if (!wallet_address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Validate social handles
    const validatedData: Partial<UserProfile> = {};

    if (profileData.email) validatedData.email = profileData.email.trim();
    if (profileData.name) validatedData.name = profileData.name.trim();
    if (profileData.username)
      validatedData.username = profileData.username.trim();

    // Social handles - remove @ symbols if present and validate
    if (profileData.twitter_handle) {
      validatedData.twitter_handle = profileData.twitter_handle
        .replace(/^@/, "")
        .trim();
    }
    if (profileData.towns_handle) {
      validatedData.towns_handle = profileData.towns_handle
        .replace(/^@/, "")
        .trim();
    }
    if (profileData.farcaster_handle) {
      validatedData.farcaster_handle = profileData.farcaster_handle
        .replace(/^@/, "")
        .trim();
    }
    if (profileData.telegram_handle) {
      validatedData.telegram_handle = profileData.telegram_handle
        .replace(/^@/, "")
        .trim();
    }
    if (profileData.profile_picture_url) {
      validatedData.profile_picture_url =
        profileData.profile_picture_url.trim();
    }

    // Get the current profile to compare what's new
    const currentProfile = await getUserProfile(wallet_address);

    const updatedProfile = await createOrUpdateUserProfile({
      wallet_address,
      ...validatedData,
    });

    // Award points for new fields that were filled out
    const profileFieldsMap = {
      email: "profile_field_email",
      name: "profile_field_name",
      username: "profile_field_username",
      twitter_handle: "profile_field_twitter",
      towns_handle: "profile_field_towns",
      farcaster_handle: "profile_field_farcaster",
      telegram_handle: "profile_field_telegram",
      profile_picture_url: "profile_field_picture",
    };

    const pointsAwarded: Array<{
      field: string;
      points: number;
      activity: any;
    }> = [];

    for (const [fieldName, activityType] of Object.entries(profileFieldsMap)) {
      const newValue = validatedData[fieldName as keyof typeof validatedData];
      const currentValue = currentProfile?.[fieldName as keyof UserProfile];

      // Award points if:
      // 1. New value exists and is not empty
      // 2. Current value was empty or null (first time filling)
      if (
        newValue &&
        newValue.trim() &&
        (!currentValue || !currentValue.trim())
      ) {
        const result = await awardProfileFieldPoints(
          wallet_address,
          activityType,
          newValue
        );

        if (result.success) {
          pointsAwarded.push({
            field: fieldName,
            points: 5,
            activity: result.activity,
          });
        }
      }
    }

    return NextResponse.json(
      {
        profile: updatedProfile,
        pointsAwarded,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
