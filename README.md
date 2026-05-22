# 🏛️ SEAT-SYNC — Smart Academic Seating & Exam Integrity Ecosystem

> [!IMPORTANT]
> **Seat-Sync** is an enterprise-grade academic seating scheduler designed to eliminate exam collusion, optimize campus hall capacity, and dispatch instant real-time student seat placement notifications.
> The architecture maintains a strict, mathematically verifiable separation between **University End-Semester** and **Internal Series (Midterm)** exam modules.

<div align="center">
  <p align="center">
    <img src="https://img.shields.io/badge/Frontend-React%2019%20%26%20TypeScript-61daf4?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
    <img src="https://img.shields.io/badge/Backend-Express%205%20%26%20TypeScript-818cf8?style=for-the-badge&logo=express&logoColor=white" alt="Express 5" />
    <img src="https://img.shields.io/badge/ORM-Sequelize%20v6-38bdf8?style=for-the-badge&logo=sequelize&logoColor=white" alt="Sequelize ORM" />
    <img src="https://img.shields.io/badge/Realtime-Socket.io%20WebSockets-ec4899?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.io" />
  </p>
  
  <p align="center">
    <a href="#-interactive-matchmaking-visual-map"><strong>Explore Seating Map</strong></a> • 
    <a href="#-immersive-storytelling-storyboard"><strong>Watch the Animated Story</strong></a> • 
    <a href="#-database-multi-dialect-resilience"><strong>Database Resiliency Specs</strong></a> • 
    <a href="#-system-core-architecture"><strong>Architecture Details</strong></a>
  </p>
</div>

---

## ⚡ Technical Quick Navigation Console
```
 ┌────────────────────────────────────────────────────────────────────────────┐
 │  📖 Roster Split Engine    |  🎨 Interactive Visualizer  |  🛠️ Tech Stack   │
 │  🗄️ Database Auto-Fallback  |  🚀 Local Setup Console     |  📐 Algorithms   │
 └────────────────────────────────────────────────────────────────────────────┘
```
* **Immersive Animated Storyboard**: [visual_storyteller.html](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/visual_storyteller.html) *(Double click to run locally!)*
* **Algorithmic & Mathematical Specification**: [seating_visualization.md](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/seating_visualization.md) *(LaTeX formulas and soft-diff mechanisms)*

---

## 🎨 Interactive Matchmaking Visual Map

The matching sequence and real-time synchronization between pools and physical seats is illustrated in the live animated vector diagram below. Opening this repository in any rich markdown viewer renders dynamic flowing animations:

<div align="center" style="margin: 24px 0; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 45px rgba(12, 17, 36, 0.6); border: 2px solid rgba(255,255,255,0.06);">
  <img src="./seating_animation.svg" width="100%" alt="Seat-Sync Realtime Seating Matchmaking Flow" />
</div>

---

## 📖 The Story of Seat-Sync: Resolving the Exam Crisis 🤖

Here is how **Seat-Sync** transforms chaotic campus halls into streamlined, cheating-proof academic hubs:

```
  TRADITIONAL CRISIS (CHAOTIC)                  SEAT-SYNC HARMONY (SECURED)
 ┌───────────────────────────────────┐        ┌───────────────────────────────────┐
 │ • Alice struggles with manual Excels│        │ • 800ms generation execution      │
 │ • Crowds gather at bulletin boards│ ───►   │ • Dual Left/Right Pool balancing  │
 │ • Classmates sit side-by-side     │        │ • Vertical Column-Continuous flow │
 │ • Administrative stress & mistakes│        │ • Direct real-time WebSockets SMS │
 └───────────────────────────────────┘        └───────────────────────────────────┘
```

### 🌪️ The Traditional Crisis
Meet **Admin Alice** 👔. Every mid-semester series, Alice spent sleepless nights manually formatting Excel columns to generate exam hall lists. Inevitably, classmates from the same department sat directly next to each other, inviting exam dishonesty.

Meanwhile, **Student Sam** 🎓 arrived at the college only to find a crowd of 300 students pushing against a physical bulletin board trying to find their designated seats. 

