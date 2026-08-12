const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: "localhost", // change if needed
  database: process.env.DB_NAME,
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const connectDB = async () => {
  try {
    await sql.connect(config);
    console.log("Connected to DB ✅");
  } catch (err) {
    console.error("DB connection error ❌:", err.message);
  }
};

module.exports = connectDB; // ✅ SIMPLE EXPORT