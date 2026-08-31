/**
 * SHADOW BOXER - ENGINE CORE
 * 
 * High-performance browser-based boxing physics engine.
 * Uses MediaPipe Pose (WASM + GPU delegation) for 60 FPS skeleton tracking.
 * Calculates physical velocity (m/s) and acceleration (m/s²) using metric coordinates.
 * Dynamic audio feedback via Web Audio API, OneEuroFilter smoothing, and real-time coaching feedback.
 */

import { FilesetResolver, PoseLandmarker } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm";

// ==========================================
// 1. SIGNAL PROCESSING: ONE-EURO FILTER
// ==========================================

/**
 * OneEuroFilter implementation for smoothing noisy coordinates.
 * Dynamically adjusts cutoff frequency based on movement velocity.
 */
class OneEuroFilter {
  constructor(minCutoff = 1.7, beta = 0.04, dcutoff = 1.2) {
    // Tuned for boxing: higher beta lets fast punches pass through
    // with minimal latency, while slow/idle hands stay smooth
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dcutoff = dcutoff;
    this.xPrev = null;
    this.dxPrev = null;
  }

  filter(x, dt) {
    if (this.xPrev === null || dt <= 0) {
      this.xPrev = x;
      this.dxPrev = 0;
      return x;
    }
    const dx = (x - this.xPrev) / dt;
    const edx = this.lowPassFilter(dx, this.dxPrev, this.alpha(dt, this.dcutoff));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const rx = this.lowPassFilter(x, this.xPrev, this.alpha(dt, cutoff));
    
    this.xPrev = rx;
    this.dxPrev = edx;
    return rx;
  }

  lowPassFilter(x, xPrev, alpha) {
    return alpha * x + (1.0 - alpha) * xPrev;
  }

  alpha(dt, cutoff) {
    const tau = 1.0 / (2.0 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  reset() {
    this.xPrev = null;
    this.dxPrev = null;
  }
}

/**
 * 3D implementation of OneEuroFilter to filter x, y, and z axes.
 */
class OneEuroFilter3D {
  constructor(minCutoff = 1.7, beta = 0.04, dcutoff = 1.2) {
    this.xFilter = new OneEuroFilter(minCutoff, beta, dcutoff);
    this.yFilter = new OneEuroFilter(minCutoff, beta, dcutoff);
    this.zFilter = new OneEuroFilter(minCutoff, beta, dcutoff);
  }

  filter(point, dt) {
    if (!point) return null;
    return {
      x: this.xFilter.filter(point.x, dt),
      y: this.yFilter.filter(point.y, dt),
      z: this.zFilter.filter(point.z, dt),
      visibility: point.visibility
    };
  }

  updateParams(minCutoff) {
    this.xFilter.minCutoff = minCutoff;
    this.yFilter.minCutoff = minCutoff;
    this.zFilter.minCutoff = minCutoff;
  }

  reset() {
    this.xFilter.reset();
    this.yFilter.reset();
    this.zFilter.reset();
  }
}

// ==========================================
// 2. AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================

/**
 * Generates synthetic sound effects locally in the browser.
 * Swoosh: bandpass-filtered noise swept in frequency.
 * Impact: low-frequency sine boom combined with high-frequency lowpass noise.
 */
class AudioSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playSwoosh() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    
    // Create white noise buffer
    const bufferSize = this.ctx.sampleRate * 0.2; // 200ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Swept bandpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.exponentialRampToValueAtTime(700, now + 0.08);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.2);
    filter.Q.setValueAtTime(6, now);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start(now);
    noise.stop(now + 0.2);
  }

  playHit(powerPercent) {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const force = Math.max(0.1, Math.min(1.0, powerPercent / 100));

    // Bass boom oscillator
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);

    oscGain.gain.setValueAtTime(force * 0.7, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    // Punch crisp snap (noise burst)
    const bufferSize = this.ctx.sampleRate * 0.08;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(800, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(force * 0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Connections
    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    noise.start(now);

    osc.stop(now + 0.3);
    noise.stop(now + 0.1);
  }

  playTone(freq, type = "sine", duration = 0.1) {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("Tone play failed:", e);
    }
  }
}

// ==========================================
// 3. STATE MANAGEMENT
// ==========================================

class BoxerState {
  constructor() {
    this.reset();
  }

  reset() {
    this.totalPunches = 0;
    this.jabs = 0;
    this.hooks = 0;
    this.uppercuts = 0;
    this.unclassified = 0;
    
    this.currentCombo = 0;
    this.peakCombo = 0;
    this.lastPunchTime = 0;

    this.peakSpeed = 0;
    this.peakPower = 0;
    this.calories = 0;
    this.startTime = null;
    this.elapsedSeconds = 0;
  }

  addPunch(speed, power, type) {
    this.totalPunches++;
    
    // Classify
    if (type === "JAB/CROSS") this.jabs++;
    else if (type === "HOOK") this.hooks++;
    else if (type === "UPPERCUT") this.uppercuts++;
    else this.unclassified++;

    // Track peaks
    if (speed > this.peakSpeed) this.peakSpeed = speed;
    if (power > this.peakPower) this.peakPower = power;

    // Calorie formula (approximation based on kinetic energy + dynamic metabolic work)
    this.calories += (0.12 * (speed / 5.0)) + 0.03;

    // Combo system
    const now = performance.now();
    if (now - this.lastPunchTime < 3000) {
      this.currentCombo++;
      if (this.currentCombo > this.peakCombo) {
        this.peakCombo = this.currentCombo;
      }
    } else {
      this.currentCombo = 1;
    }
    this.lastPunchTime = now;
  }

