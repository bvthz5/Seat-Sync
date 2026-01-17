import app from "./app.js";
import { connectDB } from "./config/database.js";
import open from "open";

const PORT = 5000;

// Global handlers improve stability in development
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
});

const startServer = async () => {
    // Attempt to establish DB connection. In production we abort on failure.
    try {
        await connectDB();
        console.log("Connected to database");
    } catch (error) {
        console.error("Database connection failed:", error);
        if (process.env.NODE_ENV === "production") {
            console.error("Shutting down: DB connection is required in production.");
            process.exit(1);
        }
        console.warn("Continuing to start the HTTP server in degraded mode.");
    }

    // Start server (keeps health endpoints available in degraded mode)
    const server = app.listen(PORT, () => {
        console.log(`SeatSync API running at http://localhost:${PORT}`);
        console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
        // Automatically open Swagger UI in the default browser
        open(`http://localhost:${PORT}/api-docs`);
    });

    // Handle server errors explicitly
    server.on("error", (err: Error) => {
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
