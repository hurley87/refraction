"use client";
import { useEffect } from "react";

export default function LivepaperPage() {
  useEffect(() => {
    // Redirect to the PDF file
    window.location.href = "/livepaper.pdf";
  }, []);

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      backgroundColor: "#f5f5f5" 
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ 
          width: "50px", 
          height: "50px", 
          border: "3px solid #f3f3f3",
          borderTop: "3px solid #007bff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 1rem"
        }}></div>
        <p style={{ color: "#666" }}>Redirecting to PDF...</p>
      </div>
    </div>
  );
}