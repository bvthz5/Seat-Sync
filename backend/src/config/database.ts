import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

// Read DB info from env
const dbName = process.env.DB_NAME;
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;
const dbHost = process.env.DB_HOST;
const forceMssql = process.env.DB_FORCE === "true" || process.env.NODE_ENV === "production";

let sequelize: Sequelize;

// Helper to create an in-memory SQLite instance used for development/fallback
function createSqlite(): Sequelize {
    console.warn("Using in-memory SQLite — suitable for development and tests.");
    return new Sequelize({
        dialect: "sqlite",
        storage: ":memory:",
        logging: false,
    } as any);
}

if (dbName && dbUser && dbPass && forceMssql) {
    // Create an MSSQL connection only when explicitly requested (production or DB_FORCE=true)
    const dbConfig: any = {
        dialect: "mssql",
        port: dbPort ?? 1433,
        logging: false,
        dialectOptions: {
            options: {
                encrypt: false,
                trustServerCertificate: true,
            },
        },
    };

    if (dbHost) dbConfig.host = dbHost;

    sequelize = new Sequelize(dbName, dbUser, dbPass, dbConfig);

    // Try authenticating; if it fails, fallback to sqlite so the app can still run in degraded mode
    (async () => {
        try {
            await sequelize.authenticate();
            console.log("Connected to MSSQL database");
        } catch (err) {
            console.warn("MSSQL connection failed — falling back to SQLite for development.", err);
            sequelize = createSqlite();
        }
    })();
} else {
    // Default to sqlite for local development unless DB_FORCE or production is set
    sequelize = createSqlite();
}

export { sequelize };