  updateTimer() {
    if (!this.startTime) return "00:00";
    this.elapsedSeconds = Math.floor((performance.now() - this.startTime) / 1000);
    const m = String(Math.floor(this.elapsedSeconds / 60)).padStart(2, "0");
    const s = String(this.elapsedSeconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  getComboLevel() {
    if (this.currentCombo < 2) return "GET READY";
    if (this.currentCombo < 5) return "GOOD STRIKES!";
    if (this.currentCombo < 8) return "UNSTOPPABLE!";
    if (this.currentCombo < 12) return "GODLIKE SPEED!";
    return "SONIC DEMON!";
  }
}

// ==========================================
// 4. PHYSICS & STRIKE TRACKING MACHINE
// ==========================================

class HandTracker {
  constructor(side, minCutoff) {
    this.side = side; // "left" or "right"
    this.filter = new OneEuroFilter3D(minCutoff, 0.04, 1.2);
    this.prevPos = null;
    this.prevSpeed = 0;
    this.smoothSpeed = 0; // EMA-smoothed speed for display
    this.maxSpeedThisPunch = 0;
    this.isPunching = false;
    this.punchStartPos = null;
    this.punchStartTime = 0;
    this.lastPunchEndTime = 0; // Cooldown to prevent double-fires
    this.extensionHistory = [];
    this.speedHistory = []; // Rolling window for velocity smoothing
  }

  reset() {
    this.filter.reset();
    this.prevPos = null;
    this.prevSpeed = 0;
    this.smoothSpeed = 0;
    this.maxSpeedThisPunch = 0;
    this.isPunching = false;
    this.punchStartPos = null;
    this.lastPunchEndTime = 0;
    this.extensionHistory = [];
    this.speedHistory = [];
  }

  processFrame(wristWorld, shoulderWorld, elbowWorld, dt, threshold, onPunchDetected) {
    // 1. Visibility Gating: relaxed to 0.25 to avoid dropping fast-moving hands
    if (!wristWorld || !shoulderWorld || dt <= 0 || (wristWorld.visibility !== undefined && wristWorld.visibility < 0.25)) {
      this.prevPos = null;
      this.isPunching = false;
      this.maxSpeedThisPunch = 0;
      this.punchStartPos = null;
      this.extensionHistory = [];
      this.speedHistory = [];
      return { speed: 0, acceleration: 0 };
    }

    // Clamp dt to prevent insane spikes from tab-switch or lag
    const clampedDt = Math.min(dt, 0.1);

    // Apply OneEuroFilter to coordinate jitter reduction
    const filteredWrist = this.filter.filter(wristWorld, clampedDt);

    if (!this.prevPos) {
      this.prevPos = filteredWrist;
      return { speed: 0, acceleration: 0 };
    }

    // 1. Calculate velocity from filtered coordinates (meters/second)
    const dx = filteredWrist.x - this.prevPos.x;
    const dy = filteredWrist.y - this.prevPos.y;
    const dz = filteredWrist.z - this.prevPos.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const rawSpeed = dist / clampedDt;

    // Clamp unrealistic speed spikes (human punch max ~15 m/s)
    const speed = Math.min(rawSpeed, 18.0);

    // Rolling average over last 3 frames for smoother display
    this.speedHistory.push(speed);
    if (this.speedHistory.length > 3) this.speedHistory.shift();
    this.smoothSpeed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;

    const acceleration = (speed - this.prevSpeed) / clampedDt; // m/s²

    // 2. Measure extension from the corresponding shoulder (in meters)
    const sDx = filteredWrist.x - shoulderWorld.x;
    const sDy = filteredWrist.y - shoulderWorld.y;
    const sDz = filteredWrist.z - shoulderWorld.z;
    const extension = Math.sqrt(sDx*sDx + sDy*sDy + sDz*sDz);

    this.extensionHistory.push(extension);
    if (this.extensionHistory.length > 10) this.extensionHistory.shift();

    // Check if arm is moving outward (extending) using 2-frame trend (relaxed for responsiveness)
    const extLen = this.extensionHistory.length;
    const isExtending = extLen >= 2 &&
      this.extensionHistory[extLen - 1] > this.extensionHistory[extLen - 2];

    // 3. State Machine for Punch Detection
    const now = performance.now();
    const cooldownMs = 150; // Min ms between punch registrations (reduced for responsiveness)

    if (!this.isPunching) {
      // Trigger Punch Start: speed exceeds threshold AND (arm extending OR high speed burst)
      const speedBurst = speed > threshold * 1.2; // Fast movement triggers instantly
      if (speed > threshold * 0.7 && (isExtending || speedBurst) && (now - this.lastPunchEndTime) > cooldownMs) {
        this.isPunching = true;
        this.maxSpeedThisPunch = speed;
        this.punchStartPos = { ...filteredWrist };
        this.punchStartTime = now;
      }
    } else {
      // Track peak velocity during the extending strike
      if (speed > this.maxSpeedThisPunch) {
        this.maxSpeedThisPunch = speed;
      }

      // Trigger Impact: Speed drops or arm retracts (relaxed thresholds)
      const speedDropped = speed < this.maxSpeedThisPunch * 0.5;
      const isRetracting = extLen >= 2 &&
        this.extensionHistory[extLen - 1] < this.extensionHistory[extLen - 2];

      // Also timeout: if punch lasts > 1000ms it's not a real punch
      const punchDuration = (now - this.punchStartTime) / 1000;
      const timedOut = punchDuration > 1.0;

      if (speedDropped || isRetracting || timedOut) {
        // Validate it's a real strike (responsive timing & threshold checks)
        if (this.maxSpeedThisPunch >= threshold * 0.65 && punchDuration >= 0.01 && punchDuration < 1.1) {
          
          // Classify punch using direction vector + elbow geometry
          const punchVec = {
            x: filteredWrist.x - this.punchStartPos.x,
            y: filteredWrist.y - this.punchStartPos.y,
            z: filteredWrist.z - this.punchStartPos.z
          };
          
          const type = this.classifyPunch(punchVec, elbowWorld, shoulderWorld, filteredWrist);

          // Calculate trajectory alignment score relative to dominant axis
          let alignmentScore = 1.0;
          const totalDist = Math.sqrt(punchVec.x*punchVec.x + punchVec.y*punchVec.y + punchVec.z*punchVec.z);
          if (totalDist > 0.005) { // Minimum displacement threshold
            if (type === "JAB/CROSS") {
              alignmentScore = Math.abs(punchVec.z) / totalDist;
            } else if (type === "HOOK") {
              alignmentScore = Math.abs(punchVec.x) / totalDist;
            } else if (type === "UPPERCUT") {
              alignmentScore = Math.abs(punchVec.y) / totalDist;
            }
          }
          const alignmentPct = Math.round(Math.min(1, alignmentScore) * 100);
          
          // Power: weighted by speed and extension distance scaled by strike type
          const extDist = totalDist;
          let targetExt = 0.45;
          if (type === "HOOK") targetExt = 0.32;
          else if (type === "UPPERCUT") targetExt = 0.25;

          const speedFactor = this.maxSpeedThisPunch / 10.0;
          const extFactor = Math.min(1.0, extDist / targetExt);
          const power = Math.min(100, Math.round((speedFactor * 0.75 + extFactor * 0.25) * 100));

          onPunchDetected(this.side, this.maxSpeedThisPunch, power, type, alignmentPct);
        }
        this.isPunching = false;
        this.maxSpeedThisPunch = 0;
        this.punchStartPos = null;
        this.lastPunchEndTime = now;
      }
    }

    this.prevPos = filteredWrist;
    this.prevSpeed = speed;

    return { speed: this.smoothSpeed, acceleration };
  }

  classifyPunch(vec, elbowWorld, shoulderWorld, wristWorld) {
    const absX = Math.abs(vec.x);
    const absY = Math.abs(vec.y);
    const absZ = Math.abs(vec.z);
    
    // Z is depth (toward camera), Y is vertical, X is horizontal
    const maxVal = Math.max(absX, absY, absZ);

    // Use elbow angle to disambiguate hook vs jab when available
    if (elbowWorld && shoulderWorld && wristWorld) {
      // Calculate elbow angle: shoulder→elbow→wrist
      const vSE = { x: shoulderWorld.x - elbowWorld.x, y: shoulderWorld.y - elbowWorld.y, z: shoulderWorld.z - elbowWorld.z };
      const vWE = { x: wristWorld.x - elbowWorld.x, y: wristWorld.y - elbowWorld.y, z: wristWorld.z - elbowWorld.z };
      const dot = vSE.x*vWE.x + vSE.y*vWE.y + vSE.z*vWE.z;
      const mSE = Math.sqrt(vSE.x*vSE.x + vSE.y*vSE.y + vSE.z*vSE.z);
      const mWE = Math.sqrt(vWE.x*vWE.x + vWE.y*vWE.y + vWE.z*vWE.z);
      const elbowAngle = (mSE * mWE > 0) ? Math.acos(Math.max(-1, Math.min(1, dot / (mSE * mWE)))) * (180 / Math.PI) : 180;

      // Hook: strict bent elbow (<115°) + distinct lateral X motion
      if (elbowAngle < 115 && absX > absZ * 1.1 && absX > absY * 0.8) {
        return "HOOK";
      }
    }

    // Dominant-axis classification (strict thresholds for hooks/uppercuts)
    if (maxVal === absY && vec.y < 0 && absY > absX * 0.85) {
      return "UPPERCUT"; // Upward vertical punch (negative Y = upward in world coords)
    } else if (maxVal === absX && absX > absZ * 1.3 && absX > absY * 1.2) {
      return "HOOK";
    }
    
    // Default to JAB/CROSS for all forward and extended punches
    return "JAB/CROSS";
  }
}

// ==========================================
// 5. MAIN SHADOW BOXER ENGINE APPLICATION
// ==========================================

class ShadowBoxerApp {
  constructor() {
    this.state = new BoxerState();
    this.synth = new AudioSynth();
    
    // DOM Cache
    this.video = document.getElementById("webcam");
    this.canvas = document.getElementById("canvas-overlay");
    this.ctx = this.canvas.getContext("2d");
    
    this.loadingOverlay = document.getElementById("loading-overlay");
    this.loadingStatus = document.getElementById("loading-status");
    this.loadingProgress = document.getElementById("loading-progress");
    
    this.btnToggleCamera = document.getElementById("btn-toggle-camera");
    this.btnReset = document.getElementById("btn-reset");
    this.btnMute = document.getElementById("btn-mute");
    this.selectDelegate = document.getElementById("select-delegate");
    this.warningOverlay = document.getElementById("webcam-warning");
    this.btnGrantCamera = document.getElementById("btn-grant-camera");

    // Sliders
    this.sliderSpeed = document.getElementById("range-speed-threshold");
    this.valSpeed = document.getElementById("val-speed-threshold");
    this.sliderFilter = document.getElementById("range-filter-cutoff");
    this.valFilter = document.getElementById("val-filter-cutoff");

    // Stats elements
    this.statSpeed = document.getElementById("stat-speed");
    this.statPower = document.getElementById("stat-power");
    this.peakSpeedEl = document.getElementById("peak-speed");
    this.peakPowerEl = document.getElementById("peak-power");
    this.totalPunchesEl = document.getElementById("total-punches");
    this.comboCountEl = document.getElementById("combo-count");
    this.comboLevelEl = document.getElementById("combo-level");
    this.countJabEl = document.getElementById("count-jab");
    this.countHookEl = document.getElementById("count-hook");
    this.countUppercutEl = document.getElementById("count-uppercut");
    this.countOtherEl = document.getElementById("count-other");
    this.caloriesBurnedEl = document.getElementById("calories-burned");
    this.workoutTimerEl = document.getElementById("workout-timer");
    
    this.coachMessageEl = document.getElementById("coach-message");
    this.fpsValEl = document.getElementById("fps-val");
    this.engineDot = document.getElementById("engine-dot");
    this.engineStatus = document.getElementById("engine-status");

    // Dynamic thresholds
    this.velocityThreshold = parseFloat(this.sliderSpeed.value);
    this.filterCutoff = parseFloat(this.sliderFilter.value);

    // Trackers
    this.leftTracker = new HandTracker("left", this.filterCutoff);
    this.rightTracker = new HandTracker("right", this.filterCutoff);

    // App state
    this.poseLandmarker = null;
    this.cameraStream = null;
    this.isCameraActive = false;
    this.lastVideoTime = -1;
    this.animationId = null;
    this.fpsLastTime = performance.now();
    this.fpsFrames = 0;

    // Focus buttons & Stance checks
    this.btnFocusUpper = document.getElementById("btn-focus-upper");
    this.btnFocusLower = document.getElementById("btn-focus-lower");
    this.btnFocusFull = document.getElementById("btn-focus-full");
    this.activeFocusMode = "upper";
    this.activeErrors = {
      guardDropped: false,
      elbowFlare: false,
      kneesLocked: false,
      stanceSquare: false,
      feetClose: false
    };
    this.postureFrameCounter = 0;
    
    // UI Effects
    this.punchFlash = document.getElementById("punch-flash");
    this.powOverlay = document.getElementById("pow-overlay");

    // Combo Challenger State
    this.challengeStreak = 0;
    this.challengeStepIndex = 0;
    this.currentChallengeCombo = [];
    this.combosPool = [
      ["HOOK", "HOOK"],
      ["HOOK", "UPPERCUT"],
      ["UPPERCUT", "HOOK", "UPPERCUT"],
      ["HOOK", "DUCK", "HOOK"],
      ["UPPERCUT", "SLIP", "HOOK"],
      ["DUCK", "UPPERCUT", "HOOK"],
      ["SLIP", "HOOK", "UPPERCUT"]
    ];

    this.challengerBadge = document.getElementById("challenger-badge");
    this.targetComboDisplay = document.getElementById("target-combo-display");
    this.targetNextStrike = document.getElementById("target-next-strike");
    this.challengerFeedback = document.getElementById("challenger-feedback");

    // Custom builder properties
    this.currentCustomCombo = [];
    this.selectRoutine = document.getElementById("select-routine");
    this.customBuilderContainer = document.getElementById("custom-builder-container");

    this._wasDucking = false;
    this._wasSlipping = false;

    // Interactive Structured Trainer State
    this.trainingPhase = 1; // 1 = Stance, 2 = Move Practice, 3 = Free Shadowboxing
    this.selectedMoveToLearn = "JAB/CROSS"; // Default move in Phase 2
    this.successfulMoveCount = 0;
    this.stanceHoldFrames = 0;
    this.hitExplosions = [];
    this._lastTargetHitTime = 0;
    this.dynamicTargets = [];
    this.lastTargetSpawnTime = 0;
    this._statusLockTime = 0;

    // Trainer HUD cache
    this.trainerHud = document.getElementById("trainer-hud");
    this.hudPhaseName = document.getElementById("hud-phase-name");
    this.hudPhaseProgress = document.getElementById("hud-phase-progress");
    this.hudInstructions = document.getElementById("hud-instructions");
    this.hudNextStrikeVal = document.getElementById("hud-next-strike-val");
    
    this.chkGuard = document.getElementById("chk-guard");
    this.chkFeet = document.getElementById("chk-feet");
    this.chkKnees = document.getElementById("chk-knees");
    this.hudStanceCheckers = document.getElementById("hud-stance-checkers");
    this.hudMoveSelector = document.getElementById("hud-move-selector");
    this.btnSkipPhase = document.getElementById("btn-skip-phase");

    // Setup initial event handlers
    this.bindEvents();
  }

  bindEvents() {
    this.btnToggleCamera.addEventListener("click", () => this.toggleCamera());
    this.btnReset.addEventListener("click", () => this.resetSession());
    this.btnMute.addEventListener("click", () => this.toggleMute());
    this.btnGrantCamera.addEventListener("click", () => this.requestWebcamAccess());
    
    const btnGetStarted = document.getElementById("btn-get-started");
    if (btnGetStarted) {
      btnGetStarted.addEventListener("click", async () => {
        const arena = document.querySelector(".arena-card");
        if (arena) {
          arena.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (!this.isCameraActive) {
          await this.startCamera();
        }
      });
    }

    // Focus buttons
    this.btnFocusUpper.addEventListener("click", () => this.setFocusMode("upper"));
    this.btnFocusLower.addEventListener("click", () => this.setFocusMode("lower"));
    this.btnFocusFull.addEventListener("click", () => this.setFocusMode("full"));

    this.sliderSpeed.addEventListener("input", (e) => {
      this.velocityThreshold = parseFloat(e.target.value);
      this.valSpeed.textContent = `${this.velocityThreshold.toFixed(1)} m/s`;
    });

    this.sliderFilter.addEventListener("input", (e) => {
      this.filterCutoff = parseFloat(e.target.value);
      this.valFilter.textContent = `${this.filterCutoff.toFixed(1)} Hz`;
      this.leftTracker.filter.updateParams(this.filterCutoff);
      this.rightTracker.filter.updateParams(this.filterCutoff);
    });

    this.selectDelegate.addEventListener("change", async () => {
      this.showStatus("Re-initializing model on " + this.selectDelegate.value + "...");
      try {
        await this.initPoseLandmarker(this.selectDelegate.value);
        this.showStatus("Model re-initialized on " + this.selectDelegate.value + " successfully.");
      } catch (err) {
        console.error("Failed to re-initialize on delegate:", err);
        this.showStatus("Failed to switch to " + this.selectDelegate.value + ". Falling back...");
      }
    });

    // Workout Routine selection change listener
    this.selectRoutine.addEventListener("change", () => {
      const mode = this.selectRoutine.value;
      if (mode === "custom") {
        this.customBuilderContainer.classList.remove("hidden");
        this.currentCustomCombo = [];
        this.currentChallengeCombo = [];
        this.challengeStepIndex = 0;
        if (this.targetComboDisplay) {
          this.targetComboDisplay.innerHTML = `<span class="challenge-step active">ADD STRIKES...</span>`;
        }
        if (this.targetNextStrike) {
          this.targetNextStrike.textContent = "BUILD COMBO";
        }
      } else {
        this.customBuilderContainer.classList.add("hidden");
        this.rollNewComboChallenge();
      }
    });

    // Custom combo builder buttons
    document.querySelectorAll(".btn-build[data-strike]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (this.selectRoutine.value !== "custom") return;
        const strike = btn.getAttribute("data-strike");
        if (this.currentCustomCombo.length >= 5) return;
        
        this.currentCustomCombo.push(strike);
        this.currentChallengeCombo = [...this.currentCustomCombo];
        this.challengeStepIndex = 0;
        
        if (this.targetComboDisplay) {
          this.targetComboDisplay.innerHTML = "";
          this.currentChallengeCombo.forEach(s => {
            const span = document.createElement("span");
            span.className = "challenge-step";
            let name = "JAB";
            if (s === "JAB/CROSS") name = "JAB/CROSS";
            else if (s === "HOOK") name = "HOOK";
            else if (s === "UPPERCUT") name = "UPPERCUT";
            else if (s === "DUCK") name = "DUCK";
            else if (s === "SLIP") name = "SLIP";
            span.textContent = name;
            this.targetComboDisplay.appendChild(span);
          });
        }
        this.updateChallengeUI();
      });
    });

    document.getElementById("btn-clear-custom").addEventListener("click", () => {
      this.currentCustomCombo = [];
      this.currentChallengeCombo = [];
      this.challengeStepIndex = 0;
      if (this.targetComboDisplay) {
        this.targetComboDisplay.innerHTML = `<span class="challenge-step active">ADD STRIKES...</span>`;
      }
      if (this.targetNextStrike) {
        this.targetNextStrike.textContent = "BUILD COMBO";
      }
    });

    // Skip Phase listener
    this.btnSkipPhase.addEventListener("click", () => {
      this.advanceTrainingPhase();
    });

    // Move Practice learning selector buttons
    document.querySelectorAll(".btn-learn-move").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".btn-learn-move").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.selectedMoveToLearn = btn.getAttribute("data-move");
        this.successfulMoveCount = 0;
        this.updateTrainerHudUI();
      });
    });

    // Handle viewport resizing
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  setFocusMode(mode) {
    this.activeFocusMode = mode;
    
    // Update button active state
    this.btnFocusUpper.classList.toggle("active", mode === "upper");
    this.btnFocusLower.classList.toggle("active", mode === "lower");
    this.btnFocusFull.classList.toggle("active", mode === "full");

    // Clear active errors
    this.activeErrors = {
      guardDropped: false,
      elbowFlare: false,
      kneesLocked: false,
      stanceSquare: false,
      feetClose: false
    };

    // Synthesizer beep / sound feedback
    this.synth.init();
    
    // Show status update
    if (mode === "upper") {
      this.showStatus("FOCUS: Upper Body. Keep guard up, elbows tucked, and punch straight.");
    } else if (mode === "lower") {
      this.showStatus("FOCUS: Lower Body. Stagger your feet, bend knees, and widen stance.");
    } else if (mode === "full") {
      this.showStatus("FOCUS: Full Body. Coordinate punch mechanics with stance stability.");
    }
  }


  async init() {
    try {
      this.updateProgress("Loading WASM components...", 30);
      await this.initPoseLandmarker(this.selectDelegate.value);
      this.rollNewComboChallenge();
      
      this.updateProgress("Ready to start camera!", 100);
      setTimeout(() => {
        this.loadingOverlay.style.opacity = "0";
        setTimeout(() => this.loadingOverlay.classList.add("hidden"), 500);
      }, 600);

      this.btnToggleCamera.disabled = false;
      this.engineDot.className = "status-dot online";
      this.engineStatus.textContent = "ENGINE ACTIVE";
      // Don't auto-enable hologram — let user toggle it after starting camera
    } catch (error) {
      console.error("WASM Pose Landmarker failed to initialize:", error);
      this.loadingStatus.textContent = "Failed to load WASM engine. Check connection.";
      this.engineStatus.textContent = "WASM FAILED";
    }
  }

  updateProgress(msg, percent) {
    this.loadingStatus.textContent = msg;
    this.loadingProgress.style.width = `${percent}%`;
  }

  async initPoseLandmarker(delegateType) {
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }

    this.updateProgress("Downloading WASM Runtime...", 45);
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
    );

    this.updateProgress("Downloading 15MB Full Pose Model...", 75);
    // Use full model as requested by the user
    this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task",
        delegate: delegateType
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.45,
      minPosePresenceConfidence: 0.45,
      minTrackingConfidence: 0.40
    });
  }

  showStatus(msg, durationMs = 0) {
    if (this._statusLockTime && performance.now() < this._statusLockTime) return;
    this.coachMessageEl.textContent = msg;
    if (durationMs > 0) {
      this._statusLockTime = performance.now() + durationMs;
    }
  }

  async toggleCamera() {
    this.synth.init(); // Initialize audio on first click
    if (this.isCameraActive) {
      this.stopCamera();
    } else {
      await this.startCamera();
    }
  }

  async startCamera() {
    try {
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: { ideal: 60 } },
        audio: false
      });
      
      // Bind event listener before setting srcObject to prevent HTML5 race conditions
      this.video.addEventListener("loadedmetadata", () => {
        this.video.play();
        this.resizeCanvas();
        this.isCameraActive = true;
        this.btnToggleCamera.querySelector("span").textContent = "Stop Workout";
        this.btnToggleCamera.className = "btn btn-secondary";
        this.warningOverlay.classList.add("hidden");
        
        // Start State Session
        this.state.startTime = performance.now();
        this.lastVideoTime = -1;
        this.leftTracker.reset();
        this.rightTracker.reset();
        
        // Start Render Loop
        this.renderLoop();
        this.showStatus("Guard up! Jab, cross, hook, or uppercut in frame to start tracking.");
      }, { once: true });

      this.video.srcObject = this.cameraStream;
    } catch (err) {
      console.error("Camera access denied:", err);
      this.warningOverlay.classList.remove("hidden");
    }
  }

  async requestWebcamAccess() {
    await this.startCamera();
  }

  stopCamera() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.video.srcObject = null;
    this.isCameraActive = false;
    this.btnToggleCamera.querySelector("span").textContent = "Start Workout";
    this.btnToggleCamera.className = "btn btn-primary glow-btn";
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.showStatus("Workout paused. Click 'Start Workout' to resume.");
    this.fpsValEl.textContent = "--";
  }

  resetSession() {
    this.state.reset();
    this.leftTracker.reset();
    this.rightTracker.reset();
    this.challengeStreak = 0;
    this.rollNewComboChallenge();
    if (this.isCameraActive) {
      this.state.startTime = performance.now();
    }
    this.updateUI();
    this.showStatus("Statistics reset. Ready to go!");
  }

  toggleMute() {
    this.synth.muted = !this.synth.muted;
    const muteOn = document.getElementById("mute-icon-on");
    const muteOff = document.getElementById("mute-icon-off");
    if (this.synth.muted) {
      muteOn.classList.add("hidden");
      muteOff.classList.remove("hidden");
      this.btnMute.title = "Unmute Sound FX";
    } else {
      muteOn.classList.remove("hidden");
      muteOff.classList.add("hidden");
      this.btnMute.title = "Mute Sound FX";
      this.synth.init();
    }
  }

  resizeCanvas() {
    if (this.video.videoWidth > 0) {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
    }
  }

  // ==========================================
  // RENDER & TRACKING LOOP
  // ==========================================
  renderLoop() {
    if (!this.isCameraActive) return;

    const now = this.video.currentTime;
    
    // Only run pose detection if we have a brand new video frame
    if (now !== this.lastVideoTime && this.video.readyState >= 3) {
      const dt = this.lastVideoTime === -1 ? 0.016 : (now - this.lastVideoTime);
      this.lastVideoTime = now;

      // FPS tracking
      this.fpsFrames++;
      const timeMs = performance.now();
      if (timeMs - this.fpsLastTime >= 1000) {
        this.fpsValEl.textContent = this.fpsFrames;
        this.fpsFrames = 0;
        this.fpsLastTime = timeMs;
      }

      if (!this.poseLandmarker) {
        this.animationId = requestAnimationFrame(() => this.renderLoop());
        return;
      }

      // Run synchronous WASM detector
      const results = this.poseLandmarker.detectForVideo(this.video, performance.now());
      
      // Clear previous overlay
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];
        const worldLandmarks = results.worldLandmarks[0];

        // Draw HUD overlay skeleton (passing both 2D and 3D world landmarks)
        this.drawSkeleton(landmarks, worldLandmarks);

        // Physics calculations using metric world landmarks
        this.processPhysics(worldLandmarks, landmarks, dt);
      }

      // Update timer display
      this.workoutTimerEl.textContent = this.state.updateTimer();
    }

    this.animationId = requestAnimationFrame(() => this.renderLoop());
  }

  // ==========================================
  // PHYSICS ENGINE IMPLEMENTATION
  // ==========================================
  processPhysics(worldLandmarks, landmarks, dt) {
    // Visibility gating: skip physics if key landmarks are poorly tracked
    const lw = worldLandmarks[15], rw = worldLandmarks[16];
    const ls = worldLandmarks[11], rs = worldLandmarks[12];
    const le = worldLandmarks[13], re = worldLandmarks[14];
    if (!lw || !rw || !ls || !rs) return;

    const lwVis = landmarks[15]?.visibility ?? 0;
    const rwVis = landmarks[16]?.visibility ?? 0;

    const leftWristImg = landmarks[15];
    const rightWristImg = landmarks[16];

    // Left hand strike check
    const leftMetrics = this.leftTracker.processFrame(
      lw, ls, le, dt, this.velocityThreshold,
      (side, speed, power, type, alignment) => this.handlePunch(side, speed, power, type, alignment, leftWristImg)
    );

    // Right hand strike check
    const rightMetrics = this.rightTracker.processFrame(
      rw, rs, re, dt, this.velocityThreshold,
      (side, speed, power, type, alignment) => this.handlePunch(side, speed, power, type, alignment, rightWristImg)
    );

    // 3D Defense Evasion Checks (Duck & Slip)
    const noseImg = landmarks[0];
    const lsImg = landmarks[11];
    const rsImg = landmarks[12];
    const lhImg = landmarks[23];
    const rhImg = landmarks[24];

    if (noseImg && lsImg && rsImg && lhImg && rhImg && 
        noseImg.visibility > 0.45 && lsImg.visibility > 0.45 && rsImg.visibility > 0.45) {
      
      const midShoulderY = (lsImg.y + rsImg.y) / 2;
      const midShoulderX = (lsImg.x + rsImg.x) / 2;
      const midHipY = (lhImg.y + rhImg.y) / 2;
      
      const torsoHeight = midHipY - midShoulderY;
      const shoulderSpan = Math.abs(lsImg.x - rsImg.x);
      
      if (torsoHeight > 0.05 && shoulderSpan > 0.05) {
        const headRatio = (midShoulderY - noseImg.y) / torsoHeight;
        const isDucking = headRatio < 0.14;
        
        const slipRatio = (noseImg.x - midShoulderX) / shoulderSpan;
        const isSlipping = Math.abs(slipRatio) > 0.32;
        
        if (isDucking && !this._wasDucking) {
          this.handleDefenseEvent("DUCK");
        }
        if (isSlipping && !this._wasSlipping) {
          this.handleDefenseEvent("SLIP");
        }
        
        this._wasDucking = isDucking;
        this._wasSlipping = isSlipping;
      }
    }

    // Guard Form Correction Advisor and Stance posture check
    this.checkPostureCorrectness(landmarks, worldLandmarks);

    // Display active speeds in real-time (already EMA-smoothed from HandTracker)
    const currentSpeed = Math.max(leftMetrics.speed, rightMetrics.speed);
    this.statSpeed.textContent = currentSpeed.toFixed(1);
    
    // Use cached reference instead of getElementById every frame
    this._speedBar = this._speedBar || document.getElementById("speed-progress-bar");
    this._powerBar = this._powerBar || document.getElementById("power-progress-bar");
    const speedPct = Math.min(100, (currentSpeed / 8.0) * 100);
    this._speedBar.style.width = `${speedPct}%`;

    // Swoosh sound: deterministic cooldown instead of random chance
    if (currentSpeed > this.velocityThreshold * 0.5) {
      if (!this._lastSwooshTime || (performance.now() - this._lastSwooshTime > 300)) {
        this.synth.playSwoosh();
        this._lastSwooshTime = performance.now();
      }
    }
  }

  handlePunch(side, speed, power, type, alignment, wristLandmark) {
    // 1. Update session state
    this.state.addPunch(speed, power, type);

    // 2. Play Synthesized Sound Effect
    this.synth.playHit(power);

    // 3. Trigger screen flash and POW! text
    this.triggerVisualEffects(wristLandmark);

    // 4. Update trainer UI
    this.updateUI();

    // 5. Provide coach reaction
    const hand = side.toUpperCase();
    let alignComment = "DECENT PATH!";
    if (alignment > 85) {
      alignComment = "PERFECT ALIGNMENT!";
    } else if (alignment < 70) {
      alignComment = "LOOSE TRAJECTORY! Keep it tight.";
    }

    this.showStatus(`${hand} ${type} DETECTED! Speed: ${speed.toFixed(1)} m/s, Power: ${power}%, Align: ${alignment}% - ${alignComment}`);

    // Check combo challenge progress
    this.checkChallengeProgress(type);

    // Check Phase 2 move learning progress
    if (this.trainingPhase === 2 && type === this.selectedMoveToLearn) {
      this.triggerTargetHit(type, wristLandmark ? wristLandmark.x * this.canvas.width : this.canvas.width / 2, wristLandmark ? wristLandmark.y * this.canvas.height : this.canvas.height / 2);
    }
  }

  handleDefenseEvent(defenseType) {
    this.synth.playTone(600, "triangle", 0.08); // Medium chiptune beep
    this.showStatus(`DEFENSE EVASION: ${defenseType} DETECTED!`);
    
    // Only check combo challenge progress if the expected target is actually a defense move!
    if (this.currentChallengeCombo && this.currentChallengeCombo.length > 0) {
      const targetStrike = this.currentChallengeCombo[this.challengeStepIndex];
      if (targetStrike === "DUCK" || targetStrike === "SLIP") {
        this.checkChallengeProgress(defenseType);
      }
    }

    // Check Phase 2 move learning progress (if DUCK is selected) — delegate to unified triggerTargetHit
    if (this.trainingPhase === 2 && this.selectedMoveToLearn === "DUCK" && defenseType === "DUCK") {
      this.triggerTargetHit("DUCK", this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  checkChallengeProgress(type) {
    if (!this.currentChallengeCombo || this.currentChallengeCombo.length === 0) return;
    
    const targetStrike = this.currentChallengeCombo[this.challengeStepIndex];
    
    if (type === targetStrike) {
      this.challengeStepIndex++;
      this.synth.playTone(880, "sine", 0.1); // High pitch check beep
      this.updateChallengeUI();
      this.updateTrainerHudUI();
      
      if (this.challengeStepIndex === this.currentChallengeCombo.length) {
        this.challengeStreak++;
        if (this.challengerFeedback) {
          this.challengerFeedback.textContent = "COMBO COMPLETE!";
          this.challengerFeedback.style.color = "var(--neon-green)";
        }
        
        // Play triumph arpeggio sequence
        setTimeout(() => {
          this.synth.playTone(523.25, "triangle", 0.1);
          setTimeout(() => {
            this.synth.playTone(659.25, "triangle", 0.1);
            setTimeout(() => {
              this.synth.playTone(783.99, "triangle", 0.25);
            }, 100);
          }, 100);
        }, 50);
        
        setTimeout(() => {
          this.rollNewComboChallenge();
          if (this.challengerFeedback) {
            this.challengerFeedback.textContent = "New combo loaded!";
            this.challengerFeedback.style.color = "";
          }
        }, 1500);
      } else {
        if (this.challengerFeedback) {
          this.challengerFeedback.textContent = "Nice! Keep going...";
          this.challengerFeedback.style.color = "var(--neon-cyan)";
        }
      }
    } else {
      if (this.challengeStepIndex > 0) {
        this.challengeStepIndex = 0;
        this.synth.playTone(220, "sawtooth", 0.15); // wrong-strike buzzer tone
        this.updateChallengeUI();
        this.updateTrainerHudUI();
        if (this.challengerFeedback) {
          this.challengerFeedback.textContent = "Wrong strike! Resetting combo.";
          this.challengerFeedback.style.color = "#ff3333";
          setTimeout(() => {
            if (this.challengerFeedback) {
              this.challengerFeedback.textContent = "Follow the sequence!";
              this.challengerFeedback.style.color = "";
            }
          }, 1500);
        }
      }
    }
    
    this.updateChallengeUI();
  }

  rollNewComboChallenge() {
    const routine = this.selectRoutine ? this.selectRoutine.value : "all";
    let pool = this.combosPool;
    
    if (routine === "cardio") {
      pool = [
        ["HOOK", "HOOK"],
        ["HOOK", "UPPERCUT", "HOOK"],
        ["UPPERCUT", "HOOK", "UPPERCUT"]
      ];
    } else if (routine === "power") {
      pool = [
        ["HOOK", "HOOK"],
        ["UPPERCUT", "HOOK"],
        ["HOOK", "UPPERCUT", "HOOK"]
      ];
    } else if (routine === "defense") {
      pool = [
        ["HOOK", "DUCK", "HOOK"],
        ["UPPERCUT", "SLIP", "HOOK"],
        ["DUCK", "UPPERCUT", "HOOK"],
        ["SLIP", "DUCK", "HOOK"]
      ];
    } else if (routine === "custom") {
      // Keep the custom combo loop, do not roll a new one
      this.challengeStepIndex = 0;
      this.updateChallengeUI();
      return;
    }
    
    const prevCombo = this.currentChallengeCombo;
    let newCombo = prevCombo;
    
    while (newCombo === prevCombo && pool.length > 1) {
      newCombo = pool[Math.floor(Math.random() * pool.length)];
    }
    if (pool.length === 1) newCombo = pool[0];
    
    this.currentChallengeCombo = newCombo;
    this.challengeStepIndex = 0;
    
    if (this.targetComboDisplay) {
      this.targetComboDisplay.innerHTML = "";
      this.currentChallengeCombo.forEach(strike => {
        const span = document.createElement("span");
        span.className = "challenge-step";
        let labelName = "JAB";
        if (strike === "JAB/CROSS") labelName = "JAB/CROSS";
        else if (strike === "HOOK") labelName = "HOOK";
        else if (strike === "UPPERCUT") labelName = "UPPERCUT";
        else if (strike === "DUCK") labelName = "DUCK";
        else if (strike === "SLIP") labelName = "SLIP";
        span.textContent = labelName;
        this.targetComboDisplay.appendChild(span);
      });
    }
    
    this.updateChallengeUI();
    this.updateTrainerHudUI();
  }

  updateChallengeUI() {
    if (!this.currentChallengeCombo || this.currentChallengeCombo.length === 0) return;
    
    const steps = this.targetComboDisplay ? this.targetComboDisplay.querySelectorAll(".challenge-step") : [];
    steps.forEach((step, index) => {
      step.classList.remove("active", "completed");
      if (index < this.challengeStepIndex) {
        step.classList.add("completed");
      } else if (index === this.challengeStepIndex) {
        step.classList.add("active");
      }
    });
    
    if (this.targetNextStrike) {
      const nextStrike = this.currentChallengeCombo[this.challengeStepIndex];
      const strikeText = nextStrike || "COMPLETE!";
      this.targetNextStrike.textContent = strikeText;
      if (this.hudNextStrikeVal && this.trainingPhase === 3) {
        this.hudNextStrikeVal.textContent = strikeText;
      }
    }
    
    if (this.challengerBadge) {
      this.challengerBadge.textContent = `STREAK: ${this.challengeStreak}`;
    }
  }

  checkPostureCorrectness(landmarks, worldLandmarks) {
    if (!landmarks || !worldLandmarks) return;

    // Throttle checks to once every 20 frames (~3× per second at 60fps)
    this.postureFrameCounter++;
    if (this.postureFrameCounter % 20 !== 0) return;

    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];

    // Check if points are visible and high enough confidence
    if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) return;
    
    const upperBodyVisible = leftShoulder.visibility > 0.45 && rightShoulder.visibility > 0.45;
    if (!upperBodyVisible) {
      this.activeErrors.guardDropped = false;
      this.activeErrors.elbowFlare = false;
      return;
    }

    // 1. Guard check (suppressed on the punching arm to avoid false warning spikes)
    const leftGuardDropped = !this.leftTracker.isPunching && (leftWrist.y > leftShoulder.y + 0.09);
    const rightGuardDropped = !this.rightTracker.isPunching && (rightWrist.y > rightShoulder.y + 0.09);
    this.activeErrors.guardDropped = leftGuardDropped || rightGuardDropped;

    // 2. Elbow Flare check (suppressed on the punching arm to allow strike rotation)
    const centerX = (leftShoulder.x + rightShoulder.x) / 2;
    const leftFlared = !this.leftTracker.isPunching && leftElbow && Math.abs(leftElbow.x - centerX) > Math.abs(leftShoulder.x - centerX) * 1.35;
    const rightFlared = !this.rightTracker.isPunching && rightElbow && Math.abs(rightElbow.x - centerX) > Math.abs(rightShoulder.x - centerX) * 1.35;
    this.activeErrors.elbowFlare = leftFlared || rightFlared;

    // Lower body checks (use metric worldLandmarks for scaling stability)
    const wLeftHip = worldLandmarks[23];
    const wRightHip = worldLandmarks[24];
    const wLeftKnee = worldLandmarks[25];
    const wRightKnee = worldLandmarks[26];
    const wLeftAnkle = worldLandmarks[27];
    const wRightAnkle = worldLandmarks[28];
    const wLeftShoulder = worldLandmarks[11];
    const wRightShoulder = worldLandmarks[12];

    if (wLeftHip && wRightHip && wLeftKnee && wRightKnee && wLeftAnkle && wRightAnkle) {
      const lowerBodyVisible = wLeftKnee.visibility > 0.45 && wRightKnee.visibility > 0.45 &&
                               wLeftAnkle.visibility > 0.45 && wRightAnkle.visibility > 0.45;
      
      if (!lowerBodyVisible) {
        this.activeErrors.kneesLocked = false;
        this.activeErrors.feetClose = false;
        this.activeErrors.stanceSquare = false;
        
        if (this.activeFocusMode === "lower" || this.activeFocusMode === "full") {
          this.showStatus("Lower body out of camera frame. Stand further back!");
          return;
        }
      } else {
        // 3. Knee Bend check
        const leftKneeAngle = this.calculateKneeAngle(wLeftHip, wLeftKnee, wLeftAnkle);
        const rightKneeAngle = this.calculateKneeAngle(wRightHip, wRightKnee, wRightAnkle);
        this.activeErrors.kneesLocked = leftKneeAngle > 172 || rightKneeAngle > 172;

        // 4. Stance Width check (true 3D ground separation distance vs 3D shoulder span)
        const wShoulderSpan = Math.sqrt(
          (wLeftShoulder.x - wRightShoulder.x)**2 + 
          (wLeftShoulder.y - wRightShoulder.y)**2 + 
          (wLeftShoulder.z - wRightShoulder.z)**2
        );
        const dx = wLeftAnkle.x - wRightAnkle.x;
        const dz = wLeftAnkle.z - wRightAnkle.z;
        const wAnkleFloorDist = Math.sqrt(dx*dx + dz*dz);
        this.activeErrors.feetClose = wAnkleFloorDist < wShoulderSpan * 1.1;

        // 5. Stance Stagger check (feet square depth-wise)
        const depthDiff = Math.abs(wLeftAnkle.z - wRightAnkle.z);
        this.activeErrors.stanceSquare = depthDiff < 0.15;
      }
    }

    // Do not overwrite punch statistics display feedback within the last 2.0 seconds
    const timeSinceLastPunch = performance.now() - this.state.lastPunchTime;
    if (timeSinceLastPunch < 2000) return;

    // Mode-specific coaching feedback
    if (this.activeFocusMode === "upper") {
      if (this.activeErrors.guardDropped) {
        this.showStatus("Guard dropped! Keep your hands up near your chin.");
      } else if (this.activeErrors.elbowFlare) {
        this.showStatus("Tuck your elbows! Don't flare them out wide.");
      } else {
        this.showStatus("Upper body guard is solid. Ready to strike!");
      }
    } else if (this.activeFocusMode === "lower") {
      if (this.activeErrors.kneesLocked) {
        this.showStatus("Bend your knees! Keep a soft bounce for footwork mobility.");
      } else if (this.activeErrors.feetClose) {
        this.showStatus("Widen your stance! Place your feet shoulder-width apart.");
      } else if (this.activeErrors.stanceSquare) {
        this.showStatus("Stagger your feet! One foot forward, one foot back (Orthodox/Southpaw).");
      } else {
        this.showStatus("Lower body stance is stable. Excellent balance!");
      }
    } else if (this.activeFocusMode === "full") {
      if (this.activeErrors.guardDropped) {
        this.showStatus("Guard dropped! Bring hands back to protect your chin.");
      } else if (this.activeErrors.kneesLocked) {
        this.showStatus("Locked knees! Keep knees slightly bent to absorb impact.");
      } else if (this.activeErrors.stanceSquare) {
        this.showStatus("Don't stand square! Stagger your stance for boxing balance.");
      } else if (this.activeErrors.feetClose) {
        this.showStatus("Feet too narrow! Widen your base.");
      } else if (this.activeErrors.elbowFlare) {
        this.showStatus("Keep those elbows tucked in.");
      } else {
        this.showStatus("Stance is fully balanced. Release those combos!");
      }
    }

    // If in Phase 1 Stance, update HUD check items and track the hold timer
    if (this.trainingPhase === 1) {
      const guardPass = !this.activeErrors.guardDropped;
      const feetPass = !this.activeErrors.feetClose && !this.activeErrors.stanceSquare;
      const kneesPass = !this.activeErrors.kneesLocked;

      if (this.chkGuard) {
        this.chkGuard.className = `hud-check-item ${guardPass ? 'pass' : 'fail'}`;
      }
      if (this.chkFeet) {
        this.chkFeet.className = `hud-check-item ${feetPass ? 'pass' : 'fail'}`;
      }
      if (this.chkKnees) {
        this.chkKnees.className = `hud-check-item ${kneesPass ? 'pass' : 'fail'}`;
      }

      if (guardPass && feetPass && kneesPass) {
        this.stanceHoldFrames++;
        const secondsRemaining = Math.max(0, 3 - Math.floor(this.stanceHoldFrames / 3)); 
        this.hudPhaseProgress.textContent = `HOLD: ${secondsRemaining}s`;

        if (this.stanceHoldFrames >= 9) { 
          this.advanceTrainingPhase();
        }
      } else {
        this.stanceHoldFrames = 0;
        this.hudPhaseProgress.textContent = "HOLD STANCE";
      }
    }
  }

  calculateKneeAngle(hip, knee, ankle) {
    if (!hip || !knee || !ankle) return 180;
    const vA = { x: hip.x - knee.x, y: hip.y - knee.y, z: hip.z - knee.z };
    const vB = { x: ankle.x - knee.x, y: ankle.y - knee.y, z: ankle.z - knee.z };
    const dot = vA.x*vB.x + vA.y*vB.y + vA.z*vB.z;
    const magA = Math.sqrt(vA.x*vA.x + vA.y*vA.y + vA.z*vA.z);
    const magB = Math.sqrt(vB.x*vB.x + vB.y*vB.y + vB.z*vB.z);
    if (magA * magB === 0) return 180;
    const val = dot / (magA * magB);
    const clampedVal = Math.max(-1, Math.min(1, val));
    return Math.acos(clampedVal) * (180 / Math.PI);
  }

  advanceTrainingPhase() {
    this.trainingPhase++;
    if (this.trainingPhase > 3) {
      this.trainingPhase = 1; // Loop back
    }
    
    // Reset state for new phase
    this.stanceHoldFrames = 0;
    this.successfulMoveCount = 0;
    
    this.synth.playTone(523.25, "triangle", 0.1);
    setTimeout(() => this.synth.playTone(659.25, "triangle", 0.15), 100);
    
    this.updateTrainerHudUI();
  }

  updateTrainerHudUI() {
    if (this.trainingPhase === 1) {
      this.hudPhaseName.textContent = "PHASE 1 (STANCE)";
      this.hudPhaseProgress.textContent = "HOLD STANCE";
      this.hudInstructions.textContent = "ASSUME BOXING STANCE: Hands up near chin, feet staggered, knees slightly bent.";
      this.hudStanceCheckers.classList.remove("hidden");
      this.hudMoveSelector.classList.add("hidden");
      this.btnSkipPhase.textContent = "SKIP STANCE";
      if (this.hudNextStrikeVal) this.hudNextStrikeVal.textContent = "STANCE";
    } else if (this.trainingPhase === 2) {
      this.hudPhaseName.textContent = "PHASE 2 (MOVE PRACTICE)";
      this.hudPhaseProgress.textContent = `${this.successfulMoveCount}/3`;
      this.hudStanceCheckers.classList.add("hidden");
      this.hudMoveSelector.classList.remove("hidden");
      this.btnSkipPhase.textContent = "SKIP PRACTICE";
      
      let instr = "";
      if (this.selectedMoveToLearn === "JAB/CROSS") {
        instr = "Punch through the cyan checkpoint rings on each side. Extend straight forward!";
      } else if (this.selectedMoveToLearn === "HOOK") {
        instr = "Sweep your fist into the pink checkpoint rings. Keep elbows bent, pivot hips!";
      } else if (this.selectedMoveToLearn === "UPPERCUT") {
        instr = "Drive your fist upward into the green checkpoint rings above your shoulders!";
      } else if (this.selectedMoveToLearn === "DUCK") {
        instr = "Bend your knees and dip your head into the yellow checkpoint ring below!";
      }
      this.hudInstructions.textContent = instr;
      if (this.hudNextStrikeVal) this.hudNextStrikeVal.textContent = this.selectedMoveToLearn;
    } else {
      this.hudPhaseName.textContent = "PHASE 3 (FREE SHADOWBOXING)";
      this.hudPhaseProgress.textContent = "GRADUATED";
      this.hudInstructions.textContent = "FREE SHADOWBOXING ACTIVE: Throw punches and test evasion. Complete combo challenges in the sidebar!";
      this.hudStanceCheckers.classList.add("hidden");
      this.hudMoveSelector.classList.add("hidden");
      this.btnSkipPhase.textContent = "RESTART COURSE";
      if (this.hudNextStrikeVal) {
        const nextStrike = this.currentChallengeCombo[this.challengeStepIndex];
        this.hudNextStrikeVal.textContent = nextStrike || "FREESTYLE";
      }
    }
  }

  triggerTargetHit(type, x, y) {
    if (this.trainingPhase !== 2) return; // Only active during Phase 2 practice
    const now = performance.now();
    if (this._lastTargetHitTime && (now - this._lastTargetHitTime < 350)) return; // 350ms debounce
    this._lastTargetHitTime = now;

    const hitColor = type === "JAB/CROSS" ? "#00e5ff" : (type === "HOOK" ? "#ff007f" : (type === "UPPERCUT" ? "#00ff9f" : "#ffeb3b"));

    // Add vibrant expanding hit explosion ring
    this.hitExplosions.push({
      x, y,
      radius: 25,
      maxRadius: 85,
      alpha: 1.0,
      color: hitColor
    });

    // Play hit sound + pitch chime
    this.synth.playHit(95);
    this.synth.playTone(880, "sine", 0.12);

    // Trigger visual POW overlay
    this.triggerVisualEffects({ x: x / this.canvas.width, y: y / this.canvas.height });

    // Progress phase count
    this.successfulMoveCount++;
    this.hudPhaseProgress.textContent = `${this.successfulMoveCount}/3`;
    this.showStatus(`SPATIAL TARGET CLEARED! (${this.successfulMoveCount}/3)`);

    if (this.successfulMoveCount >= 3) {
      this.showStatus(`${type} MASTERED! Next target unlocked.`);
      this.synth.playTone(523.25, "triangle", 0.1);
      setTimeout(() => this.synth.playTone(783.99, "triangle", 0.2), 100);
      
      const moves = ["JAB/CROSS", "HOOK", "UPPERCUT", "DUCK"];
      const currentIndex = moves.indexOf(this.selectedMoveToLearn);
      if (currentIndex < 3) {
        const nextMove = moves[currentIndex + 1];
        setTimeout(() => {
          this.selectedMoveToLearn = nextMove;
          this.successfulMoveCount = 0;
          document.querySelectorAll(".btn-learn-move").forEach(b => {
            b.classList.toggle("active", b.getAttribute("data-move") === nextMove);
          });
          this.updateTrainerHudUI();
        }, 1100);
      } else {
        setTimeout(() => {
          this.advanceTrainingPhase();
        }, 1100);
      }
    }
  }

  drawGtaCheckpoint(ctx, x, y, radius, colorHex) {
    ctx.save();
    const time = performance.now() * 0.003;
    const pulseRadius = radius + Math.sin(time * 5) * 5;
    const radarRadius = radius + ((performance.now() * 0.045) % 28);
    const radarAlpha = Math.max(0, 1 - (radarRadius - radius) / 28);

    // 1. Expanding radar pulse wave (GTA Checkpoint effect) - NO SHADOW for performance
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 3;
    ctx.globalAlpha = radarAlpha * 0.8;
    ctx.beginPath();
    ctx.arc(x, y, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Main glowing checkpoint ring (Add moderate shadow here)
    ctx.shadowBlur = 10;
    ctx.shadowColor = colorHex;
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Inner core crosshair ring
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Center bright white core point
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 6;
    ctx.shadowColor = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawHitExplosions(ctx) {
    for (let i = this.hitExplosions.length - 1; i >= 0; i--) {
      const exp = this.hitExplosions[i];
      exp.radius += 3.5;
      exp.alpha -= 0.04;

      if (exp.alpha <= 0) {
        this.hitExplosions.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.shadowBlur = 10; // Reduced from 25 for better FPS
      ctx.shadowColor = exp.color;
      ctx.strokeStyle = exp.color;
      ctx.lineWidth = 4;
      ctx.globalAlpha = exp.alpha;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawMoveVisualGuide(ctx, joints, is3D, w, h) {
    if (!joints || !joints.shoulderL || !joints.shoulderR || !joints.nose) return;

    ctx.save();
    
    // Draw active explosion shockwaves first
    this.drawHitExplosions(ctx);

    const move = this.selectedMoveToLearn;
    const getXY = (joint) => {
      if (!joint) return null;
      if (is3D) {
        return { x: joint.x, y: joint.y };
      } else {
        return { x: joint.x * w, y: joint.y * h };
      }
    };

    const noseXY = getXY(joints.nose);
    const shLXY = getXY(joints.shoulderL);
    const shRXY = getXY(joints.shoulderR);

    if (!noseXY || !shLXY || !shRXY) {
      ctx.restore();
      return;
    }

    const midShoulderX = (shLXY.x + shRXY.x) / 2;
    const midShoulderY = (shLXY.y + shRXY.y) / 2;
    const shoulderSpan = Math.max(70, Math.abs(shLXY.x - shRXY.x));

    // Collect all hand/fist/elbow landmarks for rock-solid spatial collision detection
    const handPoints = [
      getXY(joints.wristL), getXY(joints.wristR),
      getXY(joints.indexL), getXY(joints.indexR),
      getXY(joints.pinkyL), getXY(joints.pinkyR),
      getXY(joints.thumbL), getXY(joints.thumbR),
      getXY(joints.elbowL), getXY(joints.elbowR)
    ].filter(Boolean);

    // Scale hit radius relative to shoulder span for resolution independence
    const baseHitRadius = Math.max(shoulderSpan * 0.55, 80);

    const checkHitTarget = (tx, ty) => {
      for (let i = 0; i < handPoints.length; i++) {
        const pt = handPoints[i];
        const dx = pt.x - tx;
        const dy = pt.y - ty;
        if (dx * dx + dy * dy < baseHitRadius * baseHitRadius) {
          return true;
        }
      }
      return false;
    };

    if (move === "JAB/CROSS") {
      // Position targets wide outside body envelope in extended punch lanes
      const targetLX = noseXY.x - shoulderSpan * 1.65;
      const targetLY = noseXY.y;
      const targetRX = noseXY.x + shoulderSpan * 1.65;
      const targetRY = noseXY.y;

      this.drawGtaCheckpoint(ctx, targetLX, targetLY, 28, "#00e5ff");
      this.drawGtaCheckpoint(ctx, targetRX, targetRY, 28, "#00e5ff");

      // Check spatial collision against either cyan target ring
      if (checkHitTarget(targetLX, targetLY)) {
        this.triggerTargetHit("JAB/CROSS", targetLX, targetLY);
      } else if (checkHitTarget(targetRX, targetRY)) {
        this.triggerTargetHit("JAB/CROSS", targetRX, targetRY);
      }

    } else if (move === "HOOK") {
      const targetLX = midShoulderX - shoulderSpan * 1.85;
      const targetLY = midShoulderY - 10;
      const targetRX = midShoulderX + shoulderSpan * 1.85;
      const targetRY = midShoulderY - 10;

      this.drawGtaCheckpoint(ctx, targetLX, targetLY, 28, "#ff007f");
      this.drawGtaCheckpoint(ctx, targetRX, targetRY, 28, "#ff007f");

      if (checkHitTarget(targetLX, targetLY)) {
        this.triggerTargetHit("HOOK", targetLX, targetLY);
      } else if (checkHitTarget(targetRX, targetRY)) {
        this.triggerTargetHit("HOOK", targetRX, targetRY);
      }

    } else if (move === "UPPERCUT") {
      const targetLX = shLXY.x - shoulderSpan * 0.3;
      const targetLY = noseXY.y - shoulderSpan * 0.95;
      const targetRX = shRXY.x + shoulderSpan * 0.3;
      const targetRY = noseXY.y - shoulderSpan * 0.95;

      this.drawGtaCheckpoint(ctx, targetLX, targetLY, 28, "#00ff9f");
      this.drawGtaCheckpoint(ctx, targetRX, targetRY, 28, "#00ff9f");

      if (checkHitTarget(targetLX, targetLY)) {
        this.triggerTargetHit("UPPERCUT", targetLX, targetLY);
      } else if (checkHitTarget(targetRX, targetRY)) {
        this.triggerTargetHit("UPPERCUT", targetRX, targetRY);
      }

    } else if (move === "DUCK") {
      const targetX = midShoulderX;
      const targetY = midShoulderY + shoulderSpan * 0.7;

      this.drawGtaCheckpoint(ctx, targetX, targetY, 32, "#ffeb3b");

      // Duck detection based on nose reaching duck depth
      const dx = noseXY.x - targetX;
      const dy = noseXY.y - targetY;
      if (dx * dx + dy * dy < baseHitRadius * baseHitRadius * 1.2) {
        this.triggerTargetHit("DUCK", targetX, targetY);
      }
    }

    ctx.restore();
  }
  triggerVisualEffects(landmark) {
    // Screen Border Flash
    this.punchFlash.classList.add("active");
    
    // Setup POW overlay position based on coordinates of the wrist landmark
    if (landmark) {
      // Mirror the x coordinates because the canvas is mirrored horizontally
      const xPercent = (1.0 - landmark.x) * 100;
      const yPercent = landmark.y * 100;
      this.powOverlay.style.left = `${xPercent}%`;
      this.powOverlay.style.top = `${yPercent}%`;
    } else {
      this.powOverlay.style.left = "50%";
      this.powOverlay.style.top = "50%";
    }

    this.powOverlay.classList.add("active");

    setTimeout(() => {
      this.punchFlash.classList.remove("active");
    }, 400);

    setTimeout(() => {
      this.powOverlay.classList.remove("active");
    }, 500);
  }

  updateUI() {
    this.statSpeed.textContent = this.state.peakSpeed > 0 ? this.state.peakSpeed.toFixed(1) : "0.0";
    this.statPower.textContent = this.state.peakPower;
    
    this.peakSpeedEl.textContent = this.state.peakSpeed.toFixed(1);
    this.peakPowerEl.textContent = this.state.peakPower;
    this.totalPunchesEl.textContent = this.state.totalPunches;
    
    this.countJabEl.textContent = this.state.jabs;
    this.countHookEl.textContent = this.state.hooks;
    this.countUppercutEl.textContent = this.state.uppercuts;
    this.countOtherEl.textContent = this.state.unclassified;

    this.caloriesBurnedEl.textContent = this.state.calories.toFixed(1);
    this.comboCountEl.textContent = this.state.currentCombo;
    this.comboLevelEl.textContent = this.state.getComboLevel();

    // Update gauge rings
    const speedPct = Math.min(100, (this.state.peakSpeed / 8.0) * 100);
    document.getElementById("speed-progress-bar").style.width = `${speedPct}%`;

    const powerPct = this.state.peakPower;
    document.getElementById("power-progress-bar").style.width = `${powerPct}%`;
  }

  // ==========================================
  // CANVAS SKELETON DRAWER
  // ==========================================
  project3D(pt, width, height, angleY, angleX) {
    if (!pt) return null;

    // Scale metric coordinate to visual dimensions
    const scale = 220; 
    const x = pt.x * scale;
    const y = pt.y * scale;
    const z = pt.z * scale;

    // Rotation around Y (Yaw)
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const rx = x * cosY - z * sinY;
    const rz = x * sinY + z * cosY;

    // Rotation around X (Pitch)
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const finalY = y * cosX - rz * sinX;
    const finalZ = y * sinX + rz * cosX;
    
    // Perspective Division
    const d = 550; // View depth distance
    const f = 450; // Focal scale
    const pers = f / (d + finalZ);

    return {
      x: width / 2 + rx * pers,
      y: height / 2.3 + finalY * pers, // Center slightly higher for floor grid space
      z: finalZ,
      visibility: pt.visibility
    };
  }

  drawSkeleton(landmarks, worldLandmarks) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Drawing options
    const neonCyan = "#00e5ff";
    const neonMagenta = "#ff007f";
    const neonGreen = "#00ff9f";

    // Setup 3D rotation parameters
    const time = performance.now();
    const angleY = Math.sin(time / 2000) * 0.35; // Slow swing back and forth
    const angleX = 0.12; // Slight downward pitch for floor grid view depth

    const is3D = false;

    // Project points if 3D is active
    let projected = [];
    if (is3D) {
      for (let i = 0; i < worldLandmarks.length; i++) {
        projected[i] = this.project3D(worldLandmarks[i], w, h, angleY, angleX);
      }
    }

    // Draw lines between points with neon glow in 3D mode
    const drawLine = (pt1, pt2, color, thickness = 3) => {
      if (!pt1 || !pt2 || pt1.visibility < 0.5 || pt2.visibility < 0.5) return;
      ctx.beginPath();
      if (is3D) {
        ctx.moveTo(pt1.x, pt1.y);
        ctx.lineTo(pt2.x, pt2.y);
        ctx.shadowBlur = 18;
        ctx.shadowColor = color;
      } else {
        ctx.moveTo(pt1.x * w, pt1.y * h);
        ctx.lineTo(pt2.x * w, pt2.y * h);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // Draw joint glow circles
    const drawJoint = (pt, color, radius = 5) => {
      if (!pt || pt.visibility < 0.5) return;
      ctx.beginPath();
      if (is3D) {
        ctx.arc(pt.x, pt.y, radius, 0, 2 * Math.PI);
      } else {
        ctx.arc(pt.x * w, pt.y * h, radius, 0, 2 * Math.PI);
      }
      ctx.fillStyle = color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    };

    // Connections to draw — always use 2D landmarks for joint references
    // (the drawLine/drawJoint helpers handle coordinate conversion)
    // We also keep a separate 2D joints ref for posture comparisons
    const joints = is3D ? {
      shoulderL: projected[11], shoulderR: projected[12],
      elbowL: projected[13], elbowR: projected[14],
      wristL: projected[15], wristR: projected[16],
      hipL: projected[23], hipR: projected[24],
      kneeL: projected[25], kneeR: projected[26],
      ankleL: projected[27], ankleR: projected[28],
      nose: projected[0],
      eyeL: projected[2], eyeR: projected[5],
      earL: projected[7], earR: projected[8],
      mouthL: projected[9], mouthR: projected[10],
      pinkyL: projected[17], pinkyR: projected[18],
      indexL: projected[19], indexR: projected[20],
      thumbL: projected[21], thumbR: projected[22],
      heelL: projected[29], heelR: projected[30],
      toesL: projected[31], toesR: projected[32]
    } : {
      shoulderL: landmarks[11], shoulderR: landmarks[12],
      elbowL: landmarks[13], elbowR: landmarks[14],
      wristL: landmarks[15], wristR: landmarks[16],
      hipL: landmarks[23], hipR: landmarks[24],
      kneeL: landmarks[25], kneeR: landmarks[26],
      ankleL: landmarks[27], ankleR: landmarks[28],
      nose: landmarks[0],
      eyeL: landmarks[2], eyeR: landmarks[5],
      earL: landmarks[7], earR: landmarks[8],
      mouthL: landmarks[9], mouthR: landmarks[10],
      pinkyL: landmarks[17], pinkyR: landmarks[18],
      indexL: landmarks[19], indexR: landmarks[20],
      thumbL: landmarks[21], thumbR: landmarks[22],
      heelL: landmarks[29], heelR: landmarks[30],
      toesL: landmarks[31], toesR: landmarks[32]
    };

    // Always keep 2D normalized refs for posture color comparisons
    const joints2D = {
      wristL: landmarks[15], wristR: landmarks[16],
      shoulderL: landmarks[11], shoulderR: landmarks[12]
    };

    ctx.save();

    // Draw 3D floor grid if in Hologram mode
    if (is3D) {
      // Derive floor Y from ankle position if available, else fallback
      let floorY = 0.85;
      if (worldLandmarks[27] && worldLandmarks[28]) {
        floorY = Math.max(worldLandmarks[27].y, worldLandmarks[28].y) + 0.05;
      }

      ctx.strokeStyle = "rgba(0, 229, 255, 0.06)";
      ctx.lineWidth = 0.8;

      // Grid lines along Z axis
      for (let gx = -1.2; gx <= 1.2; gx += 0.3) {
        const p1 = this.project3D({ x: gx, y: floorY, z: -1.2, visibility: 1 }, w, h, angleY, angleX);
        const p2 = this.project3D({ x: gx, y: floorY, z: 1.2, visibility: 1 }, w, h, angleY, angleX);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // Grid lines along X axis
      for (let gz = -1.2; gz <= 1.2; gz += 0.3) {
        const p1 = this.project3D({ x: -1.2, y: floorY, z: gz, visibility: 1 }, w, h, angleY, angleX);
        const p2 = this.project3D({ x: 1.2, y: floorY, z: gz, visibility: 1 }, w, h, angleY, angleX);
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
      }

      // Center stance target ring
      const centerFloor = this.project3D({ x: 0, y: floorY, z: 0, visibility: 1 }, w, h, angleY, angleX);
      if (centerFloor) {
        ctx.beginPath();
        ctx.arc(centerFloor.x, centerFloor.y, 40, 0, 2 * Math.PI);
        ctx.strokeStyle = "rgba(255, 0, 127, 0.15)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    
    // Set colors based on activeFocusMode and posture errors
    let colorLeftArm = neonCyan;
    let colorRightArm = neonMagenta;
    let colorTorso = neonCyan;
    let colorLegs = "#64748b";
    
    // Joint colors
    let colorLeftWrist = this.leftTracker.isPunching ? neonGreen : neonCyan;
    let colorRightWrist = this.rightTracker.isPunching ? neonGreen : neonMagenta;
    let colorGeneralJoints = neonCyan;

    if (this.activeFocusMode === "upper") {
      // Fade out legs
      colorLegs = "rgba(100, 116, 139, 0.15)";
      
      // If guard is dropped, color forearm/wrist/shoulders red
      // Always compare using 2D normalized landmarks (not projected pixel coords)
      if (this.activeErrors.guardDropped) {
        if (joints2D.wristL && joints2D.shoulderL && joints2D.wristL.y > joints2D.shoulderL.y + 0.05) {
          colorLeftArm = "#ff3333";
          colorLeftWrist = "#ff3333";
        }
        if (joints2D.wristR && joints2D.shoulderR && joints2D.wristR.y > joints2D.shoulderR.y + 0.05) {
          colorRightArm = "#ff3333";
          colorRightWrist = "#ff3333";
        }
      }
      if (this.activeErrors.elbowFlare) {
        colorLeftArm = "#ff9f00";
        colorRightArm = "#ff9f00";
      }
    } else if (this.activeFocusMode === "lower") {
      // Fade out upper body
      colorLeftArm = "rgba(0, 229, 255, 0.15)";
      colorRightArm = "rgba(255, 0, 127, 0.15)";
      colorTorso = "rgba(0, 229, 255, 0.15)";
      colorLeftWrist = "rgba(0, 229, 255, 0.15)";
      colorRightWrist = "rgba(255, 0, 127, 0.15)";
      colorGeneralJoints = "rgba(0, 229, 255, 0.25)";

      // legs highlighting
      if (this.activeErrors.kneesLocked || this.activeErrors.stanceSquare || this.activeErrors.feetClose) {
        colorLegs = "#ff9f00"; // Stance warning orange
      } else {
        colorLegs = neonGreen; // Good stance green
      }
    } else if (this.activeFocusMode === "full") {
      if (this.activeErrors.guardDropped) {
        if (joints2D.wristL && joints2D.shoulderL && joints2D.wristL.y > joints2D.shoulderL.y + 0.05) {
          colorLeftArm = "#ff3333";
          colorLeftWrist = "#ff3333";
        }
        if (joints2D.wristR && joints2D.shoulderR && joints2D.wristR.y > joints2D.shoulderR.y + 0.05) {
          colorRightArm = "#ff3333";
          colorRightWrist = "#ff3333";
        }
      }
      if (this.activeErrors.kneesLocked || this.activeErrors.stanceSquare || this.activeErrors.feetClose) {
        colorLegs = "#ff9f00";
      }
    }

    // Draw Spine (nose → mid-shoulder → mid-hip) for richer wireframe
    if (joints.nose && joints.shoulderL && joints.shoulderR) {
      const midShoulderX = is3D ? (joints.shoulderL.x + joints.shoulderR.x) / 2 : ((joints.shoulderL.x + joints.shoulderR.x) / 2);
      const midShoulderY = is3D ? (joints.shoulderL.y + joints.shoulderR.y) / 2 : ((joints.shoulderL.y + joints.shoulderR.y) / 2);
      const midShoulder = { x: midShoulderX, y: midShoulderY, visibility: Math.min(joints.shoulderL.visibility, joints.shoulderR.visibility) };
      if (this.activeFocusMode !== "lower") {
        drawLine(joints.nose, midShoulder, colorTorso, 2);
      }
    }

    // Draw 3D Face Cage (Cyberpunk head mask)
    if (this.activeFocusMode !== "lower") {
      const faceColor = "rgba(0, 229, 255, 0.4)";
      drawLine(joints.eyeL, joints.eyeR, faceColor, 1);
      drawLine(joints.eyeL, joints.earL, faceColor, 1);
      drawLine(joints.eyeR, joints.earR, faceColor, 1);
      drawLine(joints.nose, joints.eyeL, faceColor, 1.5);
      drawLine(joints.nose, joints.eyeR, faceColor, 1.5);
      drawLine(joints.mouthL, joints.mouthR, faceColor, 1);
      drawLine(joints.nose, joints.mouthL, faceColor, 1);
      drawLine(joints.nose, joints.mouthR, faceColor, 1);
      drawLine(joints.earL, joints.mouthL, faceColor, 1);
      drawLine(joints.earR, joints.mouthR, faceColor, 1);
    }

    // Draw Torso box
    drawLine(joints.shoulderL, joints.shoulderR, colorTorso, 4);
    drawLine(joints.shoulderL, joints.hipL, colorTorso, 3);
    drawLine(joints.shoulderR, joints.hipR, colorTorso, 3);
    drawLine(joints.hipL, joints.hipR, colorTorso, 4);

    // Draw cross-brace torso for structural wireframe look
    if (is3D) {
      drawLine(joints.shoulderL, joints.hipR, "rgba(0, 229, 255, 0.08)", 1);
      drawLine(joints.shoulderR, joints.hipL, "rgba(0, 229, 255, 0.08)", 1);
    }

    // Draw Left Arm + Fist structure
    drawLine(joints.shoulderL, joints.elbowL, colorLeftArm, 4);
    drawLine(joints.elbowL, joints.wristL, colorLeftArm, 5);
    if (this.activeFocusMode !== "lower") {
      drawLine(joints.wristL, joints.pinkyL, colorLeftArm, 2);
      drawLine(joints.wristL, joints.indexL, colorLeftArm, 2);
      drawLine(joints.wristL, joints.thumbL, colorLeftArm, 2);
      drawLine(joints.indexL, joints.pinkyL, colorLeftArm, 2);
    }

    // Draw Right Arm + Fist structure
    drawLine(joints.shoulderR, joints.elbowR, colorRightArm, 4);
    drawLine(joints.elbowR, joints.wristR, colorRightArm, 5);
    if (this.activeFocusMode !== "lower") {
      drawLine(joints.wristR, joints.pinkyR, colorRightArm, 2);
      drawLine(joints.wristR, joints.indexR, colorRightArm, 2);
      drawLine(joints.wristR, joints.thumbR, colorRightArm, 2);
      drawLine(joints.indexR, joints.pinkyR, colorRightArm, 2);
    }

    // Draw Legs + Foot sole wedges
    drawLine(joints.hipL, joints.kneeL, colorLegs, 3);
    drawLine(joints.kneeL, joints.ankleL, colorLegs, 2);
    drawLine(joints.hipR, joints.kneeR, colorLegs, 3);
    drawLine(joints.kneeR, joints.ankleR, colorLegs, 2);
    if (this.activeFocusMode !== "upper") {
      drawLine(joints.ankleL, joints.heelL, colorLegs, 2);
      drawLine(joints.ankleL, joints.toesL, colorLegs, 2);
      drawLine(joints.heelL, joints.toesL, colorLegs, 2);

      drawLine(joints.ankleR, joints.heelR, colorLegs, 2);
      drawLine(joints.ankleR, joints.toesR, colorLegs, 2);
      drawLine(joints.heelR, joints.toesR, colorLegs, 2);
    }

    // Draw joint highlights
    Object.keys(joints).forEach(key => {
      // Skip detail points (fingers, feet endpoints, facial joints) to avoid glow dot clutter
      if (key === "eyeL" || key === "eyeR" || key === "earL" || key === "earR" || 
          key === "mouthL" || key === "mouthR" || key === "pinkyL" || key === "pinkyR" || 
          key === "indexL" || key === "indexR" || key === "thumbL" || key === "thumbR" || 
          key === "heelL" || key === "heelR" || key === "toesL" || key === "toesR") {
        return;
      }
      const joint = joints[key];
      if (key === "wristL") {
        drawJoint(joint, colorLeftWrist, 8);
      } else if (key === "wristR") {
        drawJoint(joint, colorRightWrist, 8);
      } else if (key === "nose") {
        if (joint && joint.visibility > 0.5 && this.activeFocusMode !== "lower") {
          ctx.beginPath();
          if (is3D) {
            ctx.arc(joint.x, joint.y, 14, 0, 2 * Math.PI);
          } else {
            ctx.arc(joint.x * w, joint.y * h, 14, 0, 2 * Math.PI);
          }
          ctx.strokeStyle = neonCyan;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
          drawJoint(joint, neonCyan, 3);
        }
      } else if (key === "kneeL" || key === "kneeR" || key === "ankleL" || key === "ankleR" || key === "hipL" || key === "hipR") {
        drawJoint(joint, this.activeFocusMode === "lower" ? colorLegs : colorGeneralJoints, 5);
      } else {
        drawJoint(joint, colorGeneralJoints, 5);
      }
    });

    // Draw neon movement visual guides if in Phase 2 learning mode
    if (this.trainingPhase === 2 && joints) {
      this.drawMoveVisualGuide(ctx, joints, is3D, w, h);
    }

    ctx.restore();
  }
}

// Instantiate and start loading resources
const app = new ShadowBoxerApp();
app.init();
