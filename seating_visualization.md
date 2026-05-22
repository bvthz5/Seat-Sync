# 📐 SEAT-SYNC: Seating Algorithms & Mathematical Specification

<div align="center">

> **Technical Engine Specification** — Rigorous mathematical algorithms, data structures, and database routing logic powering the Seat-Sync seating allocation core.

<p align="center">
  <img src="https://img.shields.io/badge/Algorithms-Anti--Collusion%20Engine-818cf8?style=for-the-badge&logo=databricks&logoColor=white" alt="Algorithms" />
  <img src="https://img.shields.io/badge/Math-LaTeX%20Equations-10b981?style=for-the-badge&logo=overleaf&logoColor=white" alt="Math" />
  <img src="https://img.shields.io/badge/Database-MySQL%20%26%20SQLite-38bdf8?style=for-the-badge&logo=mysql&logoColor=white" alt="Database" />
  <img src="https://img.shields.io/badge/ORM-Sequelize%20v6-ec4899?style=for-the-badge&logo=sequelize&logoColor=white" alt="Sequelize" />
</p>

</div>

---

## ⚡ Technical Quick Console

```
 ╔════════════════════════════════════════════════════════════════════════════╗
 ║  📐 Space Capacity Eq   ║  🌊 Pool Splitting Logic   ║  🗄️ DB Resilience  ║
 ║  🛡️ Anti-Collusion Guard ║  🔄 Soft-Diff Lifecycle    ║  🧮 Seat Matrix    ║
 ╚════════════════════════════════════════════════════════════════════════════╝
```

