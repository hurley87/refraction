"use client";
import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.mjs`;

const PDFViewerClient = () => {
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(800);
  const [currentPage, setCurrentPage] = useState(1);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  useEffect(() => {
    const updatePageWidth = () => {
      if (typeof window !== 'undefined') {
        const screenWidth = window.innerWidth;
        if (screenWidth < 640) {
          setPageWidth(screenWidth - 32); // Small mobile
        } else if (screenWidth < 768) {
          setPageWidth(screenWidth - 48); // Large mobile
        } else if (screenWidth < 1024) {
          setPageWidth(screenWidth - 64); // Tablet
        } else {
          setPageWidth(800); // Desktop
        }
      }
    };

    updatePageWidth();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updatePageWidth);
      return () => window.removeEventListener('resize', updatePageWidth);
    }
  }, []);

  return (
    <div style={{ padding: "1rem", maxWidth: "100%" }}>
      {/* Page Navigation */}
      {numPages && (
        <div style={{ 
          display: "flex", 
          justifyContent: "center", 
          alignItems: "center",
          marginBottom: "1rem",
          gap: "1rem"
        }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: currentPage <= 1 ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: currentPage <= 1 ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
            }}
          >
            Previous
          </button>
          
          <span style={{ 
            fontSize: "0.9rem", 
            color: "#666",
            minWidth: "80px",
            textAlign: "center"
          }}>
            {currentPage} of {numPages}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}
            disabled={currentPage >= numPages}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: currentPage >= numPages ? "#ccc" : "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: currentPage >= numPages ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
            }}
          >
            Next
          </button>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Document
          file="/livepaper.pdf"
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div style={{ padding: "2rem", textAlign: "center" }}>
              Loading PDF...
            </div>
          }
          error={
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "red",
              }}
            >
              <p>Failed to load PDF viewer.</p>
              <a
                href="/livepaper.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#007bff",
                  textDecoration: "underline",
                  marginTop: "1rem",
                  display: "inline-block",
                }}
              >
                Open PDF in New Tab
              </a>
            </div>
          }
        >
          <Page
            pageNumber={currentPage}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            width={pageWidth}
          />
        </Document>
      </div>
      
      <div style={{ textAlign: "center", marginTop: "2rem", padding: "1rem" }}>
        <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "0.5rem" }}>
          Having trouble viewing the PDF?
        </p>
        <a
          href="/livepaper.pdf"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#007bff",
            textDecoration: "underline",
            fontSize: "0.9rem",
          }}
        >
          Open PDF in New Tab
        </a>
      </div>
    </div>
  );
};

export default PDFViewerClient;