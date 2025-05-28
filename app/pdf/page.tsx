"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();

export default function PDFViewer() {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
    setError(null);
  }

  function onDocumentLoadError(error: Error) {
    console.error("Error loading PDF:", error);
    setError(`Failed to load PDF: ${error.message}`);
    setLoading(false);
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="w-full bg-gray-50">
        {error && (
          <div className="text-red-500 text-center mb-4 p-4 bg-red-50 rounded">
            <p className="font-bold">Error loading PDF:</p>
            <p>{error}</p>
          </div>
        )}
        
        {loading && (
          <div className="text-center mb-4 p-4 bg-black rounded">
            Loading PDF...
          </div>
        )}

        <Document
          file="/pdfs/livepaper.pdf"
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={
            <div className="text-center p-4 bg-black rounded">
              Loading PDF...
            </div>
          }
          error={
            <div className="text-red-500 text-center p-4 bg-red-50 rounded">
              Failed to load PDF. Please try again later.
            </div>
          }
          className="flex flex-col items-center w-full"
        >
          {numPages &&
            Array.from({ length: numPages }, (_, idx) => (
              <div key={`page_${idx + 1}`} className="w-full flex justify-center">
                <Page
                  pageNumber={idx + 1}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="w-full"
                  width={window.innerWidth}
                  loading={
                    <div className="text-center p-4 bg-black rounded">
                      Loading page {idx + 1}...
                    </div>
                  }
                />
              </div>
            ))}
        </Document>
      </div>
    </div>
  );
} 