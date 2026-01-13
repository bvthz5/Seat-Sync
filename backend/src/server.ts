import app from "./app.js";
import { sequelize } from "./config/database.js";

const PORT = 5000;

// Global handlers improve stability in development
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

const startServer = async () => {
    // Attempt to authenticate with DB but don't block startup on failure.
    try {
        await sequelize.authenticate();
        console.log("Connected to database");
    } catch (error) {
        console.warn("Database connection failed:", error);
        console.warn("Continuing to start the HTTP server in degraded mode.");
    }

    // Start server regardless of DB availability so endpoints and health checks work
    const server = app.listen(PORT, () => {
        console.log(`SeatSync API running at http://localhost:${PORT}`);
    });

    // Handle server errors explicitly
    server.on("error", (err) => {
        console.error("HTTP server error:", err);
    });

    // In some execution environments the Node process may exit even though the
    // HTTP server is listening (e.g., when stdout is closed). Keep a minimal
    // timer active in development so the process doesn't exit unexpectedly.
    if (process.env.NODE_ENV !== "production") {
        console.log("Entering keep-alive mode to avoid unexpected process exit in dev.");
        setInterval(() => { /* keep event loop active */ }, 1_000_000);
    }
};

startServer();
