
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
        cors: {
            origin: (origin, callback) => {
                if (!origin) return callback(null, true);

                if (
                    allowedOrigins.has(origin) ||
                    origin.startsWith("http://localhost:") ||
                    origin.startsWith("http://127.0.0.1:") ||
                    origin.includes('ngrok') ||
                    origin.includes('trycloudflare.com')
                ) {
                    return callback(null, true);
                }

                console.warn(`[Socket.IO CORS Blocked] Origin: ${origin}`);
                callback(new Error("Socket.IO CORS blocked"));
            },
            credentials: true,
            methods: ["GET", "POST"],
        }
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
