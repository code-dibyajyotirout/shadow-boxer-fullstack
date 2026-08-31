# SHADOW BOXER

> **Browser-Native AI WebAssembly Boxing Physics Engine & Real-Time Biomechanics Tracker**

[![npm version](https://img.shields.io/npm/v/@animatrous/shadow-boxer.svg)](https://www.npmjs.com/package/@animatrous/shadow-boxer)
[![NPM Package Repo](https://img.shields.io/badge/GitHub-NPM_Package-blue?logo=github)](https://github.com/code-dibyajyotirout/shadow-boxer-npm-package)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-WASM-orange)](https://developers.google.com/mediapipe)

**Shadow Boxer** is a high-performance, privacy-first computer vision fitness application and SDK running 100% inside the browser. By leveraging Google MediaPipe Pose via WebAssembly (WASM) and hardware-accelerated Canvas rendering, Shadow Boxer tracks 33 skeletal landmarks in real time to calculate striking speed, acceleration, power metrics, and combo accuracy at 60 FPS with zero server latency.

---

## NPM Package

The core kinematics engine, signal processing filters, and UI components are available as a standalone NPM package:

```bash
npm install @animatrous/shadow-boxer
```

- **NPM Registry**: [npmjs.com/package/@animatrous/shadow-boxer](https://www.npmjs.com/package/@animatrous/shadow-boxer)
- **Package Repository**: [code-dibyajyotirout/shadow-boxer-npm-package](https://github.com/code-dibyajyotirout/shadow-boxer-npm-package)

---

## Key Features

- **Real-Time Skeletal Pose Estimation**: Tracks 33 3D body landmarks at 60 FPS using MediaPipe WASM Vision Tasks.
- **Kinematic & Biomechanical Analysis**:
  - **Punch Velocity**: Live speed calculation in meters per second ($m/s$).
  - **Acceleration Vectors**: Instantaneous acceleration curves in $m/s^2$.
  - **Power Index**: Kinetic force approximation derived from velocity and joint extension ratios.
- **Strike Archetype Classifier**:
  - Automatically identifies and grades **Jabs / Crosses**, **Hooks**, **Uppercuts**, **Slips**, and **Ducks**.
  - Visual target indicators and real-time hit detection zones.
- **Adaptive 1€ Filter (OneEuroFilter)**: Suppresses webcam sensor noise and landmark jitter during stationary stances while maintaining sub-frame responsiveness on fast-twitch strikes.
- **Procedural Web Audio FX Engine**: Dynamic, synthesized swooshes, impact bass booms, and combo completion chimes generated on the fly via the Web Audio API (no external MP3/WAV assets needed).
- **Workout Modes & Combo Builder**:
  - Presets: *Cardio Blitz*, *Heavy Hitter*, *Elusive Boxer*, and *Mixed Combos*.
  - *Custom Combo Builder*: Interactive sequence creator to configure and train custom punch combinations.
- **100% Private & Local-First**: All computer vision inference and coordinate math execute locally on your machine. No webcam feeds or biometric data are transmitted over the network.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, Static Export ready)
- **Language**: [TypeScript](https://www.typescriptlang.org/) & Modern ES Modules
- **Computer Vision**: [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) (WASM Pose Landmarker)
- **Audio Engine**: Web Audio API (Procedural Oscillator / Bandpass Synthesis)
- **Styling**: Cyberpunk HUD aesthetics using Vanilla CSS with CSS Variables & Glassmorphism

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20.9.0 or later recommended for Next.js 16)
- npm, pnpm, or yarn
- Modern web browser with WebAssembly and WebRTC/Camera access (Chrome, Edge, Firefox, Brave, Safari)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/code-dibyajyotirout/shadow-boxer.git
   cd shadow-boxer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser, allow webcam permissions when prompted, and start training!

---

## Project Structure

```text
shadow-boxer/
├── public/                  # Static assets and client scripts
│   ├── app.js               # Core WASM pose tracking & physics loop
│   ├── favicon.svg          # Vector favicon
│   ├── og-image.png         # OpenGraph social preview card
│   └── ...
├── src/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css      # Cyberpunk HUD design system tokens
│   │   ├── layout.tsx       # Root layout with SEO and font configuration
│   │   ├── page.module.css
│   │   └── page.tsx         # Root application page
│   └── components/
│       └── ShadowBoxerClient.tsx # Client-side HUD layout & controls
├── LICENSE                  # GNU Affero General Public License v3.0
├── next.config.ts           # Next.js configuration
├── package.json
└── tsconfig.json
```

---

## Configuration & Customization

Inside the in-app **Settings & Calibration** drawer, you can fine-tune the engine parameters in real-time:

| Parameter | Default | Description |
| :--- | :--- | :--- |
| **Punch Velocity Threshold** | `1.5 m/s` | Minimum instantaneous wrist speed required to register a strike. |
| **Jitter Smoothing Filter** | `1.5 Hz` | Cutoff frequency for the 1€ landmark smoothing filter. Lower = smoother; Higher = faster reaction. |
| **Target Timeout** | `4.0 s` | Time allowed to land the prompted strike in a combo sequence before timing out. |

---

## Privacy

Shadow Boxer does not store, record, or transmit your camera feed or coordinate data. All MediaPipe neural network inferences are processed client-side via WebAssembly on your device's CPU/GPU.

---

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](LICENSE) file for details.
