import dotenv from "dotenv";
import path from "path";

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("[Config] Environment variables loaded.");
