"use client";

import React, { useEffect } from "react";
import Script from "next/script";

export default function ShadowBoxerClient() {
  useEffect(() => {
    // If Script is already loaded or initialized in window
    if (typeof window !== "undefined" && (window as unknown as { ShadowBoxerApp?: unknown }).ShadowBoxerApp) {
      // Re-init if needed
    }
  }, []);

  return (
    <>
      {/* Background Grid & Glowing Orbs */}
      <div className="bg-effects">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
        <div className="grid-overlay"></div>
      </div>

      {/* WASM Loading Overlay */}
      <div id="loading-overlay" className="loading-overlay">
        <div className="loading-box">
          <div className="spinner-container">
            <div className="spinner"></div>
            <div className="spinner-inner"></div>
          </div>
          <h2>SHADOW BOXER</h2>
          <p id="loading-status">Loading WebAssembly Pose Model...</p>
          <div className="progress-bar-container">
            <div id="loading-progress" className="progress-bar" style={{ width: "0%" }}></div>
          </div>
        </div>
      </div>

      {/* Flash Effect Overlay for punch detection */}
      <div id="punch-flash" className="punch-flash"></div>
      <div id="pow-overlay" className="pow-overlay">POW!</div>

      {/* Main Layout */}
      <main className="app-container">
        
        {/* Top Header */}
        <header className="app-header">
          <div className="brand">
            <div className="logo-box">
              <svg className="logo-svg" viewBox="0 0 100 100" width="36" height="36">
                <g filter="drop-shadow(0 0 5px rgba(0, 229, 255, 0.6))">
                  <path d="M 32 38 C 32 28, 42 20, 52 20 C 62 20, 68 26, 68 34 C 68 40, 64 45, 58 48 C 65 52, 68 58, 68 64 C 68 72, 60 80, 48 80 C 38 80, 32 72, 32 64 M 32 50 L 52 50" fill="none" stroke="url(#logo-grad)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M 32 38 C 24 38, 20 44, 20 50 C 20 56, 24 62, 32 62" fill="none" stroke="#00ff9f" strokeWidth="5" strokeLinecap="round"/>
                </g>
                <defs>
                  <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00e5ff" />
                    <stop offset="100%" stopColor="#ff007f" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <div className="brand-text">
              <h1>SHADOW <span className="accent-text">BOXER</span></h1>
              <span className="version-tag">WASM ENGINE v1.2</span>
            </div>
          </div>

          <div className="privacy-badge">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="icon-shield"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span>100% LOCAL PROCESSING</span>
          </div>
        </header>

        <div className="workspace-grid">
          
          {/* Left Panel: Live Dashboard & Metrics */}
          <section className="panel-column left-panel">
            
            {/* Quick Stats Banner */}
            <div className="stat-card main-combo-card">
              <div className="combo-title">CURRENT COMBO</div>
              <div id="combo-count" className="combo-number">0</div>
              <div id="combo-level" className="combo-sub">GET READY</div>
              <button type="button" id="btn-get-started" className="btn btn-primary glow-btn btn-get-started" style={{ marginTop: "0.8rem", width: "100%", fontSize: "0.85rem", padding: "0.6rem 1rem" }}>
                GET STARTED
              </button>
            </div>

            {/* Training Focus Mode Card */}
            <div className="stat-card focus-mode-card">
              <div className="card-glow"></div>
              <h3>TRAINING FOCUS MODE</h3>
              <div className="focus-btn-group">
                <button id="btn-focus-upper" className="btn-focus active" data-focus="upper">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <path d="M 6 12 C 6 8, 9 6, 12 6 C 15 6, 18 8, 18 12 C 18 15, 15 17, 12 17 L 9 17 L 6 15 Z" />
                    <path d="M 6 12 C 4 12, 3 13, 3 14.5 C 3 16, 4 17, 6 17" />
                    <line x1="9" y1="17" x2="9" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                  <span>UPPER HALF</span>
                </button>
                <button id="btn-focus-lower" className="btn-focus" data-focus="lower">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <path d="M 4 16 L 8 16 L 11 11 L 18 11 C 20 11, 21 12.5, 21 14 L 21 17 C 21 18.5, 19.5 20, 18 20 L 4 20 Z" />
                    <circle cx="7" cy="18" r="1" />
                  </svg>
                  <span>LOWER HALF</span>
                </button>
                <button id="btn-focus-full" className="btn-focus" data-focus="full">
                  <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2.5" fill="none">
                    <circle cx="12" cy="5" r="2.5" />
                    <path d="M 12 7.5 L 12 14 M 12 9 L 7 11 M 12 9 L 17 11 M 12 14 L 9 20 M 12 14 L 15 20" />
                  </svg>
                  <span>FULL BODY</span>
                </button>
              </div>
            </div>

            {/* Combo Challenger Card */}
            <div className="stat-card challenger-card">
              <div className="card-glow"></div>
              <div className="challenger-header">
                <h3>COMBO CHALLENGER</h3>
                <span id="challenger-badge" className="badge streak-badge">STREAK: 0</span>
              </div>
              <div className="target-combo-display" id="target-combo-display">
                {/* Populated by JS */}
              </div>
              <div className="challenger-sub">
                <span className="sub-label">NEXT: <strong id="target-next-strike" className="accent-magenta">JAB</strong></span>
                <span id="challenger-feedback" className="sub-hint">Follow the sequence!</span>
              </div>
            </div>

            {/* Metric Speed & Power Gauges */}
            <div className="metrics-row">
              <div className="stat-card metric-card">
                <div className="metric-header">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                  <span>LAST PUNCH SPEED</span>
                </div>
                <div className="metric-val-group">
                  <span id="stat-speed" className="metric-val">0.0</span>
                  <span className="metric-unit">m/s</span>
                </div>
                <div className="metric-gauge">
                  <div id="speed-progress-bar" className="gauge-fill speed-fill" style={{ width: "0%" }}></div>
                </div>
                <div className="metric-sub">Peak: <span id="peak-speed">0.0</span> m/s</div>
              </div>

              <div className="stat-card metric-card">
                <div className="metric-header">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>
                  <span>PUNCH FORCE</span>
                </div>
                <div className="metric-val-group">
                  <span id="stat-power" className="metric-val">0</span>
                  <span className="metric-unit">%</span>
                </div>
                <div className="metric-gauge">
                  <div id="power-progress-bar" className="gauge-fill power-fill" style={{ width: "0%" }}></div>
                </div>
                <div className="metric-sub">Peak: <span id="peak-power">0</span>%</div>
              </div>
            </div>

            {/* Punch Type Distribution */}
            <div className="stat-card punch-counters-card">
              <h3>PUNCH COUNTERS</h3>
              <div className="punch-grid">
                <div className="punch-stat-box main-count">
                  <span className="stat-label">TOTAL PUNCHES</span>
                  <span id="total-punches" className="stat-number">0</span>
                </div>
                <div className="punch-sub-grid">
                  <div className="punch-sub-stat">
                    <span className="punch-name">JAB / CROSS</span>
                    <span id="count-jab" className="punch-number">0</span>
                  </div>
                  <div className="punch-sub-stat">
                    <span className="punch-name">HOOK</span>
                    <span id="count-hook" className="punch-number">0</span>
                  </div>
                  <div className="punch-sub-stat">
                    <span className="punch-name">UPPERCUT</span>
                    <span id="count-uppercut" className="punch-number">0</span>
                  </div>
                  <div className="punch-sub-stat">
                    <span className="punch-name">UNCLASSIFIED</span>
                    <span id="count-other" className="punch-number">0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Caloric & Time Analysis */}
            <div className="stat-card calories-card">
              <div className="card-glow"></div>
              <div className="cal-row">
                <div className="cal-item">
                  <span className="cal-label">ACTIVE TIME</span>
                  <span id="workout-timer" className="cal-val">00:00</span>
                </div>
                <div className="divider"></div>
                <div className="cal-item">
                  <span className="cal-label">CALORIES BURNED</span>
                  <span id="calories-burned" className="cal-val">0.0</span>
                  <span className="cal-unit">kcal</span>
                </div>
              </div>
            </div>
          </section>

          {/* Center & Right Panel: Video Arena and Controls */}
          <section className="panel-column arena-column">
            
            {/* Video Arena */}
            <div className="arena-card">
              <div className="arena-header">
                <div className="status-indicator">
                  <span id="engine-dot" className="status-dot offline"></span>
                  <span id="engine-status" className="status-text">SYSTEM OFFLINE</span>
                </div>
                <div className="fps-counter">FPS: <span id="fps-val">--</span></div>
              </div>

              {/* Main Arena Workspace Row */}
              <div className="arena-workspace-row">
                {/* Interactive Structured Trainer HUD */}
                <div id="trainer-hud" className="trainer-hud-banner">
                  <div className="trainer-hud-header">
                    <span className="hud-phase-label">TRAINING PHASE: <strong id="hud-phase-name">PHASE 1 (STANCE)</strong></span>
                    <span id="hud-phase-progress" className="hud-phase-progress">HOLD STANCE</span>
                    <button type="button" id="btn-skip-phase" className="btn-build" style={{ fontSize: "0.6rem", padding: "2px 6px", marginLeft: "auto" }}>SKIP STANCE</button>
                  </div>
                  <div id="hud-instructions" className="hud-instructions">ASSUME BOXING STANCE: Hands up near chin, feet staggered, knees slightly bent.</div>
                  <div id="hud-stance-checkers" className="hud-stance-checkers">
                    <span id="chk-guard" className="hud-check-item fail">GUARD</span>
                    <span id="chk-feet" className="hud-check-item fail">FEET STANCE</span>
                    <span id="chk-knees" className="hud-check-item fail">KNEE BEND</span>
                  </div>
                  <div id="hud-move-selector" className="hud-move-selector hidden">
                    <button type="button" className="btn-learn-move active" data-move="JAB/CROSS">JAB/CROSS</button>
                    <button type="button" className="btn-learn-move" data-move="HOOK">HOOK</button>
                    <button type="button" className="btn-learn-move" data-move="UPPERCUT">UPPERCUT</button>
                    <button type="button" className="btn-learn-move" data-move="DUCK">DUCK/WEAVE</button>
                  </div>

                  {/* Integrated AI Coach Strip */}
                  <div className="hud-ai-coach-strip">
                    <div className="feedback-indicator">
                      <div className="pulse-dot"></div>
                      <span>AI COACH:</span>
                    </div>
                    <div id="coach-message" className="coach-text-single">Stand in front of the camera and assume guard stance to begin.</div>
                  </div>

                  {/* Dedicated Next Action HUD Strip */}
                  <div id="hud-next-strip" className="hud-next-strip">
                    <span className="hud-next-label">NEXT TARGET / ACTION:</span>
                    <span id="hud-next-strike-val" className="hud-next-val">JAB/CROSS</span>
                  </div>
                </div>

                <div className="video-container">
                  {/* Mirror webcam feed */}
                  <video id="webcam" autoPlay playsInline muted></video>
                  {/* Draw Pose skeleton overlay */}
                  <canvas id="canvas-overlay"></canvas>
                  
                  {/* Setup Warning Overlay */}
                  <div id="webcam-warning" className="webcam-warning hidden">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <h3>Camera Access Needed</h3>
                    <p>Please grant camera access permission to track punches in real time.</p>
                    <button id="btn-grant-camera" className="btn btn-primary glow-btn">Grant Camera Permission</button>
                  </div>
                </div>
              </div>
              
              {/* Quick Control Strip under Video */}
              <div className="arena-footer">
                <div className="controls-row">
                  <div className="btn-group">
                    <button id="btn-toggle-camera" className="btn btn-primary" disabled>
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" className="icon-camera"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      <span id="toggle-camera-txt">Start Workout</span>
                    </button>
                    <button id="btn-reset" className="btn btn-secondary">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
                      <span>Reset Stats</span>
                    </button>
                  </div>

                  <div className="btn-group font-settings">
                    {/* Sound Toggle */}
                    <button id="btn-mute" className="btn btn-icon" title="Toggle Sound FX">
                      <svg id="mute-icon-on" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                      <svg id="mute-icon-off" className="hidden" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                    </button>
                    
                    {/* Delegation Selector */}
                    <div className="select-wrapper">
                      <label htmlFor="select-delegate" className="sr-only">Processor delegation</label>
                      <select id="select-delegate" className="select-input" defaultValue="GPU">
                        <option value="GPU">Engine: GPU (60 FPS)</option>
                        <option value="CPU">Engine: CPU (Low Power)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Physics & Workout Customizer */}
            <div className="stat-card settings-card">
              <div className="card-glow" style={{ background: "linear-gradient(90deg, var(--neon-cyan), transparent)" }}></div>
              
              <div className="settings-flex-row">
                <div className="settings-group">
                  <h3>WORKOUT ROUTINE</h3>
                  <div className="select-wrapper">
                    <label htmlFor="select-routine" className="sr-only">Workout routine selector</label>
                    <select id="select-routine" className="select-input" defaultValue="all">
                      <option value="all">Mixed combos (Default)</option>
                      <option value="cardio">Cardio Blitz (Speed 1-2s)</option>
                      <option value="power">Heavy Hitter (Power Strikes)</option>
                      <option value="defense">Elusive Boxer (Slip & Duck focus)</option>
                      <option value="custom">Custom Combo Builder...</option>
                    </select>
                  </div>
                </div>
                
                <div id="custom-builder-container" className="settings-group hidden">
                  <h3>CUSTOM BUILDER</h3>
                  <div className="builder-buttons">
                    <button type="button" className="btn-build" data-strike="JAB/CROSS">JAB</button>
                    <button type="button" className="btn-build" data-strike="HOOK">HOOK</button>
                    <button type="button" className="btn-build" data-strike="UPPERCUT">UPPER</button>
                    <button type="button" className="btn-build" data-strike="DUCK">DUCK</button>
                    <button type="button" className="btn-build" data-strike="SLIP">SLIP</button>
                    <button type="button" id="btn-clear-custom" className="btn-build btn-clear">CLEAR</button>
                  </div>
                </div>
              </div>

              <div className="settings-grid">
                <div className="setting-item">
                  <div className="setting-labels">
                    <span className="setting-name">PUNCH VELOCITY THRESHOLD</span>
                    <span id="val-speed-threshold" className="setting-val">1.5 m/s</span>
                  </div>
                  <input id="range-speed-threshold" type="range" min="0.8" max="6.0" step="0.1" defaultValue="1.5" className="range-slider" />
                </div>

                <div className="setting-item">
                  <div className="setting-labels">
                    <span className="setting-name">JITTER SMOOTHING FILTER</span>
                    <span id="val-filter-cutoff" className="setting-val">1.5 Hz</span>
                  </div>
                  <input id="range-filter-cutoff" type="range" min="0.5" max="3.0" step="0.1" defaultValue="1.5" className="range-slider" />
                </div>
              </div>
            </div>

          </section>
          
        </div>
      </main>

      {/* Execute Client-side Engine script dynamically as ES Module */}
      <Script src="/app.js" type="module" strategy="lazyOnload" />
    </>
  );
}
