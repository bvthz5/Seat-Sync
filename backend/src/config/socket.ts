
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer;

const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]);

export const initSocket = (httpServer: HTTPServer) => {
    io = new SocketIOServer(httpServer, {
        pingTimeout: 60000,   // Wait up to 60s for pings (default is 20s)
        pingInterval: 20000,  // Send keep-alive pings every 20s (default is 25s)
        connectTimeout: 45000,
        allowEIO3: true,
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);

                if (
                    allowedOrigins.has(origin) ||
                    origin.startsWith("http://localhost:") ||
                    origin.startsWith("http://127.0.0.1:") ||
                    origin.includes("trycloudflare.com") ||
                    origin.includes("cloudflare.com") ||
                    origin.includes("cfargotunnel.com") ||
                    origin.includes("serveousercontent.com") ||
                    origin.includes("serveo.net") ||
                    origin.includes("localtunnel.me")
                ) {
                    return callback(null, true);
                }

                callback(new Error("Socket.IO CORS blocked"));
            },
            credentials: true,
            methods: ["GET", "POST"],
        },
        transports: ["websocket", "polling"] // Enforce websocket support explicitly
    });

    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);

        socket.on("join_room", (room: string) => {
            socket.join(room);
            console.log(`Socket ${socket.id} joined room ${room}`);
        });

        socket.on("leave_room", (room: string) => {
            socket.leave(room);
        });

        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
