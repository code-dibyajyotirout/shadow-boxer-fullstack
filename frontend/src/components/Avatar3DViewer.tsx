"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChampionPreset } from "../lib/dummyData";

interface Avatar3DViewerProps {
  preset: ChampionPreset;
}

export const Avatar3DViewer: React.FC<Avatar3DViewerProps> = ({ preset }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isRotating, setIsRotating] = useState(true);
  const [elevationAngle, setElevationAngle] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Animation loop for holographic 3D rotation
  useEffect(() => {
    let animationFrameId: number;
    const render = () => {
      if (isRotating && !isDragging) {
        setRotationAngle((prev) => (prev + 0.8) % 360);
      }
      drawHologram();
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isRotating, isDragging, rotationAngle, elevationAngle, preset]);

  const drawHologram = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background Holographic Grid
    ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 3D Perspective Projection Math
    const radY = (rotationAngle * Math.PI) / 180;
    const radX = (elevationAngle * Math.PI) / 180;
    const cosY = Math.cos(radY);
    const sinY = Math.sin(radY);
    const cosX = Math.cos(radX);
    const sinX = Math.sin(radX);

    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 240;

    const projectedPoints = preset.sampleLandmarks.map((lm) => {
      // Normalize landmark to origin
      const nx = (lm.x - 0.5) * 2;
      const ny = (lm.y - 0.5) * 2;
      const nz = lm.z * 2;

      // Rotate around Y axis
      const rx = nx * cosY + nz * sinY;
      const rz = -nx * sinY + nz * cosY;

      // Rotate around X axis
      const ry = ny * cosX - rz * sinX;
      const finalZ = ny * sinX + rz * cosX;

      // Perspective projection
      const cameraDist = 3.2;
      const fov = 1.0 / (cameraDist + finalZ);
      const px = centerX + rx * scale * fov * 2.8;
      const py = centerY + ry * scale * fov * 2.8;

      return { px, py, z: finalZ, name: lm.name };
    });

    // Skeletal Connection Pairs
    const connections = [
      [1, 2], // Shoulders
      [1, 3], // Left upper arm
      [3, 5], // Left forearm
      [2, 4], // Right upper arm
      [4, 6], // Right forearm
      [1, 7], // Left torso
      [2, 8], // Right torso
      [7, 8], // Hips
      [7, 9], // Left thigh
      [9, 11], // Left shin
      [8, 10], // Right thigh
      [10, 12], // Right shin
      [0, 1], // Head to left shoulder
      [0, 2], // Head to right shoulder
    ];

    // Draw Bones (Neon Cyan Glow)
    ctx.shadowBlur = 12;
    ctx.shadowColor = "#00f0ff";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2.5;

    connections.forEach(([i, j]) => {
      if (projectedPoints[i] && projectedPoints[j]) {
        ctx.beginPath();
        ctx.moveTo(projectedPoints[i].px, projectedPoints[i].py);
        ctx.lineTo(projectedPoints[j].px, projectedPoints[j].py);
        ctx.stroke();
      }
    });

    // Draw Joints (Bright Dots)
    projectedPoints.forEach((pt, idx) => {
      const isWrist = idx === 5 || idx === 6;
      ctx.shadowBlur = isWrist ? 20 : 10;
      ctx.shadowColor = isWrist ? "#ff0055" : "#00f0ff";
      ctx.fillStyle = isWrist ? "#ff0055" : "#ffffff";

      ctx.beginPath();
      ctx.arc(pt.px, pt.py, isWrist ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Label Wrists
      if (isWrist) {
        ctx.font = "10px Inter, monospace";
        ctx.fillStyle = "#ff0055";
        ctx.fillText(idx === 5 ? "L-WRIST" : "R-WRIST", pt.px + 8, pt.py - 4);
      }
    });

    ctx.shadowBlur = 0;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotationAngle((prev) => (prev + dx * 0.5 + 360) % 360);
    setElevationAngle((prev) => Math.max(-60, Math.min(60, prev + dy * 0.5)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div style={{ background: "rgba(10, 16, 26, 0.75)", borderRadius: 12, padding: 18, border: "1px solid rgba(0, 240, 255, 0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: 0, color: "#00f0ff", fontSize: 16, textTransform: "uppercase", letterSpacing: 1.2 }}>
            3D Hologram Avatar Projection
          </h4>
          <span style={{ fontSize: 12, color: "#8a99ad" }}>
            33-Landmark MediaPipe 3D Rig | Drag to rotate 360 degrees
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setIsRotating(!isRotating)}
            style={{
              background: isRotating ? "rgba(0, 240, 255, 0.15)" : "rgba(255, 255, 255, 0.05)",
              color: isRotating ? "#00f0ff" : "#8a99ad",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {isRotating ? "Auto-Rotate: ON" : "Auto-Rotate: OFF"}
          </button>
          <button
            onClick={() => {
              setRotationAngle(0);
              setElevationAngle(15);
            }}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              padding: "6px 12px",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Reset View
          </button>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", height: 320, background: "#050811", borderRadius: 8, overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={320}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ width: "100%", height: "100%", cursor: isDragging ? "grabbing" : "grab" }}
        />
        <div style={{ position: "absolute", bottom: 10, left: 12, fontSize: 11, color: "rgba(0, 240, 255, 0.6)", fontFamily: "monospace" }}>
          Azimuth: {Math.round(rotationAngle)} deg | Elevation: {Math.round(elevationAngle)} deg | Render: 60 FPS
        </div>
      </div>
    </div>
  );
};
