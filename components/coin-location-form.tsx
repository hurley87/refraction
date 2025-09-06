"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, Share2, CheckCircle2 } from "lucide-react";
import miniappSdk from "@farcaster/miniapp-sdk";

interface CoinLocationFormProps {
  locationName?: string;
  locationAddress?: string;
  onSubmit: (formData: CoinFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isSuccess?: boolean;
  coinAddress?: string;
  transactionHash?: string;
}

export interface CoinFormData {
  name: string;
  symbol: string;
  description: string;
  image: File | null;
}

export default function CoinLocationForm({
  locationName = "",
  locationAddress = "",
  onSubmit,
  onCancel,
  isLoading = false,
  isSuccess = false,
  coinAddress = "",
  transactionHash = "",
}: CoinLocationFormProps) {
  const [formData, setFormData] = useState<CoinFormData>({
    name: locationName || "",
    symbol: "",
    description: locationAddress || "",
    image: null,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Share functionality
  const shareText = `Just created ${formData.name} (${formData.symbol}) coin at ${locationName}! 🪙\n\nCA:\n${coinAddress}\n\nCheck it out on IRL!`;

  const handleShareFarcaster = async () => {
    try {
      const inMiniApp = await miniappSdk.isInMiniApp();
      if (inMiniApp) {
        await miniappSdk.actions.composeCast({
          text: shareText,
          embeds: [`${window.location.origin}`],
        });
        return;
      }
    } catch {
      // noop, will fall back to Twitter below
    }
    handleShareTwitter();
  };

  const handleShareTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`${window.location.origin}/coin/${coinAddress}`)}`;
    window.open(twitterUrl, "_blank", "width=550,height=420");
  };

  const handleInputChange = (field: keyof CoinFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be less than 10MB");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      image: file,
    }));

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      image: null,
    }));
    setImagePreview(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      alert("Token name is required");
      return;
    }
    if (!formData.symbol.trim()) {
      alert("Token symbol is required");
      return;
    }
    if (!formData.image) {
      alert("Token image is required");
      return;
    }

    onSubmit(formData);
  };

  return (
    <div className="bg-white rounded-none md:rounded-2xl p-4 sm:p-6 pb-24 md:pb-6 w-full h-full md:h-auto mx-auto md:max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-inktrap font-bold text-black">
          {isSuccess ? "Coin Created Successfully!" : "Create Coin Location"}
        </h2>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {isSuccess ? (
        // Success State
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
          </div>

          <div>
            <h3 className="text-lg font-inktrap font-semibold text-black mb-2">
              {formData.name} ({formData.symbol})
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Your coin has been successfully created at {locationName}
            </p>

            {coinAddress && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Coin Address</p>
                <p className="text-sm font-mono break-all">{coinAddress}</p>
              </div>
            )}

            {transactionHash && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Transaction Hash</p>
                <p className="text-sm font-mono break-all">{transactionHash}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleShareFarcaster}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-inktrap flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Coin
            </Button>

            <Button onClick={onCancel} variant="outline" className="w-full">
              Close
            </Button>
          </div>
        </div>
      ) : (
        // Form State

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token Name */}
          <div>
            <Label
              htmlFor="name"
              className="text-sm font-inktrap text-gray-700"
            >
              Token Name *
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Central Park Coin"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="mt-1"
              disabled={isLoading}
              maxLength={100}
            />
          </div>

          {/* Token Symbol */}
          <div>
            <Label
              htmlFor="symbol"
              className="text-sm font-inktrap text-gray-700"
            >
              Token Symbol *
            </Label>
            <Input
              id="symbol"
              type="text"
              placeholder="e.g., CPARK"
              value={formData.symbol}
              onChange={(e) =>
                handleInputChange("symbol", e.target.value.toUpperCase())
              }
              className="mt-1"
              disabled={isLoading}
              maxLength={10}
            />
            <p className="text-xs text-gray-500 mt-1">
              Short identifier (max 10 characters)
            </p>
          </div>

          {/* Description */}
          <div>
            <Label
              htmlFor="description"
              className="text-sm font-inktrap text-gray-700"
            >
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe this location and what makes it special..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="mt-1 min-h-[80px]"
              disabled={isLoading}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Image Upload */}
          <div>
            <Label className="text-sm font-inktrap text-gray-700">
              Token Image *
            </Label>

            {imagePreview ? (
              <div className="mt-2 relative">
                <img
                  src={imagePreview}
                  alt="Token preview"
                  className="w-full aspect-square object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  disabled={isLoading}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById("image-input")?.click()}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Drop an image here or click to select
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  PNG, JPG up to 10MB
                </p>
              </div>
            )}

            <input
              id="image-input"
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
              disabled={isLoading}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4 pb-24 md:pb-0">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-inktrap"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Create Coin"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
