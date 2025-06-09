"use client";

import { Viewer, Worker } from "@react-pdf-viewer/core";

export default function PDFViewer() {
  return (
    <Worker workerUrl="/pdfjs/pdf.worker.min.mjs">
      <div>
        <Viewer fileUrl="/pdfs/livepaper.pdf" />
      </div>
    </Worker>
  );
}
