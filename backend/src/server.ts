import "./config/env.js";
import app from "./app.js";
import { connectDB } from "./config/database.js";
// import open from "open";

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

        // Auto-seed admin user
        const { seedExamsAdmin } = await import("./utils/seeder.js");
        await seedExamsAdmin();
    } catch (error) {
        console.error("Database connection failed:", error);
        if (process.env.NODE_ENV === "production") {
            console.error("Shutting down: DB connection is required in production.");
            process.exit(1);
        }
        console.warn("Continuing to start the HTTP server in degraded mode.");
    }

    // Create HTTP server explicitly to attach Socket.IO
    const { createServer } = await import("http");
    const { initSocket } = await import("./config/socket.js");

    const httpServer = createServer(app);
    initSocket(httpServer);

    // Start server (explicitly listen on all interfaces for better localhost compatibility)
    const server = httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(`SeatSync API running at http://localhost:${PORT}`);
        console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
        // Automatically open Swagger UI in the default browser
        // open(`http://localhost:${PORT}/api-docs`);
    });

    // Handle server errors explicitly
    server.on("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
            // Port is in use — exit so tsx watch restarts the process cleanly.
            // The dev script (kill-port 5000) will free the port on restart.
            console.error(`[server] Port ${PORT} is already in use. Exiting for tsx to restart...`);
            process.exit(1);
        }
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
