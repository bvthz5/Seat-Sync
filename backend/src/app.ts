import express from "express";
import cors from "cors";
import { sequelize } from "./config/database.js";

const app = express();

// Allow frontend to talk to backend
app.use(cors());

// Accept JSON body
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
    res.send("SeatSync Backend Running");
});

app.get("/health", async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({ status: "ok", db: "connected" });
    } catch {
        res.status(503).json({ status: "degraded", db: "disconnected" });
    }
});

export default app;