### ⚡ The Seat-Sync Harmony!
Alice logs into the **Seat-Sync Console**, uploads the student rosters, selects the active exam rooms, and clicks **Generate Seating**. 

In less than **800 milliseconds**, our matchmaking bot **"Seaty"** 🤖:
1. **Calculates** physical room capacities and bench boundaries.
2. **Groups** candidates by their specific subject codes.
3. **Splits** the roster into balanced **Left & Right Pools** (interleaving departments horizontally).
4. **Routes** them **Column-Continuously** (vertically) down the aisles.

Immediately, **Student Sam** receives a real-time **Socket.io notification** on his portal dashboard:
> 🔔 *"Hi Sam! Your exam CST301 is in Block A, Room 102, Seat A-3-1."*

---

## 🎮 Playable Animated Cartoon Storyboard

We have built a gorgeous, self-contained **Interactive Cartoon Storyteller**! It guides you step-by-step through the seating algorithm with playful animations and a live visual simulator.

👉 **To watch the seating magic in action:**
1. Open the file [visual_storyteller.html](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/visual_storyteller.html) in any modern web browser.
2. Reconfigure the room bench capacity and modes dynamically.
3. Click **"Run Matchmaking Step"** to watch candidates fly into desks in real time with high-fidelity canvas physics, particle bursts, and dynamically synthesized audio cues!
4. Adjust synthesizer waveforms (Sine 🌊, Triangle 📐, Square ⬜, Sawtooth 📈) and volumes directly on the deck!
5. Read the deep mathematical constraints behind this in our [Seating Algorithms Reference Guide](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/seating_visualization.md).

---

## 🗄️ Database Multi-Dialect Resilience (SQLite & MySQL)

Seat-Sync incorporates a dynamic database virtualization layer managed by Sequelize ORM, ensuring an automated zero-config local developer sandbox that scales seamlessly into an enterprise production cluster:

<div align="center" style="margin: 24px 0; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 45px rgba(12, 17, 36, 0.6); border: 2px solid rgba(255,255,255,0.06);">
  <img src="./database_sync_animation.svg" width="100%" alt="Seat-Sync Dynamic Database Fallback System Map" />
</div>

### Dynamic DB Comparison Grid

| Parameter | 🐬 MySQL / MariaDB (Primary Cluster) | 🗃️ SQLite (Dynamic Auto-Fallback) |
| :--- | :--- | :--- |
| **Operational Scope** | High-throughput Production & Staging nodes | Zero-Configuration Sandbox & Local Development |
| **Storage Medium** | Dedicated relational server (Port `3306`) | Native file database (`backend/database.sqlite`) |
| **Collation Integrity** | Full `utf8mb4_unicode_ci` Unicode enforcement | Standard binary SQLite storage definitions |
| **Link Pooling** | Enforced pooling (`max: 10`, idle timeout `10s`) | Direct file transaction locks |
| **Recovery Strategy** | Active health pings on initialization | Instantly mounts if host server port is blocked |

### 🔄 The Automated Connection Fallback Sequence
1. **Bootstrap Scan**: Upon booting, the server parses environment configuration boundaries.
2. **Cluster Connection**: If MySQL configurations (`DB_NAME`, `DB_USER`, `DB_HOST`) are set in `.env`, the Sequelize ORM establishes an active pool connecting to the primary MySQL server.
3. **Exception Trapping & Redirection**: If connection parameters fail, timeout, or the MySQL port is blocked, the custom adapter catches the error and logs a friendly system warnings:
   `[Sequelize] Connection to MySQL failed. Initiating database fallback routing...`
4. **SQLite Disk Mounting**: The driver automatically mounts a local file-based database store `database.sqlite` within the root directory and executes standard schema audits, ensuring that developers are immediately up and running without installing databases.

---

## 🏛️ System Core Architecture & Tech Stack

