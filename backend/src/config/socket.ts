
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";

let io: SocketIOServer;

export const initSocket = (httpServer: HTTPServer) => {
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*", // Adjust for production
            methods: ["GET", "POST"]
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
