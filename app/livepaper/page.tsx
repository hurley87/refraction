"use client";

import dynamic from "next/dynamic";

// Dynamically import the PDF viewer to prevent SSR issues
const PDFViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">Loading PDF...</div>
  ),
});

export default function Home() {
  return (
    <main>
      <PDFViewer />
    </main>
  );
}
