const sql = require("mssql");

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

const connectDB = async () => {
  try {
    await sql.connect(config);
    console.log("Connected to DB");
  } catch (err) {
    console.log("DB connection error:", err);
  }
};

module.exports = { sql, connectDB };