```
  ┌────────────────────────────────────────────────────────────────────────┐
  │                             SEAT-SYNC ECOSYSTEM                        │
  └────────────────────────────────────┬────────────────────────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
  ┌──────────────────────────────────┐                 ┌──────────────────────────────────┐
  │         FRONTEND (CLIENT)        │                 │         BACKEND (SERVER)         │
  ├──────────────────────────────────┤                 ├──────────────────────────────────┤
  │ • React 19 & TypeScript          │                 │ • Express 5 (REST APIs)          │
  │ • Vite Dev Pipeline              │                 │ • TSX Watch (Hot Compiles)       │
  │ • HeroUI & TailwindCSS           │ ◀── Socket.io ─►│ • Sequelize ORM                  │
  │ • Redux Toolkit (State Slices)   │     Real-Time   │ • SQLite & MySQL Multi-dialects  │
  │ • Framer Motion & Lottie         │                 │ • Swagger JS-Doc (/api-docs)     │
  └──────────────────────────────────┘                 └──────────────────────────────────┘
```

<details>
<summary><b>📐 Expand Tech Stack Components Spec</b></summary>

### 💻 Client-Side Tech Stack
* **Core Framework**: React 19 & TypeScript.
* **Build Pipeline**: Vite.
* **Component UI System**: **HeroUI** (accessible, animated utility structures).
* **State Management**: Redux Toolkit (`@reduxjs/toolkit`).
* **Animations & Effects**: `framer-motion`, `lottie-react`, and `vanta` (interactive backdrops).
* **Charts & Analytics**: `recharts` for administrative dashboard analytics.
* **PDF Exporters**: `jspdf` & `jspdf-autotable` for generating invigilator seating charts.

### ⚙️ Server-Side Tech Stack
* **Runtime & Framework**: Node.js & Express 5 (TypeScript native compilation).
* **Database & ORM**: **Sequelize** database mapper supporting dynamic MySQL and SQLite dialects.
* **Real-time Engine**: **Socket.io** (real-time notification delivery to active portal sessions).
* **Document Parsers**: `xlsx` (Excel imports), `mammoth` (DOCX extraction), `pdf-parse` (PDF processing), and `tesseract.js` (OCR extraction).
* **Documentation**: **Swagger** (`swagger-ui-express` & `swagger-jsdoc`) automatically exposing APIs under `/api-docs`.
</details>

---

## 🚀 Step-by-Step Local Setup Guide

Follow these steps to spin up the Seat-Sync project locally.

### Prerequisites
* **Node.js** (v18.x or above)
* **npm** (v9.x or above)

### 📂 Phase 1: Backend Installation & Setup

1. **Navigate to the Backend Directory**:
   ```bash
   cd backend
   ```

2. **Install Node Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend` folder (or duplicate [.env.example](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/backend/.env.example)):
   
   * **For SQLite (Quick Start)**:
     ```env
     PORT=5000
     NODE_ENV=development
     JWT_SECRET=supersecretkey_change_me
     DB_FALLBACK_TO_SQLITE=true
     ```
   * **For MySQL (Production Grade)**:
     ```env
     PORT=5000
     NODE_ENV=development
     JWT_SECRET=supersecretkey_change_me
     DB_DIALECT=mysql
     DB_HOST=127.0.0.1
     DB_PORT=3306
     DB_NAME=seatsyncdb
     DB_USER=root
     DB_PASS=your_password
     DB_FALLBACK_TO_SQLITE=true
     ```

4. **Boot the Backend Server**:
   ```bash
   npm run dev
   ```
   * The backend will spin up at **`http://localhost:5000`**.
   * Explore the interactive API documentation at **`http://localhost:5000/api-docs`**.

---

### 🎨 Phase 2: Frontend Installation & Setup

1. **Navigate to the Frontend Directory**:
   ```bash
   cd ../frontend
   ```

2. **Install Node Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the `frontend` folder:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Boot the Vite Hot-Reload Client**:
   ```bash
   npm run dev
   ```
   * The frontend will spin up and be accessible at **`http://localhost:5173`**.

---

<div align="center" style="margin-top: 50px;">
  <p>Developed with ❤️ for perfect exam integrity and smooth campus experiences.</p>
  <b>Seat-Sync — Arranging Success, Bench by Bench.</b>
</div>
