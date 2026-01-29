import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import hpp from "hpp";
import { sequelize } from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";
import studentRoutes from "./routes/student.routes.js";
import collegeStructureRoutes from "./routes/collegeStructure.routes.js";

import roomRoutes from "./routes/room.routes.js";
import structureImportRoutes from "./routes/structureImport.routes.js";

const app = express();


// --- CORS Configuration ---
app.use(cors({
    origin: (origin, callback) => {
        // Allow same-origin (origin is undefined)
        if (!origin) return callback(null, true);

        // Allow any localhost or loopback origin during development
        if (
            origin.startsWith('http://localhost') ||
            origin.startsWith('http://127.0.0.1') ||
            origin.startsWith('http://[::1]')
        ) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"]
}));

// --- Security Middleware: Helmet ---
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Allow cross-origin resources
}));

// Accept JSON body & Cookies early
app.use(express.json());
app.use(cookieParser());
app.use(hpp());

// --- Security Middleware: Rate Limiter ---
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000, // Increased for development
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later."
});
app.use("/api", limiter);

// Swagger definition
const swaggerDefinition = {
    openapi: "3.0.0",
    info: {
        title: "SeatSync API",
        version: "1.0.0",
        description: "API documentation for SeatSync application",
    },
    servers: [
        {
            url: "http://localhost:5000",
            description: "Development server",
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
    },
    security: [
        {
            bearerAuth: [],
        },
    ],
    tags: [
        {
            name: "Admin",
            description: "Admin related endpoints",
        },
        {
            name: "Invigilator",
            description: "Invigilator related endpoints",
        },
        {
            name: "Student",
            description: "Student related endpoints",
        },
        {
            name: "Structure",
            description: "College structure management (Blocks, Floors, Rooms)",
        },
    ],
};

// Options for the swagger docs
const options = {
    swaggerDefinition,
    apis: ["src/**/*.ts"], // Paths to files containing OpenAPI definitions
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(options);

// Use swagger-ui-express for your app documentation endpoint
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes (Body parsers already applied)
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/admin/college-structure", collegeStructureRoutes);
app.use("/api/college-structure/import", structureImportRoutes);
app.use("/api/rooms", roomRoutes);

// --- Error Handling Middleware ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("GLOBAL ERROR:", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error",
        error: process.env.NODE_ENV === "development" ? err : {}
    });
});

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
