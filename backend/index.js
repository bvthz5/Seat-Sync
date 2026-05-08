require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./db"); // ✅ matches export

const app = express();

app.use(express.json());
app.use(cors());

// Connect DB
connectDB();

// Test route
app.get("/", (req, res) => {
  res.send("SeatSync API running 🚀");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});