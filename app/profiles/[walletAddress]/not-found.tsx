import { X } from "lucide-react";
import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center p-4">
        <h1 className="text-black text-lg font-medium font-inktrap uppercase">
          PROFILE NOT FOUND
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 gap-6">
        {/* Error Icon */}
        <div className="flex flex-col items-center">
          <div
            style={{
              background:
                "linear-gradient(90deg, #2400FF 14.58%, #FA00FF 52.6%, #FF0000 86.46%)",
            }}
            className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
          >
            <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-red-600 flex items-center justify-center">
              <X size={32} className="text-white" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="text-center space-y-4">
          <h2 className="text-black text-xl font-inktrap font-bold">
            USER NOT FOUND
          </h2>
          <p className="text-gray-600 text-sm font-inktrap max-w-sm">
            {`The profile you're looking for doesn't exist or hasn't been created yet.`}
          </p>
        </div>

        {/* Info Section */}
        <div className="bg-yellow-100 rounded-lg p-4 max-w-sm w-full">
          <p className="text-black text-sm font-inktrap uppercase font-semibold">
            LOOKING FOR SOMEONE?
          </p>
          <p className="text-black text-sm font-inktrap">
            Make sure you have the correct
            <br />
            wallet address
          </p>
        </div>

        {/* Back to Home Button */}
        <div className="w-full max-w-sm mt-4">
          <Link
            href="/"
            className="w-full bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors flex items-center justify-center gap-2 font-inktrap py-3"
          >
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