| Document Section | Description | Jump To |
|:---|:---|:---:|
| 📊 Physical Grid & Diff Engine | `generateSeats` capacity equation and soft-update protocol | [↓](#-1-physical-grid--diff-engine-generateseats) |
| 🛡️ Internal Seating Engine | `InternalSeatAllocator` anti-cheating constraints | [↓](#️-2-the-internal-seating-engine-internalseat-allocator) |
| 🗄️ Database Architecture | MySQL & SQLite multi-dialect resilience layer | [↓](#️-3-database-multi-dialect-architecture-mysql--sqlite) |
| 🎮 Interactive Storyboard | Full playable animation launcher | [↓](#-playable-interactive-storyboard) |

---

## 🎨 Engine Matchmaking Visual Map

The matching sequence and real-time synchronization between queues and physical seats is rendered in the live animated vector diagram below. Open this repository in any rich markdown viewer to see the flowing SMIL animations:

<div align="center" style="margin: 24px 0; border-radius: 22px; overflow: hidden; box-shadow: 0 18px 55px rgba(5, 7, 20, 0.7); border: 2px solid rgba(255,255,255,0.06);">
  <img src="./seating_animation.svg" width="100%" alt="Seat-Sync Realtime Seating Matchmaking Flow — Anti-Collusion Dual-Pool Interleaving" />
</div>

> [!NOTE]
> This diagram uses native **SMIL** animations (`<animateMotion>`, `<animate>`) that render inline on GitHub without any JavaScript, bypassing Content Security Policy restrictions completely.

---

## 🏛️ System Core Modules

Seat-Sync enforces rigid architectural separation between the **University End-Semester** and **Internal Series** exam modules:

```
                            ┌─────────────────────────────────┐
                            │      SEAT-SYNC ENGINE CORE      │
                            └────────────────┬────────────────┘
                                             │
                       ┌──────────────────────┴──────────────────────┐
                       ▼                                             ▼
         ┌───────────────────────────┐                 ┌───────────────────────────┐
         │  University End-Semester  │                 │    Internal Ecosystem     │
         │      Seating Module       │                 │   (Series / Midterms)     │
         ├───────────────────────────┤                 ├───────────────────────────┤
         │ • Physical Row/Bench Diff │                 │ • Dual-Pool Balancing     │
         │ • Sequence Roster Mapper  │                 │ • Subject Interleave      │
         │ • Active/Inactive Preserv │                 │ • Alphanumeric Continuity │
         │ • Hall Capacity Equations │                 │ • Column-Continuous Flow  │
         └───────────────────────────┘                 └───────────────────────────┘
```

> [!WARNING]
> **Data Decoupling Enforced**: End-Semester tables and registration records are structurally isolated from Internal Series modules in the database to prevent cross-contamination of academic records and simplify exam audits.

---

## 📊 1. Physical Grid & Diff Engine (`generateSeats`)

To prevent database referential integrity breaking (e.g. orphan primary keys on seat allocation charts and historical audit logs), Seat-Sync relies on a soft **diff algorithm** instead of destructive database truncate-and-write workflows when layouts are updated.

### 📐 The Capacity Equation

A physical room's capacity is determined by a JSON array of benches per row, where Row index $i$ is labeled alphabetically ($A, B, C, \dots$):

$$\text{Capacity}_{\text{Room}} = \sum_{i=0}^{N-1} \left( \text{Benches}_{\text{Row}_i} \times \text{SeatsPerBench} \right)$$

Where:
- $N$ represents the total rows configured in the physical hall structure.
- $\text{Benches}_{\text{Row}_i}$ represents the number of benches in Row $i$.
- $\text{SeatsPerBench}$ is the physical seat count per bench (Single: `1`, Dual/Paired: `2`).

**Example calculation** for a hall with 3 rows of 6 dual-seat benches each:

$$\text{Capacity} = (6 \times 2) + (6 \times 2) + (6 \times 2) = 36 \text{ seats}$$

---

### 🔄 Soft-Update Diff Lifecycle

Instead of running a destructive `DELETE FROM Seats`, Seat-Sync maps incoming grid adjustments against active records in three transaction-safe steps:

```
                   ┌──────────────────────────────────────────┐
                   │        ADMIN SAVES ROOM LAYOUT           │
                   └─────────────────┬────────────────────────┘
                                     │
             Compute expected keys: "RowLabel-BenchIndex-SeatIndex"
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
         Check against Active DB records     Check for Missing DB keys
                     │                               │
            Key NOT in Expected             Key NOT in DB records
                     │                               │
                     ▼                               ▼
         [Mark seat.IsActive = false]        [Add to insertQueue]
                     │                               │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                        Execute safe Sequelize batch:
                        • bulkCreate(insertQueue)
                        • update(IsActive = false)
```

> [!IMPORTANT]
> This approach ensures **zero orphan foreign-key violations** on related `SeatAllocations`, `AuditLogs`, and `InvigilatorAssignment` tables. Seats are never physically deleted — only soft-deactivated, preserving complete historical integrity.

---

## 🛡️ 2. The Internal Seating Engine (`InternalSeatAllocator`)

The internal engine enforces three rigorous constraints to eliminate academic cheating opportunities:

1. **Vertical Column-Continuous Placement**: Placing consecutive roster candidates vertically down columns rather than horizontally across benches (since cross-shoulder cheating is significantly easier).
2. **Horizontal Interleaving**: Forcing candidates sitting next to each other on the same dual bench to belong to entirely different subjects or departments.
3. **Register Number Sequence Continuity**: Ensuring that within each vertical column, students of the same department are placed in continuous ascending alphanumeric sequence to simplify grading pack allocations.

### 🔲 Interleaved Seating Matrix Model

Let the exam seating layout of a room with $R$ rows and $C$ columns of benches be represented by matrix $\mathbf{H}$ of dimensions $R \times (2C)$, where Seat 1 and Seat 2 of Bench $j$ are at columns $2j-1$ and $2j$:

$$\mathbf{H} = \begin{pmatrix}
S^{(L)}_{1,1} & S^{(R)}_{1,2} & \dots & S^{(L)}_{1,2C-1} & S^{(R)}_{1,2C} \\
S^{(L)}_{2,1} & S^{(R)}_{2,2} & \dots & S^{(L)}_{2,2C-1} & S^{(R)}_{2,2C} \\
\vdots & \vdots & \ddots & \vdots & \vdots \\
S^{(L)}_{R,1} & S^{(R)}_{R,2} & \dots & S^{(L)}_{R,2C-1} & S^{(R)}_{R,2C}
\end{pmatrix}$$

**Anti-Collusion Constraint** — For any bench $j$ in any row $i$:

$$\text{Department}\left(S^{(L)}_{i,2j-1}\right) \neq \text{Department}\left(S^{(R)}_{i,2j}\right), \quad \forall\ i,j$$

This matrix constraint mathematically guarantees that **no two adjacent bench-mates share the same department** across the entire room.

Where:
- $S^{(L)}_{i, 2j-1}$ holds candidates from the **Left Pool** ($\mathcal{P}_L$) in ascending alphanumeric sequence.
- $S^{(R)}_{i, 2j}$ holds candidates from the **Right Pool** ($\mathcal{P}_R$) in ascending alphanumeric sequence.

---

### 🌊 The Dual-Pool Splitting Protocol

To achieve horizontal interleaving, the engine splits students into two balanced queues: the **Left Pool** ($\mathcal{P}_L$) and the **Right Pool** ($\mathcal{P}_R$).

#### Step A: Student Queue Aggregation

All registered candidates are sorted alphanumerically by their **Register Number** within their respective subject queues:

$$\text{Queue}_s = \left[ \text{Student}_{s,1},\ \text{Student}_{s,2},\ \dots,\ \text{Student}_{s,M} \right]$$
$$\text{where: } \text{RegNo}_{s,i} \le \text{RegNo}_{s,i+1} \quad \text{(ascending alphanumeric order)}$$

#### Step B: Pool Balancing Algorithm

To prevent one side of the room filling up while the other remains empty, the queues are distributed into Left and Right pools to balance their sizes as closely as possible:

1. **Rank Queues by Descending Size**:
   $$\text{SortedQueues} = \left[ \text{Queue}_1, \text{Queue}_2, \dots, \text{Queue}_K \right] \quad \text{where } \left|\text{Queue}_i\right| \ge \left|\text{Queue}_{i+1}\right|$$

2. **Midpoint Target Calculation**:
   $$\text{Target} = \left\lceil \frac{\text{TotalStudents}}{2} \right\rceil$$

3. **Distribution Rules**:
   - If there is only **one subject** scheduled:
     $$\mathcal{P}_L = \text{Queue}_1\!\left[0 \dots \left\lceil\tfrac{|\text{Queue}_1|}{2}\right\rceil - 1\right], \quad \mathcal{P}_R = \text{Queue}_1\!\left[\left\lceil\tfrac{|\text{Queue}_1|}{2}\right\rceil \dots |\text{Queue}_1| - 1\right]$$
   - If there are **multiple subjects**:
     - Iterate through `SortedQueues` and push entire queues to the smaller pool.
     - If a large queue exceeds the midpoint `Target`, split it at the exact boundary to maintain balanced pools.

#### Step C: Balance Verification

Post-split pool balance ratio verification:

$$\text{BalanceRatio} = 1 - \frac{\left| |\mathcal{P}_L| - |\mathcal{P}_R| \right|}{\text{TotalStudents}} \ge 0.95 \quad (\text{minimum 95\% balance})$$

---

### 🪑 The Seating Grid Mapping Protocol

The engine maps students to physical seats in a room (ordered vertically down the columns: Row index `A-Z`, Bench `1-N`, Seat `1-2`):

```typescript
// Core implementation from internalSeatAllocator.ts
// ── Column-Continuous mapping logic ──
if (isSingleSeatRoom) {
    // Single-Seat Benches: Pull down Left Pool first, fallback to Right Pool
    student = LeftPool.shift() || RightPool.shift();

} else {
    // Dual-Seat Benches: Interleave Pools to guarantee cross-department neighbors
    if (seat.SeatNumber === 1) {
        // Left seat → Left Pool primary (fallback to Right if exhausted)
        student = LeftPool.shift() || RightPool.shift();

    } else if (seat.SeatNumber === 2) {
        // Right seat → Right Pool primary (fallback to Left if exhausted)
        student = RightPool.shift() || LeftPool.shift();
    }
}
```

**Traversal Ordering** — Seats are visited in this strict priority:

```
Column 1 (Bench 1, Seat 1):  A→B→C→D→E  (entire column, top to bottom)
Column 2 (Bench 1, Seat 2):  A→B→C→D→E  (entire column, top to bottom)
Column 3 (Bench 2, Seat 1):  A→B→C→D→E
...
```

> [!TIP]
> This **column-first traversal** is the key anti-cheating mechanism. Adjacent students on the same bench (horizontal neighbors) always belong to different departments, while students directly behind/ahead on the same column (vertical neighbors) are from the same department but different register numbers — making copying substantially harder.

---

## 🗄️ 3. Database Multi-Dialect Architecture (MySQL & SQLite)

The database connection layer is powered by **Sequelize ORM** and is engineered to adapt dynamically based on environment conditions, providing an absolute zero-config developer sandbox alongside a robust production-ready database engine.

<div align="center" style="margin: 24px 0; border-radius: 22px; overflow: hidden; box-shadow: 0 18px 55px rgba(5, 7, 20, 0.7); border: 2px solid rgba(255,255,255,0.06);">
  <img src="./database_sync_animation.svg" width="100%" alt="Seat-Sync Database Multi-Dialect Routing Map — Sequelize MySQL to SQLite Fallback" />
</div>

### 🔀 Multi-Dialect Comparison Grid

| Parameter | 🐬 MySQL / MariaDB (Primary) | 🗃️ SQLite (Auto-Fallback) |
|:---|:---|:---|
| **Operational Scope** | Production & Staging clusters | Zero-config sandbox & local dev |
| **Storage Medium** | Dedicated relational server (`3306`) | Native file (`backend/database.sqlite`) |
| **Character Encoding** | `utf8mb4_unicode_ci` enforced | Binary storage definitions |
| **Connection Pooling** | `max: 10`, idle timeout `10s` | Direct file transaction locks |
| **Auto-Created?** | Requires pre-provisioned schema | Yes — auto-created on first boot |
| **Recovery Strategy** | Active health ping on initialization | Instantly mounts if MySQL blocked |
| **Production Ready?** | ✅ Yes — full ACID guarantees | ⚠️ Dev/test only — no concurrency |

---

### ⚙️ The 4-Stage Resilient Connection Lifecycle

Rather than throwing fatal errors during local environment setup, `backend/src/config/database.ts` executes a 4-stage resilient connection cycle:

```
[Server Boot] ──► 1. loadDotenvSilently()  —  Parse environment .env silently
                         │
                         ├──► Has MySQL Config? (DB_NAME, DB_USER, DB_HOST set?)
                         │       │
                         │       ├───► [YES] ──► 2. Mount MySQL dialect & pool
                         │       │                 │
                         │       │                 ▼
                         │       │               3. Authenticate connection pool
                         │       │                 │
                         │       │                 ├───► [SUCCESS] ──► sync({alter:true}) ──► ONLINE ✅ (MySQL)
                         │       │                 │
                         │       │                 └───► [FAIL] ────────────────────┐
                         │       │                  (Connection refused / timeout)  │
                         │       │                                                  │
                         │       └───► [NO] ─────────────────────────────────────── ┤
                         │                                                          │
                         │                                                          ▼
                         └─────────────────────────────► 4. SQLite Dynamic Fallback ─► ONLINE ✅ (SQLite)
                                                             createSQLite() → storage: database.sqlite
```

---

### 💻 Developer Dialect Router — Full Source Snippet

```typescript
// ────────────────────────────────────────────────────────────
// backend/src/config/database.ts  —  Core ORM Initializer
// Sequelize v6  |  MySQL2 Driver  |  SQLite3 Fallback
// ────────────────────────────────────────────────────────────

const DB_DIALECT           = process.env.DB_DIALECT           || "mysql";
const DB_NAME              = process.env.DB_NAME              || "";
const DB_USER              = process.env.DB_USER              || "";
const DB_PASS              = process.env.DB_PASS              || "";
const DB_HOST              = process.env.DB_HOST              || "127.0.0.1";
const DB_PORT              = Number(process.env.DB_PORT       || 3306);
const DB_FALLBACK_TO_SQLITE = process.env.DB_FALLBACK_TO_SQLITE === "true";

// ── SQLite Factory ──────────────────────────────────────────
function createSQLite(): Sequelize {
    console.warn("⚠️  Using SQLite fallback (MySQL/MariaDB unavailable)");
    const dbPath = path.resolve(process.cwd(), "database.sqlite");
    return new Sequelize({
        dialect: "sqlite",
        storage: dbPath,
        logging: false
    });
}

// ── Dialect Router ──────────────────────────────────────────
const hasMySQLConfig =
    DB_NAME.length > 0 &&
    DB_USER.length > 0 &&
    DB_HOST.length > 0;

let sequelize: Sequelize;

if (hasMySQLConfig) {
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        dialect:       "mysql",
        dialectModule:  mysql2,             // explicit driver binding
        host:           DB_HOST,
        port:           DB_PORT,
        logging:        false,
        define: {
            charset: "utf8mb4",
            collate: "utf8mb4_unicode_ci"   // full Unicode support
        },
        pool: {
            max:     10,
            min:     0,
            acquire: 30000,
            idle:    10000
        }
    });
} else {
    sequelize = createSQLite();             // immediate SQLite mount
}

export { sequelize };
```

### 🚀 Quick-Start Environment Configuration

**For SQLite (Zero-Config Sandbox)** — create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=supersecretkey_replace_in_production
DB_FALLBACK_TO_SQLITE=true
```

**For MySQL (Production Grade)** — create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=supersecretkey_replace_in_production
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=seatsyncdb
DB_USER=root
DB_PASS=your_password_here
DB_FALLBACK_TO_SQLITE=true
```

> [!IMPORTANT]
> Setting `DB_FALLBACK_TO_SQLITE=true` ensures the backend gracefully degrades to SQLite even if MySQL credentials are provided but the host is unreachable — making this configuration ideal for **hybrid developer environments** where MySQL may not always be running.

---

## 🎮 Playable Interactive Storyboard

To watch these mathematical equations calculate and allocate candidates with stunning interactive vector animations in real time, launch the **Seat-Sync Visual Storyteller** in any web browser:

```
 ┌─────────────────────────────────────────────────────────┐
 │   Double-click to run → visual_storyteller.html         │
 │                                                         │
 │   ✔  Works completely offline — zero CDN dependencies   │
 │   ✔  Real-time particle physics & curve trajectories    │
 │   ✔  Live Web Audio API synthesizer with waveforms     │
 │   ✔  Interactive DB fallback simulator                 │
 │   ✔  Telemetry pool progress bars                      │
 └─────────────────────────────────────────────────────────┘
```

| Feature | Description |
|:---|:---|
| 🎓 Pool Splitter | Watch CS & ME students split into Left/Right queues live |
| 🪑 Seat Allocator | Step or auto-play column-continuous seat placement |
| 🛡️ Bench Laser Shield | Hover over filled bench pairs to see anti-collision laser |
| 🎛️ Audio Synthesizer | Customizable sine/triangle/square/sawtooth waveform cues |
| 🗄️ DB Simulator | Test MySQL Healthy vs. MySQL Refused → SQLite fallback |
| 📊 Telemetry Bars | Real-time pool depletion progress bars with balance score |

---

<div align="center" style="margin-top: 40px; padding: 20px; border-top: 1px solid rgba(255,255,255,0.08);">
  <p>Built with mathematical rigour for perfect exam integrity.</p>
  <b>Seat-Sync — Arranging Success, Column by Column.</b>
</div>
