import express from "express";
import cors from "cors";
import { sequelize } from "./config/database.js";

const app = express();

// Allow frontend to talk to backend
app.use(cors());

// Accept JSON body
app.use(express.json());

// Health check route
app.get("/", (req: express.Request, res: express.Response) => {
    res.send("SeatSync Backend Running");
});

app.get("/health", async (req: express.Request, res: express.Response) => {
    try {
        // Lightweight check using a simple query
        const [result] = await sequelize.query("SELECT 1 AS result");
        res.status(200).json({ status: "ok", db: "connected", result });
    } catch (err: any) {
        res.status(503).json({ status: "degraded", db: "disconnected", message: err.message });
    }
});

export default app;
