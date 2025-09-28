"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { X, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserProfile } from "@/lib/supabase";
import { toast } from "sonner";

// Reusable Pencil Icon Component
const PencilIcon = ({
  onClick,
  className = "",
  isLoading = false,
}: {
  onClick: () => void;
  className?: string;
  isLoading?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className={`w-6 h-6 ${isLoading ? "bg-blue-500" : "bg-[#ededed] hover:bg-gray-300"} text-black rounded-full flex items-center justify-center transition-colors shadow-sm ${className}`}
    aria-label="Edit"
  >
    {isLoading ? (
      <div className="flex space-x-0.5">
        <div
          className="w-1 h-1 bg-white rounded-full animate-bounce"
          style={{ animationDelay: "0ms" }}
        ></div>
        <div
          className="w-1 h-1 bg-white rounded-full animate-bounce"
          style={{ animationDelay: "150ms" }}
        ></div>
        <div
          className="w-1 h-1 bg-white rounded-full animate-bounce"
          style={{ animationDelay: "300ms" }}
        ></div>
      </div>
    ) : (
      <svg
        className="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 22h18"
          opacity="0.3"
        />
      </svg>
    )}
  </button>
);

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileMenu({ isOpen, onClose }: ProfileMenuProps) {
  const { user, logout } = usePrivy();
  const [profile, setProfile] = useState<UserProfile>({
    wallet_address: "",
    email: "",
    name: "",
    username: "",
    website: "",
    twitter_handle: "",
    towns_handle: "",
    farcaster_handle: "",
    telegram_handle: "",
    profile_picture_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [website_link] = useState(false);

  // Handle menu open/close with transitions
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setIsMenuMounted(true);
      setTimeout(() => setIsMenuVisible(true), 10);
    } else {
      document.body.style.overflow = "";
      setIsMenuVisible(false);
      const timer = setTimeout(() => setIsMenuMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchProfile = useCallback(async () => {
    if (!user?.wallet?.address) return;

    try {
      const response = await fetch(
        `/api/profile?wallet_address=${user.wallet.address}`,
      );
      const data = await response.json();

      setProfile({
        wallet_address: user.wallet.address,
        email: data.email || user.email?.address || "",
        name: data.name || "",
        username: data.username || "",
        website: data.website || "",
        twitter_handle: data.twitter_handle || "",
        towns_handle: data.towns_handle || "",
        farcaster_handle: data.farcaster_handle || "",
        telegram_handle: data.telegram_handle || "",
        profile_picture_url: data.profile_picture_url || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  }, [user?.wallet?.address, user?.email?.address]);

  // Fetch user profile on mount
  useEffect(() => {
    if (user?.wallet?.address && isOpen) {
      fetchProfile();
    }
  }, [user?.wallet?.address, isOpen, fetchProfile]);

  const handleSave = async () => {
    if (!user?.wallet?.address) return;

    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...profile,
          wallet_address: user.wallet.address,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      const result = await response.json();

      // Show success feedback with points info
      let successMessage = "Profile updated successfully";
      if (result.pointsAwarded && result.pointsAwarded.length > 0) {
        const totalPoints = result.pointsAwarded.length * 5;
        successMessage += ` - Earned ${totalPoints} points!`;
      }

      toast.success(successMessage);
    } catch (error) {
      console.error("Error saving profile:", error);
      // Show error feedback
      toast.error("Error saving profile");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!user || !isMenuMounted) return null;

  return (
    <div
      className={`fixed font-inktrap inset-0 bg-[#ededed] z-50 flex flex-col transition-all duration-300 ease-in-out ${
        isMenuVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="max-w-lg mx-auto w-full flex flex-col h-full">
        {/* Close Button - Full Width Overlay */}
        <div className="w-full p-4">
          <div className="bg-white rounded-3xl">
            <button
              onClick={onClose}
              className="w-full text-black h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
              aria-label="Close menu"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col justify-start px-4 pb-4 gap-2 min-h-0">
          <div className="w-full bg-white overflow-y-auto rounded-3xl border border-gray-200 p-4 flex-1">
            {/* Header */}
            <div className="w-full sm:max-w-sm">
              <div className="text-black body-small uppercase">PROFILE</div>
            </div>

            {/* Avatar Section */}
            <div className="w-full sm:max-w-sm flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {profile.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 text-2xl font-medium">
                        {profile.name
                          ? profile.name.charAt(0).toUpperCase()
                          : "?"}
                      </span>
                    </div>
                  )}
                </div>
                <PencilIcon
                  onClick={() => {
                    // TODO: Implement image upload functionality
                    toast.info("Image upload coming soon!");
                  }}
                  className="absolute -bottom-1 -right-1 w-8 h-8"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="w-full sm:max-w-sm space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-black body-small uppercase"
                >
                  EMAIL
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@gmail.com"
                    value={profile.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="bg-white border-gray-300 text-black placeholder:text-gray-500 body-large rounded-full px-4 h-10 flex-1"
                  />
                  <PencilIcon onClick={handleSave} isLoading={saving} />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-black body-small uppercase"
                >
                  NAME
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={profile.username}
                    onChange={(e) =>
                      handleInputChange("username", e.target.value)
                    }
                    className="bg-white border-gray-300 text-black placeholder:text-gray-500 body-large rounded-full px-4 h-10 flex-1"
                  />
                  <PencilIcon onClick={handleSave} isLoading={saving} />
                </div>
              </div>

              {/* Earn More Section */}
              <div className="bg-[#ededed] rounded-lg p-4 my-6">
                <p className="text-black uppercase font-bold body-small">
                  EARN MORE
                </p>
                <p className="text-black  body-small">
                  Add Social Handles
                  <br />
                  and receive points
                </p>
              </div>

              {/* Social Handles */}
              <div className="space-y-4">
                {/* Website */}
                {website_link && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="website"
                      className="text-black body-small uppercase"
                    >
                      WEBSITE
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="website"
                        type="text"
                        placeholder="www.yourwebsite.com"
                        value={profile.website || "www."}
                        onChange={(e) =>
                          handleInputChange("website", e.target.value)
                        }
                        className="bg-white border-gray-300 text-black placeholder:text-gray-500 body-large rounded-full px-4 h-10 flex-1"
                      />
                      <PencilIcon onClick={handleSave} isLoading={saving} />
                    </div>
                  </div>
                )}

                {/* X (Twitter) */}
                <div className="space-y-2">
                  <Label
                    htmlFor="twitter"
                    className="text-black body-small uppercase"
                  >
                    X
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="twitter"
                      type="text"
                      placeholder="Your X handle"
                      value={profile.twitter_handle}
                      onChange={(e) =>
                        handleInputChange("twitter_handle", e.target.value)
                      }
                      className="bg-white border-gray-300 text-black placeholder:text-gray-500 body-large rounded-full px-4 h-10 flex-1"
                    />
                    <PencilIcon onClick={handleSave} isLoading={saving} />
                  </div>
                </div>

                {/* Towns */}
                <div className="space-y-2">
                  <Label
                    htmlFor="towns"
                    className="text-black body-small uppercase"
                  >
                    TOWNS
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="towns"
                      type="text"
                      placeholder="Your Towns handle"
                      value={profile.towns_handle}
                      onChange={(e) =>
                        handleInputChange("towns_handle", e.target.value)
                      }
                      className="bg-white border-gray-300 text-black placeholder:text-gray-500 body-large rounded-full px-4 h-10 flex-1"
                    />
                    <PencilIcon onClick={handleSave} isLoading={saving} />
                  </div>
                </div>

                {/* Farcaster */}
                <div className="space-y-2">
                  <Label
                    htmlFor="farcaster"
                    className="text-black body-small uppercase"
                  >
                    FARCASTER
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="farcaster"
                      type="text"
                      placeholder="Your Farcaster handle"
                      value={profile.farcaster_handle}
                      onChange={(e) =>
                        handleInputChange("farcaster_handle", e.target.value)
                      }
                      className="bg-white border-gray-300 text-black placeholder:text-gray-500 body-large rounded-full px-4 h-10 flex-1"
                    />
                    <PencilIcon onClick={handleSave} isLoading={saving} />
                  </div>
                </div>

                {/* Telegram */}
                <div className="space-y-2">
                  <Label
                    htmlFor="telegram"
                    className="text-black body-small uppercase"
                  >
                    TELEGRAM
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="telegram"
                      type="text"
                      placeholder="Your Telegram handle"
                      value={profile.telegram_handle}
                      onChange={(e) =>
                        handleInputChange("telegram_handle", e.target.value)
                      }
                      className="bg-white border-gray-300 text-black placeholder:text-gray-500 body-large rounded-full px-4 h-10 flex-1"
                    />
                    <PencilIcon onClick={handleSave} isLoading={saving} />
                  </div>
                </div>
              </div>
            </div>

            {/* Log Out Button */}
            <div className="w-full sm:max-w-sm mt-8">
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full bg-[#313131] text-white hover:bg-gray-600 transition-colors flex items-center justify-between h-10 px-4 pl-4 pr-2 flex-shrink-0 self-stretch rounded-[100px]"
              >
                <h4>Log Out</h4>
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
