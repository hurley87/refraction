"use client";

import { useState, useEffect } from "react";

interface ProfileAvatarProps {
  profilePictureUrl?: string;
  name?: string;
  username?: string;
  twitterHandle?: string;
  size?: number;
}

export default function ProfileAvatar({
  profilePictureUrl,
  name,
  username,
  twitterHandle,
  size = 64,
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [twitterImageUrl, setTwitterImageUrl] = useState<string | null>(null);
  const [twitterImageError, setTwitterImageError] = useState(false);

  const displayName = name || username;
  const initial = displayName?.charAt(0).toUpperCase() || "?";
  
  // Calculate initial size as 75% of the circle size
  const initialSize = size * 0.75;

  // Fetch Twitter profile picture if profilePictureUrl is not set and twitterHandle exists
  useEffect(() => {
    if (!profilePictureUrl && twitterHandle && !twitterImageError) {
      const cleanHandle = twitterHandle.replace(/^@/, "");
      // Use unavatar.io service to fetch Twitter profile picture
      const twitterUrl = `https://unavatar.io/twitter/${cleanHandle}`;
      
      // Preload the image to check if it exists
      const img = new Image();
      img.onload = () => {
        setTwitterImageUrl(twitterUrl);
      };
      img.onerror = () => {
        console.log("[ProfileAvatar] Twitter image not available for:", cleanHandle);
        setTwitterImageError(true);
      };
      img.src = twitterUrl;
    }
  }, [profilePictureUrl, twitterHandle, twitterImageError]);

  // Determine which image URL to use
  const imageUrl = profilePictureUrl || twitterImageUrl;
  const showImage = imageUrl && !imageError && !(twitterImageUrl && twitterImageError);

  return (
    <div
      className="rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt="Profile"
          className="w-full h-full object-cover"
          width={size}
          height={size}
          onError={() => {
            console.error("[ProfileAvatar] Image failed to load:", {
              url: imageUrl,
              source: profilePictureUrl ? "profile" : "twitter",
            });
            setImageError(true);
            if (twitterImageUrl) {
              setTwitterImageError(true);
            }
          }}
          onLoad={() => {
            console.log("[ProfileAvatar] Image loaded successfully:", {
              url: imageUrl,
              source: profilePictureUrl ? "profile" : "twitter",
            });
          }}
        />
      ) : (
        <div className="w-full h-full rounded-full bg-gray-300 flex items-center justify-center">
          <span
            className="text-gray-600 font-medium"
            style={{ fontSize: `${initialSize}px` }}
          >
            {initial}
          </span>
        </div>
      )}
    </div>
  );
}

