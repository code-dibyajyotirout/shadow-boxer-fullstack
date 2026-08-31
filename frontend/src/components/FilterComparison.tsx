"use client";

import React, { useEffect, useRef, useState } from "react";
import { ShadowBoxerApiClient, FilterBenchmarkResult } from "../lib/apiClient";

export const FilterComparison: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [benchmark, setBenchmark] = useState<FilterBenchmarkResult | null>(null);
  const [isRunningBench, setIsRunningBench] = useState(false);
  const [minCutoff, setMinCutoff] = useState(1.5);
  const [beta, setBeta] = useState(0.007);

  // Live dual-trace signal buffers
  const historyRef = useRef<{ raw: number[]; filtered: number[]; trueSignal: number[] }>({
    raw: [],
    filtered: [],
    trueSignal: [],
  });

  const filterStateRef = useRef<{ xPrev: number | null; dxPrev: number }>({
    xPrev: null,
    dxPrev: 0,
  });

  useEffect(() => {
    // Initial benchmark fetch
    ShadowBoxerApiClient.runBenchmark().then(setBenchmark);
  }, []);

  useEffect(() => {
    let animationFrameId: number;
    let step = 0;

    const renderLoop = () => {
      step += 1;
      const t = step * 0.03;
      const trueVal = 0.5 + 0.3 * Math.sin(t * 1.5);
      const highFreqNoise = (Math.random() - 0.5) * 0.18;
      const rawSample = trueVal + highFreqNoise;

      // 1 Euro Filter algorithm step
      const state = filterStateRef.current;
      const dt = 0.016;
      let filteredVal = rawSample;

      if (state.xPrev !== null) {
        const dx = (rawSample - state.xPrev) / dt;
        const tauD = 1.0 / (2.0 * Math.PI * 1.0);
        const alphaD = 1.0 / (1.0 + tauD / dt);
        const edx = alphaD * dx + (1.0 - alphaD) * state.dxPrev;
        state.dxPrev = edx;

        const cutoff = minCutoff + beta * Math.abs(edx);
        const tau = 1.0 / (2.0 * Math.PI * cutoff);
        const alpha = 1.0 / (1.0 + tau / dt);
        filteredVal = alpha * rawSample + (1.0 - alpha) * state.xPrev;
      }
      state.xPrev = filteredVal;

      // Store in rolling buffer
      const hist = historyRef.current;
      hist.raw.push(rawSample);
      hist.filtered.push(filteredVal);
      hist.trueSignal.push(trueVal);

      if (hist.raw.length > 200) {
        hist.raw.shift();
        hist.filtered.shift();
        hist.trueSignal.shift();
      }

      drawOscilloscope();
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [minCutoff, beta]);

  const drawOscilloscope = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let y = 0; y <= height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const hist = historyRef.current;
    if (hist.raw.length < 2) return;

    const mapY = (val: number) => height - val * height;
    const stepX = width / 200;

    // 1. Draw Raw Noisy Signal (Red/Orange)
    ctx.strokeStyle = "#ff3b5c";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    hist.raw.forEach((val, idx) => {
      const x = idx * stepX;
      const y = mapY(val);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 2. Draw OneEuroFilter Smoothed Signal (Cyan Glow)
    ctx.shadowBlur = 10;
    ctx.shadowColor = "#00f0ff";
    ctx.strokeStyle = "#00f0ff";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    hist.filtered.forEach((val, idx) => {
      const x = idx * stepX;
      const y = mapY(val);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  const handleRunBenchmark = async () => {
    setIsRunningBench(true);
    const result = await ShadowBoxerApiClient.runBenchmark();
    setBenchmark(result);
    setIsRunningBench(false);
  };

  return (
    <div style={{ background: "rgba(10, 16, 26, 0.75)", borderRadius: 12, padding: 18, border: "1px solid rgba(0, 240, 255, 0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <h4 style={{ margin: 0, color: "#00f0ff", fontSize: 16, textTransform: "uppercase", letterSpacing: 1.2 }}>
            1 Euro Filter vs Raw Signal Oscilloscope
          </h4>
          <span style={{ fontSize: 12, color: "#8a99ad" }}>
            Dynamic adaptive cutoff frequency based on instantaneous limb velocity ($dx/dt$)
          </span>
        </div>
        <button
          onClick={handleRunBenchmark}
          disabled={isRunningBench}
          style={{
            background: "rgba(0, 240, 255, 0.15)",
            color: "#00f0ff",
            border: "1px solid rgba(0, 240, 255, 0.4)",
            padding: "8px 14px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {isRunningBench ? "Benchmarking..." : "Run Physics Benchmark"}
        </button>
      </div>

      <div style={{ position: "relative", width: "100%", height: 200, background: "#050811", borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
        <canvas ref={canvasRef} width={700} height={200} style={{ width: "100%", height: "100%" }} />
        <div style={{ position: "absolute", top: 10, right: 12, display: "flex", gap: 14, fontSize: 11 }}>
          <span style={{ color: "#ff3b5c", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 3, background: "#ff3b5c", display: "inline-block" }}></span>
            Raw Noisy Landmark
          </span>
          <span style={{ color: "#00f0ff", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 3, background: "#00f0ff", display: "inline-block" }}></span>
            1 Euro Adaptive Filter
          </span>
        </div>
      </div>

      {/* Benchmark Metrics Cards */}
      {benchmark && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Jitter Reduction</div>
            <div style={{ fontSize: 18, color: "#00f0ff", fontWeight: 700, marginTop: 4 }}>
              {benchmark.jitter_reduction_percentage}%
            </div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Throughput</div>
            <div style={{ fontSize: 18, color: "#ffffff", fontWeight: 700, marginTop: 4 }}>
              {(benchmark.throughput_samples_per_sec / 1000).toFixed(0)}k <span style={{ fontSize: 11 }}>samples/s</span>
            </div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Per-Frame Overhead</div>
            <div style={{ fontSize: 18, color: "#00ff88", fontWeight: 700, marginTop: 4 }}>
              {benchmark.latency_overhead_ms} <span style={{ fontSize: 11 }}>ms</span>
            </div>
          </div>
          <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <div style={{ fontSize: 11, color: "#8a99ad", textTransform: "uppercase" }}>Samples Evaluated</div>
            <div style={{ fontSize: 18, color: "#ffffff", fontWeight: 700, marginTop: 4 }}>
              {benchmark.samples_processed.toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
