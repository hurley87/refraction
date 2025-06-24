"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { X, LogOut, Edit3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserProfile } from "@/lib/supabase";
import { toast } from "sonner";

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
    twitter_handle: "",
    towns_handle: "",
    farcaster_handle: "",
    telegram_handle: "",
    profile_picture_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

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

  // Fetch user profile on mount
  useEffect(() => {
    if (user?.wallet?.address && isOpen) {
      fetchProfile();
    }
  }, [user?.wallet?.address, isOpen]);

  const fetchProfile = async () => {
    if (!user?.wallet?.address) return;

    try {
      const response = await fetch(
        `/api/profile?wallet_address=${user.wallet.address}`
      );
      const data = await response.json();

      setProfile({
        wallet_address: user.wallet.address,
        email: data.email || user.email?.address || "",
        name: data.name || "",
        username: data.username || "",
        twitter_handle: data.twitter_handle || "",
        towns_handle: data.towns_handle || "",
        farcaster_handle: data.farcaster_handle || "",
        telegram_handle: data.telegram_handle || "",
        profile_picture_url: data.profile_picture_url || "",
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

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
      className={`fixed inset-0 bg-white z-50 flex flex-col transition-all duration-300 ease-in-out ${
        isMenuVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4">
        <h1 className="text-black text-lg font-medium font-inktrap uppercase">
          PROFILE
        </h1>
        <button
          onClick={onClose}
          className="text-black p-2 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close menu"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-4 gap-6 overflow-y-auto">
        {/* Form Fields */}
        <div className="w-full max-w-sm space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label
              htmlFor="email"
              className="text-black text-sm font-inktrap uppercase"
            >
              EMAIL
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@gmail.com"
              value={profile.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="bg-white border-gray-300 text-black placeholder:text-gray-500 rounded-full px-4 py-3"
            />
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label
              htmlFor="name"
              className="text-black text-sm font-inktrap uppercase"
            >
              NAME
            </Label>
            <div className="relative">
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={profile.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="bg-white border-gray-300 text-black placeholder:text-gray-500 rounded-full px-4 py-3 pr-12"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600 disabled:opacity-50"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>

          {/* Earn More Section */}
          <div className="bg-yellow-200 rounded-lg p-4 my-6">
            <p className="text-black text-sm font-inktrap uppercase font-semibold">
              EARN MORE
            </p>
            <p className="text-black text-sm font-inktrap">
              Add Social Handles
              <br />
              and receive points
            </p>
          </div>

          {/* Social Handles */}
          <div className="space-y-4">
            {/* X (Twitter) */}
            <div className="space-y-2">
              <Label
                htmlFor="twitter"
                className="text-black text-sm font-inktrap uppercase"
              >
                X
              </Label>
              <div className="relative">
                <Input
                  id="twitter"
                  type="text"
                  placeholder="Your X handle"
                  value={profile.twitter_handle}
                  onChange={(e) =>
                    handleInputChange("twitter_handle", e.target.value)
                  }
                  className="bg-white border-gray-300 text-black placeholder:text-gray-500 rounded-full px-4 py-3 pr-12"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600 disabled:opacity-50"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>

            {/* Towns */}
            <div className="space-y-2">
              <Label
                htmlFor="towns"
                className="text-black text-sm font-inktrap uppercase"
              >
                TOWNS
              </Label>
              <div className="relative">
                <Input
                  id="towns"
                  type="text"
                  placeholder="Your Towns handle"
                  value={profile.towns_handle}
                  onChange={(e) =>
                    handleInputChange("towns_handle", e.target.value)
                  }
                  className="bg-white border-gray-300 text-black placeholder:text-gray-500 rounded-full px-4 py-3 pr-12"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600 disabled:opacity-50"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>

            {/* Farcaster */}
            <div className="space-y-2">
              <Label
                htmlFor="farcaster"
                className="text-black text-sm font-inktrap uppercase"
              >
                FARCASTER
              </Label>
              <div className="relative">
                <Input
                  id="farcaster"
                  type="text"
                  placeholder="Your Farcaster handle"
                  value={profile.farcaster_handle}
                  onChange={(e) =>
                    handleInputChange("farcaster_handle", e.target.value)
                  }
                  className="bg-white border-gray-300 text-black placeholder:text-gray-500 rounded-full px-4 py-3 pr-12"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600 disabled:opacity-50"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>

            {/* Telegram */}
            <div className="space-y-2">
              <Label
                htmlFor="telegram"
                className="text-black text-sm font-inktrap uppercase"
              >
                TELEGRAM
              </Label>
              <div className="relative">
                <Input
                  id="telegram"
                  type="text"
                  placeholder="Your Telegram handle"
                  value={profile.telegram_handle}
                  onChange={(e) =>
                    handleInputChange("telegram_handle", e.target.value)
                  }
                  className="bg-white border-gray-300 text-black placeholder:text-gray-500 rounded-full px-4 py-3 pr-12"
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-600 disabled:opacity-50"
                >
                  <Edit3 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Log Out Button */}
        <div className="w-full max-w-sm mt-8">
          <button
            onClick={() => {
              logout();
              onClose();
            }}
            className="w-full bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 font-inktrap py-3"
          >
            <LogOut size={18} />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
