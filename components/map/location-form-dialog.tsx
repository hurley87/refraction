"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface LocationFormData {
  name: string;
  address: string;
  description: string;
  locationImage: File | null;
  checkInComment: string;
}

interface MarkerData {
  latitude: number;
  longitude: number;
  place_id: string;
  display_name: string;
  name: string;
  description?: string | null;
  creator_wallet_address?: string | null;
  creator_username?: string | null;
  imageUrl?: string | null;
  type?: string;
  event_url?: string | null;
}

type FormStep = "business-details" | "success";

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formStep: FormStep;
  formData: LocationFormData;
  setFormData: React.Dispatch<React.SetStateAction<LocationFormData>>;
  selectedMarker: MarkerData | null;
  isCreatingLocation: boolean;
  pointsEarned: { creation: number; checkIn: number };
  onClose: () => void;
  onSubmit: () => void;
}

export default function LocationFormDialog({
  open,
  onOpenChange,
  formStep,
  formData,
  setFormData,
  selectedMarker,
  isCreatingLocation,
  pointsEarned,
  onClose,
  onSubmit,
}: LocationFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="w-full max-w-[340px] p-0 bg-transparent border-none shadow-none [&>button]:hidden">
        <div className="bg-white rounded-2xl overflow-hidden max-h-[85vh] flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
          {/* Header */}
          {formStep !== "success" && (
            <div className="bg-white flex items-center justify-between px-3 py-2.5 border-b border-[#f0f0f0]">
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="text-[#999] hover:text-[#666] transition-colors disabled:opacity-50"
                  aria-label="Close"
                  disabled={isCreatingLocation}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                <h2 className="text-sm font-inktrap text-[#1a1a1a] tracking-[-0.5px]">
                  New Location
                </h2>
              </div>
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            {/* Step 1: Business Details */}
            {formStep === "business-details" && (
              <div className="p-3">
                <div className="flex flex-col gap-3">
                  {/* Name Field */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="name"
                      className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]"
                    >
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter location name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="rounded-xl px-3 h-10 border border-[#e8e8e8] bg-white text-sm tracking-[-0.2px] text-[#1a1a1a] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#999]"
                      maxLength={100}
                    />
                  </div>

                  {/* Address Field */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="address"
                      className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]"
                    >
                      Address
                    </label>
                    <Input
                      id="address"
                      type="text"
                      placeholder="Enter address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      className="rounded-xl px-3 h-10 border border-[#e8e8e8] bg-[#fafafa] text-sm tracking-[-0.2px] text-[#666] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0"
                      maxLength={200}
                    />
                  </div>

                  {/* Description Field */}
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="description"
                      className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]"
                    >
                      Description
                    </label>
                    <Textarea
                      id="description"
                      placeholder="What makes this place special?"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="min-h-[70px] rounded-xl p-3 border border-[#e8e8e8] bg-white text-sm tracking-[-0.2px] text-[#1a1a1a] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#999] resize-none"
                      maxLength={500}
                    />
                  </div>

                  {/* Image Upload */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]">
                      Image <span className="text-red-500">*</span>
                    </label>
                    {formData.locationImage ? (
                      <div className="relative">
                        <img
                          src={URL.createObjectURL(formData.locationImage)}
                          alt="Preview"
                          className="w-full h-32 object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              locationImage: null,
                            }));
                          }}
                          className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm hover:bg-white rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-sm"
                        >
                          <svg
                            className="w-3 h-3 text-[#666]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2.5}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="locationImage"
                        className="bg-[#f8f8f8] border border-dashed border-[#d0d0d0] rounded-xl flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-[#f0f0f0] hover:border-[#999] transition-colors"
                      >
                        <svg
                          className="w-5 h-5 text-[#999] mb-1.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <p className="text-[10px] font-medium text-[#999] uppercase tracking-[0.3px]">
                          Upload image
                        </p>
                      </label>
                    )}
                    <input
                      id="locationImage"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        setFormData((prev) => ({
                          ...prev,
                          locationImage: file || null,
                        }));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Success Screen */}
            {formStep === "success" && (
              <div
                className="relative flex flex-col items-center justify-center min-h-[320px] w-full overflow-hidden"
                style={{
                  backgroundImage: "url('/city-bg.jpg')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <div className="relative z-10 flex flex-col items-center gap-5 px-4 py-10 w-full h-full justify-center">
                  {/* Success checkmark */}
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>

                  {/* Reward Section */}
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] text-white/80 uppercase tracking-[0.3px] font-medium">
                      You Earned
                    </p>
                    <p
                      className="text-5xl text-white tracking-[-3px] font-bold"
                      style={{
                        fontFamily: '"Pleasure Variable Trial", sans-serif',
                      }}
                    >
                      {pointsEarned.creation}
                    </p>
                    <p className="text-[10px] text-white/70 uppercase tracking-[0.3px] font-medium mt-1">
                      Points for creating location
                    </p>
                  </div>

                  {/* Pending Approval Message */}
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <p className="text-[11px] text-white/90 text-center leading-relaxed px-4">
                      Your location is pending review and will appear on the map once approved by an admin.
                    </p>
                  </div>

                  {/* Location badge */}
                  <div className="flex gap-1.5 items-center border border-white/30 rounded-full px-2.5 py-1.5 bg-white/10 backdrop-blur-sm mt-2">
                    <svg
                      className="w-3.5 h-3.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-[10px] text-white uppercase tracking-[0.3px] font-medium">
                      {formData.name || selectedMarker?.name || "Location"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {formStep !== "success" ? (
            <div className="p-3 pt-0">
              <button
                onClick={onSubmit}
                disabled={isCreatingLocation}
                className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors disabled:opacity-50 w-full"
              >
                {isCreatingLocation ? "Creating..." : "Create Location"}
              </button>
            </div>
          ) : (
            <div className="p-3">
              <button
                onClick={onClose}
                className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors w-full"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
