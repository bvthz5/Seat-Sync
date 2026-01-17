import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { sequelize } from "./config/database.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

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

// Allow frontend to talk to backend
// Configure CORS to allow credentials (cookies) and specific origins
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5000"], // Allow Frontend and Swagger UI
    credentials: true, // Allow cookies to be sent/received
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Accept JSON body
app.use(express.json());

// Enable cookie parsing for refresh tokens
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);

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
