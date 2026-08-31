"use client";

import React, { useState, useEffect } from "react";

export const WebRTCSparring: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);
  const [rttLatency, setRttLatency] = useState(38); // ms
  const [packetsSent, setPacketsSent] = useState(1420);
  const [packetsReceived, setPacketsReceived] = useState(1418);
  const [sparringLogs, setSparringLogs] = useState<Array<{ id: number; time: string; event: string; latency: number }>>([
    { id: 1, time: "10:04:12", event: "P2P DataChannel connected (Host <-> Peer_B)", latency: 32 },
    { id: 2, time: "10:04:15", event: "Peer_B landed RIGHT HOOK (Velocity: 4.8 m/s)", latency: 36 },
    { id: 3, time: "10:04:18", event: "Host slipped LEFT (Evasion Confirmed)", latency: 34 },
    { id: 4, time: "10:04:22", event: "Host landed COUNTER CROSS (Velocity: 5.3 m/s)", latency: 38 },
  ]);

  // Simulate ongoing WebRTC pose landmark buffer transmissions
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        setPacketsSent((p) => p + 60);
        setPacketsReceived((p) => p + 60);
        setRttLatency(Math.floor(32 + Math.random() * 12)); // 32 - 44 ms
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const handleSimulateStrike = () => {
    const strikes = ["JAB", "CROSS", "LEFT HOOK", "RIGHT UPPERCUT", "DUCK"];
    const chosen = strikes[Math.floor(Math.random() * strikes.length)];
    const speed = (3.5 + Math.random() * 2.0).toFixed(1);
    const now = new Date().toLocaleTimeString();
    
    setSparringLogs((prev) => [
      {
        id: Date.now(),
        time: now,
        event: `Peer landed ${chosen} (Speed: ${speed} m/s)`,
        latency: Math.floor(30 + Math.random() * 15),
      },
      ...prev.slice(0, 7),
    ]);
  };

  return (
    <div style={{ background: "rgba(10, 16, 26, 0.75)", borderRadius: 12, padding: 18, border: "1px solid rgba(0, 240, 255, 0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h4 style={{ margin: 0, color: "#00f0ff", fontSize: 16, textTransform: "uppercase", letterSpacing: 1.2 }}>
            Multiplayer WebRTC P2P Sparring Simulator
          </h4>
          <span style={{ fontSize: 12, color: "#8a99ad" }}>
            Direct Peer-to-Peer DataChannel with Serialized 33-Landmark Float32 Arrays
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: isConnected ? "#00ff88" : "#ff3b5c", display: "inline-block" }}></span>
          <span style={{ fontSize: 12, color: isConnected ? "#00ff88" : "#ff3b5c", fontWeight: 600 }}>
            {isConnected ? "DataChannel: OPEN" : "DataChannel: CLOSED"}
          </span>
        </div>
      </div>

      {/* Network Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 12, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Round-Trip Latency</div>
          <div style={{ fontSize: 20, color: "#00ff88", fontWeight: 700, marginTop: 4 }}>
            {rttLatency} <span style={{ fontSize: 12 }}>ms</span>
          </div>
          <div style={{ fontSize: 10, color: "#8a99ad", marginTop: 2 }}>Sub-50ms SLA Target</div>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 12, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Pose Packets Sent</div>
          <div style={{ fontSize: 20, color: "#ffffff", fontWeight: 700, marginTop: 4 }}>
            {packetsSent.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: "#8a99ad", marginTop: 2 }}>60 Hz Stream</div>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 12, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Packet Delivery</div>
          <div style={{ fontSize: 20, color: "#00f0ff", fontWeight: 700, marginTop: 4 }}>
            99.9%
          </div>
          <div style={{ fontSize: 10, color: "#8a99ad", marginTop: 2 }}>Zero Packet Drop</div>
        </div>

        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: 12, borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Serialization</div>
          <div style={{ fontSize: 20, color: "#ffaa00", fontWeight: 700, marginTop: 4 }}>
            Float32Array
          </div>
          <div style={{ fontSize: 10, color: "#8a99ad", marginTop: 2 }}>396 Bytes / Frame</div>
        </div>
      </div>

      {/* Sparring Log Stream */}
      <div style={{ background: "#050811", borderRadius: 8, padding: 12, marginBottom: 14, border: "1px solid rgba(255, 255, 255, 0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase", letterSpacing: 0.8 }}>
            Live P2P Strike Synchronization Stream
          </span>
          <button
            onClick={handleSimulateStrike}
            style={{
              background: "rgba(0, 240, 255, 0.15)",
              color: "#00f0ff",
              border: "1px solid rgba(0, 240, 255, 0.3)",
              padding: "4px 10px",
              borderRadius: 4,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Simulate P2P Punch Event
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {sparringLogs.map((log) => (
            <div
              key={log.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                fontFamily: "monospace",
                padding: "4px 8px",
                background: "rgba(255, 255, 255, 0.02)",
                borderRadius: 4,
              }}
            >
              <span style={{ color: "#00f0ff" }}>[{log.time}] {log.event}</span>
              <span style={{ color: "#8a99ad" }}>{log.latency}ms</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
