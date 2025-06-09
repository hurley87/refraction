"use client";

import dynamic from "next/dynamic";

// Dynamically import the PDF viewer to prevent SSR issues
const PDFViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      <span className="ml-4">Loading PDF...</span>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="border rounded-lg overflow-hidden shadow-lg">
          <PDFViewer />
        </div>
      </div>
    </main>
  );
}
