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

const app = express();

// --- Security Middleware: Helmet ---
// Sets various HTTP headers to secure the app (e.g. X-Content-Type-Options, X-Frame-Options)
app.use(helmet());

// --- Security Middleware: Rate Limiter ---
// Limit repeated requests to public APIs to prevent brute-force attacks/DoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: "Too many requests from this IP, please try again later."
});
app.use("/api", limiter);

// --- Security Middleware: HPP ---
// Prevent HTTP Parameter Pollution attacks
app.use(hpp());

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
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow any localhost origin
        if (/^http:\/\/localhost:\d+$/.test(origin)) {
            return callback(null, true);
        }

        // Block other origins
        callback(new Error('Not allowed by CORS'));
    },
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
