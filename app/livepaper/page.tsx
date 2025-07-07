"use client";
import PDFViewer from "../../components/PDFViewer";

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "2rem",
          backgroundColor: "white",
          minHeight: "100vh",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            marginBottom: "2rem",
            color: "#333",
          }}
        >
        </h1>
        <PDFViewer />
      </div>
    </div>
  );
}