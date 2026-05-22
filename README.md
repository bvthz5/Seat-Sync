# 🏫 Seat-Sync — The Smart Seating Ecosystem

> "A beautiful, cheat-proof, and real-time exam seating arrangement ecosystem isolating End-Semester and Internal Exam algorithms."

<div align="center">
  
  [![Tech - React](https://img.shields.io/badge/Frontend-React%2019%20%26%20HeroUI-blueviolet?style=for-the-badge&logo=react)](https://react.dev)
  [![Tech - NodeExpress](https://img.shields.io/badge/Backend-Express%20%26%20TypeScript-818cf8?style=for-the-badge&logo=express)](https://expressjs.com)
  [![Tech - Sequelize](https://img.shields.io/badge/Database-Sequelize%20%26%20SQLite-38bdf8?style=for-the-badge&logo=sqlite)](https://sequelize.org)
  [![Realtime - Socket.io](https://img.shields.io/badge/Realtime-Socket.io%20Realtime-ec4899?style=for-the-badge&logo=socket.io)](https://socket.io)

</div>

---

## 📖 The Tale of Seat-Sync: How "Seaty" Saved Exam Day! 🤖

Let's take a quick look at a typical exam day before and after **Seat-Sync** came to the rescue:

### 🌪️ The Before: Chaos & Coffee
Meet **Admin Alice** 👔. Every mid-semester series, Alice spent three entire nights staring at giant Excel sheets, trying to seat 1,200 students. Classmates were seated right next to each other, inviting easy copying. 

Meanwhile, **Student Sam** 🎓 arrived at the exam center only to find a crowd of 300 students pushing against the main notice board just to find their hall number. 

### ⚡ The After: Seat-Sync Harmony!
Alice logs into the **Seat-Sync Admin Console**, uploads the exam registrations, selects the halls, and clicks **Generate Seating**. 

In less than **800 milliseconds**, our matchmaking bot **"Seaty"** 🤖:
1. Calculates physical room structures.
2. Group students by department and sorts them.
3. Splits them into **Left & Right Pools** (interleaving departments).
4. Dynamically distributes them **Column-Continuously** (vertically) down the aisles.

Immediately, **Student Sam** receives a real-time **Socket.io notification** on his student portal dashboard:
> *"Hi Sam! Your exam CST301 is in Block A, Room 102, Seat A-3-1."*

No crowds, no chaos, no copying. **Just pure academic harmony!** 🎯

---

## 🎨 Cartoon Storyboard & Live Simulation

We have built a gorgeous, self-contained **Interactive Cartoon Storyteller**! It guides you step-by-step through the seating algorithm with playful SVG illustrations and a live visual simulator.

👉 **To watch the seating magic in action:**
1. Open the file [visual_storyteller.html](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/visual_storyteller.html) in any modern web browser.
2. Click **"Run Matchmaking Step"** to watch desks fill up with students in real time!
3. Read the detailed math constraints behind this in our [Seating Algorithms Reference](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/seating_visualization.md).

---

## 🏛️ System Core Architecture & Tech Stack

Seat-Sync is split into a robust frontend client and a high-performance backend server, keeping administrative and candidate ecosystems perfectly isolated.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             SEAT-SYNC ECOSYSTEM                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
┌──────────────────────────────────┐                 ┌──────────────────────────────────┐
│         FRONTEND (CLIENT)        │                 │         BACKEND (SERVER)         │
├──────────────────────────────────┤                 ├──────────────────────────────────┤
│ • React 19 (TypeSafe Views)      │                 │ • Node.js & Express 5 (REST APIs)│
│ • Vite (Ultra-fast Dev Server)   │                 │ • TSX Watch (Fast TS Compiles)   │
│ • HeroUI & TailwindCSS (Styling) │ ◀── Socket.io ─▶│ • Sequelize ORM & SQLite (Data)  │
│ • Redux Toolkit (State Sync)     │     Real-Time   │ • Swagger UI (Swagger-jsdoc APIS)│
│ • Lottie-React (Micro-Anims)     │                 │ • Node-Cron (Academic Schedulers)│
└──────────────────────────────────┘                 └──────────────────────────────────┘
```

### 💻 Client-Side Tech Stack
* **Core Framework**: React 19 & TypeScript.
* **Build Engine**: Vite.
* **Component UI System**: **HeroUI** (built on top of React Aria) for accessibility and animations.
* **State Management**: Redux Toolkit (`@reduxjs/toolkit`).
* **Visual Polish & Effects**: `framer-motion` (animations), `lottie-react` (Lottie illustrations), `recharts` (dashboard analytics), and `vanta` (interactive backgrounds).
* **PDF Engine**: `jspdf` & `jspdf-autotable` for generating invigilator seating charts.

### ⚙️ Server-Side Tech Stack
* **Runtime & Framework**: Node.js & Express 5 (TypeScript native compilation).
* **Database & ORM**: **Sequelize** database mapper on top of a highly indexed **SQLite3** engine (can be pointed to MySQL / PostgreSQL in `.env`).
* **Real-time Gateway**: **Socket.io** (real-time notification delivery to active sessions).
* **Parsers & Engines**: `xlsx` (SheetJS) for bulk Excel imports, `mammoth` (DOCX extraction), `pdf-parse` (PDF processing), and `tesseract.js` (OCR extraction from images).
* **Documentation**: **Swagger** (`swagger-ui-express` & `swagger-jsdoc`) automatically exposing APIs under `/api-docs`.

---

## 🌟 Major Features & Capability Ecosystems

### 1. Dual Seating Engine Isolation
* 🎓 **End-Semester Seating Engine**: Arranges physical rooms, tracks seat maps, and supports diff updates (`IsActive` state toggling) to prevent database referential breakage when modifying layouts.
* 📝 **Internal (Series) Seating Engine**: Solves subject interleaving (CS/ME/EC next to each other on dual benches) and continuous register ordering down columns.

### 🏢 2. Academic Infrastructure Modeler
* Visualizes college architecture: **Blocks ──▶ Floors ──▶ Rooms ──▶ Seats**.
* Supports custom row and bench configurations (e.g., Row A has 3 benches, Row B has 4 benches, with 1 or 2 seats per bench).

### 🕵️ 3. Invigilator Management & Duty Swapping
* Dynamic duty assignments based on availability and exam slots.
* Fully interactive **Duty Swapping Console** allowing invigilators to request trades and administrators to approve them with single-click actions.

### 🔔 4. Real-time Student & Invigilator Portal
* Live student dashboards that display seat numbers and active exam rooms instantly.
* Real-time socket updates for room/bench reassignments or notifications.

---

## 🚀 Step-by-Step Local Setup Guide

Follow these simple steps to run Seat-Sync locally on your machine.

### Prerequisites
Make sure you have installed:
* **Node.js** (v18.x or above)
* **npm** (v9.x or above)

---

### 📂 Step 1: Setting up the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Configure environment settings:
   Create a `.env` file in the `backend` folder (you can copy [.env.example](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/backend/.env.example)):
   ```env
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=supersecretkey_change_me
   DB_STORAGE=./database.sqlite
   ```

4. Start the backend developer server:
   ```bash
   npm run dev
   ```
   *The backend will boot up at **`http://localhost:5000`**.*
   *You can view the fully documented interactive REST APIs at **`http://localhost:5000/api-docs`**.*

---

### 🎨 Step 2: Setting up the Frontend

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install frontend dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the `frontend` folder to point to the backend API:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the frontend local server:
   ```bash
   npm run dev
   ```
   *The client will boot up and be accessible at **`http://localhost:5173`** (or another port outputted in your console).*

---

## 🧪 Seating Engine Algorithm Specifications
For a deep dive into the mathematical models, pool balancing formulas, and matrix matching parameters, please consult the **[Seating Algorithms Technical Reference Guide](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/seating_visualization.md)**.

---

<div align="center">
  <p>Developed with ❤️ for perfect exam integrity and smooth campus experiences.</p>
  <b>Seat-Sync — Arranging Success, Bench by Bench.</b>
</div>
