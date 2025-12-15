"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { X, LogOut, Clock, Check } from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/lib/types";
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

// Reusable Checkmark Icon Component
const CheckmarkIcon = ({
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
    className={`w-6 h-6 ${isLoading ? "bg-blue-500" : "bg-[#4f4f4f] hover:bg-[#3f3f3f]"} text-white rounded-full flex items-center justify-center transition-colors shadow-sm ${className}`}
    aria-label="Save"
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
      <Check className="w-3 h-3" strokeWidth={3} />
    )}
  </button>
);

interface Challenge {
  title: string;
  description: string;
  points: number;
  url: string;
  image?: string;
  dateRange?: string;
}

interface ProfileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onReturnToUserMenu?: () => void;
}

export default function ProfileMenu({
  isOpen,
  onClose,
  onReturnToUserMenu,
}: ProfileMenuProps) {
  const { user, logout } = usePrivy();
  const router = useRouter();
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoadingChallenges, setIsLoadingChallenges] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    setIsLoadingProfile(true);
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
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user?.wallet?.address, user?.email?.address]);

  const fetchChallenges = useCallback(async () => {
    setIsLoadingChallenges(true);
    try {
      const response = await fetch("/data/challenges/quest-items.json");
      if (response.ok) {
        const data = await response.json();
        // Limit to first 5 challenges for horizontal scroll
        setChallenges(data.slice(0, 5));
      }
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setIsLoadingChallenges(false);
    }
  }, []);

  // Fetch user profile on mount
  useEffect(() => {
    if (user?.wallet?.address && isOpen) {
      fetchProfile();
      fetchChallenges();
    }
  }, [user?.wallet?.address, isOpen, fetchProfile, fetchChallenges]);

  const handleChallengesClick = () => {
    onClose();
    router.push("/challenges");
  };

  const handleSave = async (field?: string) => {
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
      
      // Clear editing state after successful save
      if (field) {
        setEditingField(null);
      }
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

  const handleImageUpload = async (file: File) => {
    if (!user?.wallet?.address) return;

    setUploadingImage(true);
    try {
      // Upload image to Supabase Storage
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const errorResult = await uploadResponse.json().catch(() => ({}));
        throw new Error(
          errorResult.error || "Failed to upload image. Please try again."
        );
      }

      const uploadResult = await uploadResponse.json();
      const imageUrl = uploadResult.imageUrl || uploadResult.url;

      if (!imageUrl) {
        throw new Error("Upload succeeded but no image URL was returned");
      }

      // Update profile with new image URL
      const updatedProfile = {
        ...profile,
        profile_picture_url: imageUrl,
      };

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...updatedProfile,
          wallet_address: user.wallet.address,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      setProfile(updatedProfile);
      toast.success("Profile picture updated successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error uploading profile picture"
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size must be less than 5MB");
        return;
      }

      handleImageUpload(file);
    }

    // Reset input value to allow selecting the same file again
    if (event.target) {
      event.target.value = "";
    }
  };

  const handlePencilIconClick = () => {
    fileInputRef.current?.click();
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
        <div className="w-full px-4 pt-4 pb-1">
          <div className="bg-white rounded-3xl">
            <button
              onClick={() => {
                if (onReturnToUserMenu) {
                  onReturnToUserMenu();
                } else {
                  onClose();
                }
              }}
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
            <div className="w-full ">
              <div className="text-black body-small uppercase">PROFILE</div>
            </div>

            {/* Avatar Section */}
            <div className="w-full  flex flex-col items-center space-y-4">
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*"
                  className="hidden"
                />
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {isLoadingProfile ? (
                    <div className="w-full h-full bg-gray-300 animate-pulse"></div>
                  ) : profile.profile_picture_url ? (
                    <img
                      src={profile.profile_picture_url}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 text-2xl font-medium">
                        {profile.name || profile.username
                          ? (profile.name || profile.username)!
                              .charAt(0)
                              .toUpperCase()
                          : "?"}
                      </span>
                    </div>
                  )}
                </div>
                <PencilIcon
                  onClick={handlePencilIconClick}
                  isLoading={uploadingImage}
                  className="absolute -bottom-1 -right-1 w-8 h-8"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="w-full  space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-black body-small uppercase"
                >
                  EMAIL
                </Label>
                <div className="flex items-center gap-2">
                  {isLoadingProfile ? (
                    <div className="h-10 flex-1 bg-gray-200 animate-pulse rounded-full"></div>
                  ) : (
                    <>
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@gmail.com"
                        value={profile.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        onFocus={() => setEditingField("email")}
                        onBlur={() => {
                          // Don't clear on blur, let user click checkmark or save
                        }}
                        className={`body-large px-4 h-10 flex-1 ${
                          editingField === "email"
                            ? "border-[#313131] bg-white"
                            : "bg-white border-gray-300"
                        } text-black placeholder:text-gray-500`}
                        style={
                          editingField === "email"
                            ? {
                                borderRadius: "1000px",
                                border: "1px solid #313131",
                                background: "#FFF",
                                boxShadow: "0 0 0 2px #FFE600",
                              }
                            : {
                                borderRadius: "1000px",
                              }
                        }
                      />
                      {editingField === "email" ? (
                        <CheckmarkIcon
                          onClick={() => handleSave("email")}
                          isLoading={saving}
                        />
                      ) : (
                        <PencilIcon
                          onClick={() => setEditingField("email")}
                          isLoading={false}
                        />
                      )}
                    </>
                  )}
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
                  {isLoadingProfile ? (
                    <div className="h-10 flex-1 bg-gray-200 animate-pulse rounded-full"></div>
                  ) : (
                    <>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Your name"
                        value={profile.username}
                        onChange={(e) =>
                          handleInputChange("username", e.target.value)
                        }
                        onFocus={() => setEditingField("username")}
                        onBlur={() => {
                          // Don't clear on blur, let user click checkmark or save
                        }}
                        className={`body-large px-4 h-10 flex-1 ${
                          editingField === "username"
                            ? "border-[#313131] bg-white"
                            : "bg-white border-gray-300"
                        } text-black placeholder:text-gray-500`}
                        style={
                          editingField === "username"
                            ? {
                                borderRadius: "1000px",
                                border: "1px solid #313131",
                                background: "#FFF",
                                boxShadow: "0 0 0 2px #FFE600",
                              }
                            : {
                                borderRadius: "1000px",
                              }
                        }
                      />
                      {editingField === "username" ? (
                        <CheckmarkIcon
                          onClick={() => handleSave("username")}
                          isLoading={saving}
                        />
                      ) : (
                        <PencilIcon
                          onClick={() => setEditingField("username")}
                          isLoading={false}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Earn More Points Section */}
              <div className="w-full bg-[#EDEDED] rounded-[26px] p-4 my-6">
                <div className="w-full space-y-4">
                  {/* Row 1: EARN MORE POINTS */}
                  <div className="text-black body-small uppercase font-bold">
                    EARN MORE POINTS
                  </div>

                  {/* Row 2: Horizontal Scroll of Challenges */}
                  {isLoadingChallenges ? (
                    <div className="overflow-x-auto -mx-4 px-4 pb-2">
                      <div className="flex gap-4">
                        {[...Array(3)].map((_, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              width: "278px",
                              padding: "24px",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "8px",
                              borderRadius: "26px",
                              border: "1px solid #EDEDED",
                              background: "#FFF",
                              boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                              flexShrink: 0,
                            }}
                          >
                            <div className="w-full h-6 bg-gray-200 animate-pulse rounded"></div>
                            <div className="w-full h-4 bg-gray-200 animate-pulse rounded"></div>
                            <div className="w-full h-4 bg-gray-200 animate-pulse rounded mt-2"></div>
                            <div className="w-full h-7 bg-gray-200 animate-pulse rounded mt-auto"></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : challenges.length > 0 ? (
                    <div className="overflow-x-auto -mx-4 px-4 pb-2">
                      <div className="flex gap-4">
                        {challenges.map((challenge, index) => (
                          <div
                            key={index}
                            style={{
                              display: "flex",
                              width: "278px",
                              padding: "24px",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              gap: "8px",
                              borderRadius: "26px",
                              border: "1px solid #EDEDED",
                              background: "#FFF",
                              boxShadow: "0 1px 8px 0 rgba(0, 0, 0, 0.08)",
                              flexShrink: 0,
                            }}
                          >
                            {/* Title */}
                            <div className="title2 text-[#313131]">{challenge.title}</div>

                            {/* Description */}
                            <div className="text-[#4F4F4F] body-medium">
                              {challenge.description}
                            </div>

                            {/* Points and Date Range Pills */}
                            <div className="flex gap-1 w-full mt-auto">
                              {/* Points */}
                              <div 
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  height: '28px',
                                  backgroundColor: 'transparent',
                                  borderRadius: '16px',
                                  padding: '6px 8px',
                                  border: '1px solid #e0e0e0',
                                  flex: 1
                                }}
                              >
                                <Image
                                  src="/ep_coin.svg"
                                  alt="coin"
                                  width={16}
                                  height={16}
                                  className="w-4 h-4"
                                />
                                <div className="body-small text-black">{challenge.points}</div>
                              </div>

                              {/* Date Range */}
                              {challenge.dateRange ? (
                                <div 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    height: '28px',
                                    backgroundColor: 'transparent',
                                    borderRadius: '16px',
                                    padding: '6px 8px',
                                    border: '1px solid #e0e0e0',
                                    flex: 1
                                  }}
                                >
                                  <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" />
                                  <div className="body-small text-black whitespace-nowrap">{challenge.dateRange}</div>
                                </div>
                              ) : (
                                <div 
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    height: '28px',
                                    backgroundColor: 'transparent',
                                    borderRadius: '16px',
                                    padding: '6px 8px',
                                    border: '1px solid #e0e0e0',
                                    flex: 1
                                  }}
                                >
                                  <div className="body-small text-black"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Row 3: Challenges Button */}
                  <button
                    onClick={handleChallengesClick}
                    className="w-full h-[40px] bg-white hover:bg-gray-100 text-[#313131] px-4 rounded-full font-pleasure transition-colors duration-200 flex items-center justify-between"
                  >
                    <h4>Challenges</h4>
                    <Image
                      src="/home/arrow-right.svg"
                      alt="arrow"
                      width={21}
                      height={21}
                      className="w-[21px] h-[21px]"
                    />
                  </button>
                </div>
              </div>

              {/* Social Handles */}
              <div className="space-y-4">
                {/* Website */}
                <div className="space-y-2">
                  <Label
                    htmlFor="website"
                    className="text-black body-small uppercase"
                  >
                    WEBSITE
                  </Label>
                  <div className="flex items-center gap-2">
                    {isLoadingProfile ? (
                      <div className="h-10 flex-1 bg-gray-200 animate-pulse rounded-full"></div>
                    ) : (
                      <>
                        <Input
                          id="website"
                          type="text"
                          placeholder="www.yourwebsite.com"
                          value={profile.website || ""}
                          onChange={(e) =>
                            handleInputChange("website", e.target.value)
                          }
                          onFocus={() => setEditingField("website")}
                          onBlur={() => {
                            // Don't clear on blur, let user click checkmark or save
                          }}
                          className={`body-large px-4 h-10 flex-1 ${
                            editingField === "website"
                              ? "border-[#313131] bg-white"
                              : "bg-white border-gray-300"
                          } text-black placeholder:text-gray-500`}
                          style={
                            editingField === "website"
                              ? {
                                  borderRadius: "1000px",
                                  border: "1px solid #313131",
                                  background: "#FFF",
                                  boxShadow: "0 0 0 2px #FFE600",
                                }
                              : {
                                  borderRadius: "1000px",
                                }
                          }
                        />
                        {editingField === "website" ? (
                          <CheckmarkIcon
                            onClick={() => handleSave("website")}
                            isLoading={saving}
                          />
                        ) : (
                          <PencilIcon
                            onClick={() => setEditingField("website")}
                            isLoading={false}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* X (Twitter) */}
                <div className="space-y-2">
                  <Label
                    htmlFor="twitter"
                    className="text-black body-small uppercase"
                  >
                    X
                  </Label>
                  <div className="flex items-center gap-2">
                    {isLoadingProfile ? (
                      <div className="h-10 flex-1 bg-gray-200 animate-pulse rounded-full"></div>
                    ) : (
                      <>
                        <Input
                          id="twitter"
                          type="text"
                          placeholder="Your X handle"
                          value={profile.twitter_handle}
                          onChange={(e) =>
                            handleInputChange("twitter_handle", e.target.value)
                          }
                          onFocus={() => setEditingField("twitter_handle")}
                          onBlur={() => {
                            // Don't clear on blur, let user click checkmark or save
                          }}
                          className={`body-large px-4 h-10 flex-1 ${
                            editingField === "twitter_handle"
                              ? "border-[#313131] bg-white"
                              : "bg-white border-gray-300"
                          } text-black placeholder:text-gray-500`}
                          style={
                            editingField === "twitter_handle"
                              ? {
                                  borderRadius: "1000px",
                                  border: "1px solid #313131",
                                  background: "#FFF",
                                  boxShadow: "0 0 0 2px #FFE600",
                                }
                              : {
                                  borderRadius: "1000px",
                                }
                          }
                        />
                        {editingField === "twitter_handle" ? (
                          <CheckmarkIcon
                            onClick={() => handleSave("twitter_handle")}
                            isLoading={saving}
                          />
                        ) : (
                          <PencilIcon
                            onClick={() => setEditingField("twitter_handle")}
                            isLoading={false}
                          />
                        )}
                      </>
                    )}
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
                    {isLoadingProfile ? (
                      <div className="h-10 flex-1 bg-gray-200 animate-pulse rounded-full"></div>
                    ) : (
                      <>
                        <Input
                          id="towns"
                          type="text"
                          placeholder="Your Towns handle"
                          value={profile.towns_handle}
                          onChange={(e) =>
                            handleInputChange("towns_handle", e.target.value)
                          }
                          onFocus={() => setEditingField("towns_handle")}
                          onBlur={() => {
                            // Don't clear on blur, let user click checkmark or save
                          }}
                          className={`body-large px-4 h-10 flex-1 ${
                            editingField === "towns_handle"
                              ? "border-[#313131] bg-white"
                              : "bg-white border-gray-300"
                          } text-black placeholder:text-gray-500`}
                          style={
                            editingField === "towns_handle"
                              ? {
                                  borderRadius: "1000px",
                                  border: "1px solid #313131",
                                  background: "#FFF",
                                  boxShadow: "0 0 0 2px #FFE600",
                                }
                              : {
                                  borderRadius: "1000px",
                                }
                          }
                        />
                        {editingField === "towns_handle" ? (
                          <CheckmarkIcon
                            onClick={() => handleSave("towns_handle")}
                            isLoading={saving}
                          />
                        ) : (
                          <PencilIcon
                            onClick={() => setEditingField("towns_handle")}
                            isLoading={false}
                          />
                        )}
                      </>
                    )}
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
                    {isLoadingProfile ? (
                      <div className="h-10 flex-1 bg-gray-200 animate-pulse rounded-full"></div>
                    ) : (
                      <>
                        <Input
                          id="farcaster"
                          type="text"
                          placeholder="Your Farcaster handle"
                          value={profile.farcaster_handle}
                          onChange={(e) =>
                            handleInputChange("farcaster_handle", e.target.value)
                          }
                          onFocus={() => setEditingField("farcaster_handle")}
                          onBlur={() => {
                            // Don't clear on blur, let user click checkmark or save
                          }}
                          className={`body-large px-4 h-10 flex-1 ${
                            editingField === "farcaster_handle"
                              ? "border-[#313131] bg-white"
                              : "bg-white border-gray-300"
                          } text-black placeholder:text-gray-500`}
                          style={
                            editingField === "farcaster_handle"
                              ? {
                                  borderRadius: "1000px",
                                  border: "1px solid #313131",
                                  background: "#FFF",
                                  boxShadow: "0 0 0 2px #FFE600",
                                }
                              : {
                                  borderRadius: "1000px",
                                }
                          }
                        />
                        {editingField === "farcaster_handle" ? (
                          <CheckmarkIcon
                            onClick={() => handleSave("farcaster_handle")}
                            isLoading={saving}
                          />
                        ) : (
                          <PencilIcon
                            onClick={() => setEditingField("farcaster_handle")}
                            isLoading={false}
                          />
                        )}
                      </>
                    )}
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
                    {isLoadingProfile ? (
                      <div className="h-10 flex-1 bg-gray-200 animate-pulse rounded-full"></div>
                    ) : (
                      <>
                        <Input
                          id="telegram"
                          type="text"
                          placeholder="Your Telegram handle"
                          value={profile.telegram_handle}
                          onChange={(e) =>
                            handleInputChange("telegram_handle", e.target.value)
                          }
                          onFocus={() => setEditingField("telegram_handle")}
                          onBlur={() => {
                            // Don't clear on blur, let user click checkmark or save
                          }}
                          className={`body-large px-4 h-10 flex-1 ${
                            editingField === "telegram_handle"
                              ? "border-[#313131] bg-white"
                              : "bg-white border-gray-300"
                          } text-black placeholder:text-gray-500`}
                          style={
                            editingField === "telegram_handle"
                              ? {
                                  borderRadius: "1000px",
                                  border: "1px solid #313131",
                                  background: "#FFF",
                                  boxShadow: "0 0 0 2px #FFE600",
                                }
                              : {
                                  borderRadius: "1000px",
                                }
                          }
                        />
                        {editingField === "telegram_handle" ? (
                          <CheckmarkIcon
                            onClick={() => handleSave("telegram_handle")}
                            isLoading={saving}
                          />
                        ) : (
                          <PencilIcon
                            onClick={() => setEditingField("telegram_handle")}
                            isLoading={false}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Log Out Button */}
            <div className="w-full  mt-8">
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
