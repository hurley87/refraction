"use client";

import { Viewer, Worker } from "@react-pdf-viewer/core";

export default function Home() {
  return (
    <main>
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.js">
        <div>
          <Viewer fileUrl="/pdfs/livepaper.pdf" />
        </div>
      </Worker>
    </main>
  );
}