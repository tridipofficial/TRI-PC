# TRI AI — Personal Windows Desktop Assistant (Clean-Room Implementation)

**TRI AI** is an independent, 100% free, personal Windows desktop assistant inspired by multimodal AI desktop HUDs (such as Archer AI from the Microsoft Store). It runs entirely locally on your Windows machine without requiring expensive subscriptions, cloud fees, or third-party API keys.

---

## 1. Verified Target & Clean-Room Origin

- **Inspiration Target**: Archer Ai (`XP895HSHSTPGGX` on the Microsoft Store) by MD. ABDUL SAMIR TUHIN.
- **Specification**: Documented in [`SPECIFICATION.md`](SPECIFICATION.md).
- **Clean-Room Guarantee**: All code, animations, state stores, and local logic in this project are 100% independently authored. Zero proprietary binaries, assets, trademarks, or protected code were copied.

---

## 2. Key Features

1. **3-Column Sci-Fi HUD Interface**:
   - **Left Column**: Objective and task tracker with priority badges (`HIGH`, `MEDIUM`, `LOW`), categories (`WORK`, `PERSONAL`), progress calculation, and 2D/3D Satellite World Stream monitor.
   - **Center Column**:
     - **Neural Core**: 3D animated particle orb and circuit fiber optic connectors reflecting system state (`Memory`, `Soul`, `Skills`, `Settings`).
     - **Agent Town**: 2D pixel-art office simulation of autonomous desktop agents (`Alice`, `Bob`, `Carol`, `Dave`) working at desks with interactive thought bubbles and status badges.
     - **Visual Hub**: Interactive concept mindmap and knowledge graph with drag-to-pan and mouse-wheel zoom.
   - **Right Column**: Live reasoning stream with visible chain-of-thought steps (`Initiating Contextual Analysis` $\to$ `Re-evaluating System State` $\to$ `Defining the Goal`) and interactive conversational assistant.

2. **100% Free & Local (Zero Subscriptions Required)**:
   - **Built-in Offline Intelligence**: Instant local deterministic assistant handles objectives, system stats, multi-agent status, and guidance out of the box with zero keys.
   - **Local Ollama Integration**: Automatically detects and bridges to a local [Ollama](https://ollama.com) instance (`http://127.0.0.1:11434`) if running (Llama 3, Phi-3, Mistral, Qwen).
   - **Voice Assistant**: Hands-free voice recognition and speech synthesis using standard Windows browser Web Speech APIs.
   - **Multimodal Screen Capture**: One-click desktop screen capture tool for visual context analysis.

---

## 3. Quick Start on Windows

### Option A: One-Click Launcher (Easiest)
Simply double-click:
```cmd
start.bat
```
This automatically verifies Node.js, starts the local server, and launches TRI AI in your default browser.

### Option B: Terminal Command
Run from PowerShell or Command Prompt inside `d:\Revers Engine`:
```cmd
node server.js
```
Then open your browser to:
```text
http://127.0.0.1:3456
```

---

## 4. Hardware Requirements

- **Operating System**: Windows 10 or Windows 11 (x64)
- **Node.js**: v18.x, v20.x, v22.x, or v24.x (Tested on v24.19.0)
- **RAM**:
  - Built-in Local Engine: < 100 MB RAM
  - With Local Ollama LLM (e.g. Llama-3-8B / Phi-3): 8 GB – 16 GB RAM (or 4 GB+ GPU VRAM)
- **Cost**: **$0.00** (Free & Open Source)
