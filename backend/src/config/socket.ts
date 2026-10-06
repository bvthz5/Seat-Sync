
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { isOriginAllowed } from "../utils/corsConfig.js";

let io: SocketIOServer;

export const initSocket = (httpServer: HTTPServer) => {
    io = new SocketIOServer(httpServer, {
        pingTimeout: 60000,   // Wait up to 60s for pings (default is 20s)
        pingInterval: 20000,  // Send keep-alive pings every 20s (default is 25s)
        connectTimeout: 45000,
        allowEIO3: true,
        cors: {
            origin: (origin, callback) => {
                if (isOriginAllowed(origin)) {
                    return callback(null, true);
                }
                callback(new Error(`Socket.IO CORS blocked: ${origin}`));
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
