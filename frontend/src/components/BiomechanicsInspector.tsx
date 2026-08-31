"use client";

import React, { useState } from "react";
import { ChampionPreset } from "../lib/dummyData";

interface BiomechanicsInspectorProps {
  preset: ChampionPreset;
}

export const BiomechanicsInspector: React.FC<BiomechanicsInspectorProps> = ({ preset }) => {
  const [selectedStrike, setSelectedStrike] = useState<string>("HOOK");

  return (
    <div style={{ background: "rgba(10, 16, 26, 0.75)", borderRadius: 12, padding: 18, border: "1px solid rgba(0, 240, 255, 0.25)" }}>
      <div style={{ marginBottom: 14 }}>
        <h4 style={{ margin: 0, color: "#00f0ff", fontSize: 16, textTransform: "uppercase", letterSpacing: 1.2 }}>
          Kinematics & Strike Archetype Telemetry
        </h4>
        <span style={{ fontSize: 12, color: "#8a99ad" }}>
          Active Profile: <strong style={{ color: "#ffffff" }}>{preset.name}</strong> ({preset.archetype})
        </span>
      </div>

      {/* Real-Time Kinematics Gauges */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 18 }}>
        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 12, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Peak Velocity</div>
          <div style={{ fontSize: 22, color: "#00f0ff", fontWeight: 700, marginTop: 4 }}>
            {preset.peakVelocity} <span style={{ fontSize: 12 }}>m/s</span>
          </div>
          <div style={{ fontSize: 10, color: "#8a99ad", marginTop: 4 }}>
            Avg: {preset.avgVelocity} m/s
          </div>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 12, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Peak Acceleration</div>
          <div style={{ fontSize: 22, color: "#ffaa00", fontWeight: 700, marginTop: 4 }}>
            {preset.peakAcceleration} <span style={{ fontSize: 12 }}>m/s²</span>
          </div>
          <div style={{ fontSize: 10, color: "#8a99ad", marginTop: 4 }}>
            Explosive Burst
          </div>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 12, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Kinetic Power</div>
          <div style={{ fontSize: 22, color: "#ff0055", fontWeight: 700, marginTop: 4 }}>
            {preset.avgPower}%
          </div>
          <div style={{ fontSize: 10, color: "#8a99ad", marginTop: 4 }}>
            Force Vector Index
          </div>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 12, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Accuracy Score</div>
          <div style={{ fontSize: 22, color: "#00ff88", fontWeight: 700, marginTop: 4 }}>
            {preset.accuracyScore}%
          </div>
          <div style={{ fontSize: 10, color: "#8a99ad", marginTop: 4 }}>
            Combo Streak: {preset.highestCombo}
          </div>
        </div>
      </div>

      {/* Strike Archetype Classification Breakdown */}
      <div style={{ background: "rgba(5, 8, 17, 0.6)", borderRadius: 8, padding: 14, marginBottom: 18, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
        <div style={{ fontSize: 12, color: "#8a99ad", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>
          Strike Archetype Distribution
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
          {Object.entries(preset.strikeDistribution).map(([strike, pct]) => (
            <div
              key={strike}
              onClick={() => setSelectedStrike(strike)}
              style={{
                background: selectedStrike === strike ? "rgba(0, 240, 255, 0.15)" : "rgba(255, 255, 255, 0.02)",
                border: selectedStrike === strike ? "1px solid #00f0ff" : "1px solid rgba(255, 255, 255, 0.08)",
                padding: "8px 10px",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 11, color: selectedStrike === strike ? "#00f0ff" : "#8a99ad" }}>{strike}</div>
              <div style={{ fontSize: 16, color: "#ffffff", fontWeight: 700, marginTop: 2 }}>{pct}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Kinematic Classification Rules */}
      <div style={{ background: "rgba(5, 8, 17, 0.4)", borderRadius: 8, padding: 12, fontSize: 12, color: "#8a99ad" }}>
        <strong style={{ color: "#00f0ff" }}>Active Classifier Rule: </strong>
        {selectedStrike === "HOOK" && "Elbow angle between 45 deg - 135 deg with high horizontal angular displacement."}
        {selectedStrike === "UPPERCUT" && "Elbow angle 40 deg - 125 deg with dominant negative Y-axis upward acceleration."}
        {selectedStrike === "JAB/CROSS" && "Full elbow extension > 130 deg along dominant camera Z-depth axis."}
        {selectedStrike === "SLIP" && "Lateral head coordinate displacement > 0.08 normalized units without wrist extension."}
        {selectedStrike === "DUCK" && "Downward head and shoulder displacement > 0.10 normalized units (evasive flexion)."}
      </div>
    </div>
  );
};
