'use client';

import Image from 'next/image';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MAX_LOCATION_DESCRIPTION_LENGTH } from '@/lib/constants';
import type {
  CategoryOption,
  FormStep,
  LocationFormData,
} from '@/components/map/interactive-map-types';
import type { Dispatch, SetStateAction } from 'react';

type MapCreateLocationDrawerProps = {
  formStep: FormStep;
  formData: LocationFormData;
  categories: CategoryOption[];
  isCreatingLocation: boolean;
  isFormComplete: boolean;
  creationPoints: number;
  locationName: string;
  onClose: () => void;
  onNext: () => void;
  setFormData: Dispatch<SetStateAction<LocationFormData>>;
};

export function MapCreateLocationDrawer({
  formStep,
  formData,
  categories,
  isCreatingLocation,
  isFormComplete,
  creationPoints,
  locationName,
  onClose,
  onNext,
  setFormData,
}: MapCreateLocationDrawerProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] flex justify-center pointer-events-none px-0 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-location-drawer-title"
    >
      <div className="pointer-events-auto flex w-full max-w-[393px] max-h-[min(88vh,640px)] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-[#ebebeb] bg-white shadow-[0_-8px_32px_rgba(0,0,0,0.12)] sm:rounded-2xl sm:border-b sm:mb-[max(0.5rem,env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] xl:mb-0 xl:max-h-none xl:max-w-none xl:rounded-none xl:border xl:shadow-none">
        {/* Header */}
        {formStep !== 'success' && (
          <div className="flex shrink-0 items-center justify-between bg-white px-3 pt-2.5 pb-2">
            <div className="flex min-w-0 items-center gap-2">
              <p
                id="new-location-drawer-title"
                className="truncate text-[#000000] tracking-[-0.5px] label-small uppercase"
              >
                create and check in
              </p>
            </div>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {/* Step 1: Business Details */}
          {formStep === 'business-details' && (
            <div className="px-3 pb-3 pt-0">
              <div className="flex flex-col gap-3">
                <p className="m-0 title3 text-[#000000] font-semibold">
                  Add Business Details
                </p>
                {/* Name Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="name"
                    className="label-small text-[#757575] uppercase tracking-[0.3px]"
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
                    className="px-3 h-10 border border-[#e8e8e8] bg-white body-medium tracking-[-0.2px] text-[#000000] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#999]"
                    maxLength={100}
                  />
                </div>

                {/* Address Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="address"
                    className="label-small text-[#757575] uppercase tracking-[0.3px]"
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
                    className=" px-3 h-10 border border-[#e8e8e8] bg-[#fafafa] body-medium tracking-[-0.2px] text-[#666] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0"
                    maxLength={200}
                  />
                </div>

                {/* Description Field */}
                <div className="flex h-[176px] shrink-0 flex-col items-start gap-2 self-stretch">
                  <label
                    htmlFor="description"
                    className="label-small shrink-0 text-[#757575] uppercase tracking-[0.3px]"
                  >
                    Description <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    id="description"
                    required
                    placeholder="Describe this business"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="min-h-0 w-full flex-1 resize-none border border-[#e8e8e8] bg-white p-3 body-medium tracking-[-0.2px] text-[#000000] placeholder:text-[#c0c0c0] focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-[#999]"
                    maxLength={MAX_LOCATION_DESCRIPTION_LENGTH}
                  />
                </div>

                {/* Category Field */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="category"
                    className="label-small text-[#757575] uppercase tracking-[0.3px]"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={formData.categoryId || undefined}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        categoryId: value,
                      }))
                    }
                  >
                    <SelectTrigger
                      id="category"
                      className="h-10 border border-[#e8e8e8] bg-white px-3 body-medium tracking-[-0.2px] text-[#000000] focus:ring-0 focus:ring-offset-0 focus:border-[#999]"
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Image Upload */}
                <div className="flex flex-col gap-1.5">
                  <label className="label-small text-[#757575] uppercase tracking-[0.3px]">
                    Add image <span className="text-red-500">*</span>
                  </label>
                  {formData.locationImage ? (
                    <div className="relative">
                      <img
                        src={URL.createObjectURL(formData.locationImage)}
                        alt="Preview"
                        className="w-full h-32 object-cover border border-[#e8e8e8] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            locationImage: null,
                          }));
                        }}
                        className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm hover:bg-white w-6 h-6 flex items-center justify-center transition-colors shadow-sm"
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
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 self-stretch px-10 py-4 transition-colors"
                      style={{
                        border:
                          '1px dashed var(--Borders-Heavy-Border, #454545)',
                        background:
                          'var(--Backgrounds-Secondary-CTA-BG, #DBDBDB)',
                      }}
                    >
                      <Image
                        src="/guidance-vupload.svg"
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 shrink-0"
                        aria-hidden
                      />
                      <p className="text-[#171717] label-small uppercase tracking-[0.3px]">
                        Upload an image
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
          {formStep === 'success' && (
            <div
              className="relative flex flex-col items-center justify-center min-h-[320px] w-full overflow-hidden"
              style={{
                backgroundImage: "url('/city-bg.jpg')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
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
                    {creationPoints}
                  </p>
                  <p className="text-[10px] text-white/70 uppercase tracking-[0.3px] font-medium mt-1">
                    Points for creating location
                  </p>
                </div>

                <div className="flex flex-col items-center gap-2 mt-2">
                  <p className="text-[11px] text-white/90 text-center leading-relaxed px-4">
                    Your location is on the map for the community to find.
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
                    {locationName}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {formStep !== 'success' ? (
          <div className="shrink-0 p-3 pt-0">
            <button
              type="button"
              onClick={onNext}
              disabled={isCreatingLocation || !isFormComplete}
              className={cn(
                'flex h-11 w-full shrink-0 items-center justify-center self-stretch rounded-full px-4 transition-colors',
                isFormComplete && !isCreatingLocation
                  ? 'bg-[#1a1a1a] text-white hover:bg-black'
                  : 'cursor-not-allowed bg-[#DBDBDB] text-[#999]'
              )}
            >
              <span className="label-large uppercase">
                {isCreatingLocation ? '...' : 'Next'}
              </span>
            </button>
          </div>
        ) : (
          <div className="shrink-0 p-3">
            <button
              onClick={onClose}
              className="bg-[#1a1a1a] hover:bg-black text-white rounded-full h-9 font-inktrap text-[11px] uppercase tracking-[0.3px] flex items-center justify-center transition-colors w-full"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
