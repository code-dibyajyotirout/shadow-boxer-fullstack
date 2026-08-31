"use client";

import React, { useState } from "react";
import ShadowBoxerClient from "@/components/ShadowBoxerClient";
import { RecruiterPortal } from "@/components/RecruiterPortal";

export default function Home() {
  const [viewMode, setViewMode] = useState<"camera" | "portal">("portal");

  return (
    <div style={{ minHeight: "100vh", background: "#06090e" }}>
      {/* Top Header Mode Toggle */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          background: "rgba(10, 16, 26, 0.95)",
          borderBottom: "1px solid rgba(0, 240, 255, 0.2)",
          position: "sticky",
          top: 0,
          zIndex: 1000,
          backdropFilter: "blur(12px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 12,
              height: 12,
              background: "#00f0ff",
              boxShadow: "0 0 10px #00f0ff",
              borderRadius: "50%",
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 2,
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            Shadow Boxer <span style={{ color: "#00f0ff", fontSize: 13, fontWeight: 600 }}>Full-Stack</span>
          </h1>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setViewMode("portal")}
            style={{
              background: viewMode === "portal" ? "rgba(0, 240, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
              color: viewMode === "portal" ? "#00f0ff" : "#8a99ad",
              border: viewMode === "portal" ? "1px solid #00f0ff" : "1px solid rgba(255, 255, 255, 0.1)",
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recruiter & Architecture Hub
          </button>
          <button
            onClick={() => setViewMode("camera")}
            style={{
              background: viewMode === "camera" ? "rgba(0, 240, 255, 0.2)" : "rgba(255, 255, 255, 0.05)",
              color: viewMode === "camera" ? "#00f0ff" : "#8a99ad",
              border: viewMode === "camera" ? "1px solid #00f0ff" : "1px solid rgba(255, 255, 255, 0.1)",
              padding: "8px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Live AI Camera HUD
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main>
        {viewMode === "portal" ? <RecruiterPortal /> : <ShadowBoxerClient />}
      </main>
    </div>
  );
}
