# 📐 Seat-Sync Seating Algorithms & Visual Maps

Welcome to the technical engine room! This document details the algorithmic logic powering **Seat-Sync**'s dual-ecosystem seating scheduler. It details how the engine transforms a chaotic exam schedule into a beautifully organized, cheat-proof grid of students.

---

## 🏛️ Ecosystem Overview

Seat-Sync separates seating rules into two completely isolated environments to match the unique constraints of academic environments:

```
                  ┌─────────────────────────────────────────┐
                  │            SEAT-SYNC ENGINE             │
                  └────────────────────┬────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │  End-Semester Ecosystem│             │   Internal Ecosystem  │
        │   (University Exams)  │             │  (Midterms / Series)  │
        ├───────────────────────┤             ├───────────────────────┤
        │ • Physical Row/Bench  │             │ • Dual-Pool Balancing │
        │ • Sequential Mapping  │             │ • Subject Interleave  │
        │ • Active/Inactive Diff│             │ • Register Continuity │
        └───────────────────────┘             └───────────────────────┘
```

---

## ⚡ 1. The Room Layout & Seat Generator (`generateSeats`)

Before assigning students, Seat-Sync must generate or update the physical seat grid in each room. The engine avoids destructive database writes by calculating a **diff** between the requested physical layout and the existing database records.

### 📐 The Layout Formula
A room's layout is stored as a JSON array of benches per row, e.g., `RowLayout: [3, 3, 4]`.
For a dual-seat bench layout (`SeatsPerBench = 2`):

$$\text{Total Seats} = \sum_{i=0}^{N-1} \text{RowLayout}[i] \times \text{SeatsPerBench}$$

Where:
* $N$ is the number of rows (each row is assigned a label from `A` to `Z`).
* $\text{RowLayout}[i]$ is the number of benches in Row $i$.
* $\text{SeatsPerBench}$ is the physical seat count per bench (typically `2` for dual, `1` for single).

### 🤖 The Diff & Soft-Update Lifecycle
When an admin edits a room's physical layout:
1. **Expected Seats Map**: Generates all possible keys in format `{RowLabel}-{BenchIndex}-{SeatIndex}` (e.g., `A-1-1`, `A-1-2`, `A-2-1`).
2. **Deactivation Diff**: Any existing database seat that does *not* exist in the new physical layout is marked `IsActive = false` (preserving historical audit logs and attendance records rather than hard deleting).
3. **Activation Diff**: Any matching seat whose active state changed is updated.
4. **Insertion Diff**: Completely new physical seats are bulk-inserted.

---

## 🔮 2. The Internal Exam Seating Engine (`InternalSeatAllocator`)

The internal seating engine represents the absolute crown jewel of the system's scheduling intelligence. It enforces a strict multi-layered academic integrity protocol.

### 🛡️ Core Seating Rules
1. **Column-Continuous Placement**: Students sit down a column (vertically) rather than across a row (horizontally). Why? Because copying is easier from the side than from the back!
2. **Interleaved Subjects**: Students sitting side-by-side on the same bench *must* belong to different departments or subjects (e.g., CS vs ME) whenever possible.
3. **Register Number Continuity**: To simplify grading and exam distribution, students of the same subject maintain sequential register numbers down their respective columns.

---

### 🌊 The Dual-Pool Splitting Phase (Step-by-Step)

To achieve perfect subject interleaving across rows, the engine splits students into two pools: **Left Pool** (Seat Index 1) and **Right Pool** (Seat Index 2).

#### Step A: Student Queue Aggregation
* The engine collects all active registered students for the scheduled exams.
* It groups students by their Exam (Subject) Code.
* For each subject queue, the engine sorts the students alphanumerically by their **Register Number**:
  $$\text{Queue}_s = [ \text{Student}_{s, 1}, \text{Student}_{s, 2}, \dots, \text{Student}_{s, M} ] \quad \text{where } \text{RegNo}_{s, i} < \text{RegNo}_{s, i+1}$$

#### Step B: Pool Balancing
To prevent benches from having empty secondary seats, the engine distributes the subject queues into Left and Right pools to balance their sizes as closely as possible:

1. **Sort Queues**: Sort all subject queues by size descending:
   $$\text{SortedQueues} = [ \text{Queue}_1, \text{Queue}_2, \dots, \text{Queue}_K ] \quad \text{where } |\text{Queue}_i| \ge |\text{Queue}_{i+1}|$$
2. **Distribute & Balances**:
   * If there is only **one subject** scheduled:
     * Split the queue exactly in half:
       $$\text{LeftPool} = \text{Queue}_1\left[0 \dots \left\lceil\frac{|\text{Queue}_1|}{2}\right\rceil - 1\right]$$
       $$\text{RightPool} = \text{Queue}_1\left[\left\lceil\frac{|\text{Queue}_1|}{2}\right\rceil \dots |\text{Queue}_1| - 1\right]$$
   * If there are **multiple subjects**:
     * Push entire subject queues into the smaller pool.
     * If a large queue would severely unbalance the pools, split it at the exact target midpoint:
       $$\text{Target} = \left\lceil \frac{\text{TotalStudents}}{2} \right\rceil$$

---

### 🎨 The Seating Grid Mapping Phase

Once pools are balanced, Seat-Sync walks through the rooms in order and maps students to physical seats.

```
DETERMINING BENCH MODE:
Dual Seat Bench [Seat 1]  [Seat 2]
                ▲         ▲
                │         │
            Left Pool  Right Pool
```

#### The Seat Index Assignment Algorithm:

For each physical seat in a room (ordered by Row `A-Z`, Bench `1-N`, and Seat `1-2`):

```typescript
if (isSingleSeatRoom) {
    // Single-Seat Benches: Pull down Left Pool first, fallback to Right Pool
    student = LeftPool.shift() || RightPool.shift();
} else {
    // Dual-Seat Benches: Pull Left Pool for Seat 1, Right Pool for Seat 2
    if (seat.SeatNumber === 1) {
        student = LeftPool.shift() || RightPool.shift(); // Double pool fallback
    } else if (seat.SeatNumber === 2) {
        student = RightPool.shift() || LeftPool.shift(); // Double pool fallback
    }
}
```

This elegant algorithm creates the following layout, achieving vertical registration continuity and horizontal subject interleaving:

```
[Row A, Bench 1]  Seat 1: Student A (CS - Reg #101)  ◀───▶  Seat 2: Student X (ME - Reg #201)
[Row A, Bench 2]  Seat 1: Student B (CS - Reg #102)  ◀───▶  Seat 2: Student Y (ME - Reg #202)
[Row A, Bench 3]  Seat 1: Student C (CS - Reg #103)  ◀───▶  Seat 2: Student Z (ME - Reg #203)
                                 │                                         │
                                 ▼ (Continuous Down Column)                 ▼ (Continuous Down Column)
```

---

## 🎨 Visualization in Action

Open the interactive **[Visual Storyteller](file:///C:/Users/binil/OneDrive/Desktop/Seat-Sync/visual_storyteller.html)** in your browser to see this complex matching dance rendered in a playful, cartoon-animated layout. You can step through each stage of the allocation magic with real-time grid simulations!
