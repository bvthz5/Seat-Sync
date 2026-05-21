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

    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    const listen = () => {
        httpServer.listen(PORT, '0.0.0.0');
    };

    httpServer.on("listening", () => {
        console.log(`SeatSync API running at http://localhost:${PORT}`);
        console.log(`Swagger UI available at http://localhost:${PORT}/api-docs`);
    });

    httpServer.on("error", async (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
            if (retryCount < MAX_RETRIES) {
                retryCount++;
                console.warn(`[server] Port ${PORT} is in use. Retrying in ${RETRY_DELAY}ms (Attempt ${retryCount}/${MAX_RETRIES})...`);
                setTimeout(() => {
                    try {
                        httpServer.close();
                    } catch (closeErr) {}
                    listen();
                }, RETRY_DELAY);
            } else {
                console.error(`[server] Port ${PORT} is still in use after ${MAX_RETRIES} attempts.`);
                try {
                    console.log(`[server] Attempting to auto-release port ${PORT}...`);
                    const { execSync } = await import("child_process");
                    if (process.platform === "win32") {
                        try {
                            const output = execSync(`netstat -ano | findstr :${PORT}`).toString();
                            const lines = output.split("\n");
                            const pids = new Set<string>();
                            for (const line of lines) {
                                const parts = line.trim().split(/\s+/);
                                if (parts.length >= 5 && parts[1] && parts[1].endsWith(`:${PORT}`)) {
                                    const pid = parts[4];
                                    if (pid) {
                                        pids.add(pid);
                                    }
                                }
                            }
                            let killedAny = false;
                            for (const pid of pids) {
                                if (pid && pid !== "0" && pid !== process.pid.toString()) {
                                    console.log(`[server] Killing process ${pid} using port ${PORT}...`);
                                    execSync(`taskkill /F /PID ${pid}`);
                                    killedAny = true;
                                }
                            }
                            if (!killedAny) {
                                execSync(`npx -y kill-port ${PORT}`);
                            }
                        } catch (e) {
                            console.warn("[server] Win32 netstat lookup failed, falling back to kill-port...");
                            execSync(`npx -y kill-port ${PORT}`);
                        }
                    } else {
                        execSync(`npx -y kill-port ${PORT}`);
                    }
                    console.log(`[server] Port ${PORT} released. Retrying listen...`);
                    retryCount = 0;
                    setTimeout(() => {
                        listen();
                    }, 500);
                } catch (killErr: any) {
                    console.error("[server] Failed to auto-release port:", killErr.message);
                    console.error("Exiting so tsx watch restarts the process...");
                    process.exit(1);
                }
            }
        } else {
            console.error("HTTP server error:", err);
        }
    });

    listen();

    // In some execution environments the Node process may exit even though the
    // HTTP server is listening (e.g., when stdout is closed). Keep a minimal
    // timer active in development so the process doesn't exit unexpectedly.
    if (process.env.NODE_ENV !== "production") {
        console.log("Entering keep-alive mode to avoid unexpected process exit in dev.");
        setInterval(() => { /* keep event loop active */ }, 1_000_000);
    }
};

startServer();
