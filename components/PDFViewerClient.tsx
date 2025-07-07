"use client";
import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.mjs`;

const PDFViewerClient = () => {
  const [numPages, setNumPages] = useState(null);
  const [pageWidth, setPageWidth] = useState(800);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  useEffect(() => {
    const updatePageWidth = () => {
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
    };

    updatePageWidth();
    window.addEventListener('resize', updatePageWidth);
    return () => window.removeEventListener('resize', updatePageWidth);
  }, []);

  return (
    <div style={{ padding: "1rem", maxWidth: "100%" }}>
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
          {Array.from(new Array(numPages), (el, index) => (
            <div key={`page_${index + 1}`} style={{ marginBottom: "1rem", width: "100%" }}>
              <Page
                pageNumber={index + 1}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                width={pageWidth}
              />
            </div>
          ))}
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