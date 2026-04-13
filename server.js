const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
    res.json({ status: "server alive" });
});

// ================= SAFE CONNECT =================
async function start() {
    try {
        if (!process.env.MONGO_URL) {
            console.log("MONGO_URL missing");
            return;
        }

        await mongoose.connect(process.env.MONGO_URL);
        console.log("MongoDB Connected");

        app.listen(process.env.PORT || 3000, () => {
            console.log("Server running");
        });

    } catch (err) {
        console.log("SERVER ERROR:", err);
    }
}

start();
