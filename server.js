const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ================= DB =================
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected 🔥"))
.catch(err => console.log(err));

// ================= MODEL =================
const KeySchema = new mongoose.Schema({
    key: { type: String, unique: true },
    hwid: { type: String, default: null },
    expiry: { type: Number, default: 0 }, // timestamp
    status: { type: String, default: "active" }
});

const Key = mongoose.model("Key", KeySchema);

// ================= HOME =================
app.get("/", (req, res) => {
    res.send("PRO License Server Running 🔥");
});

// ================= ADD KEY =================
app.post("/addkey", async (req, res) => {
    try {
        const { key, days } = req.body;

        if (!key) return res.json({ status: "missing_key" });

        const exists = await Key.findOne({ key });

        if (exists) {
            return res.json({ status: "exists" });
        }

        let expiry = 0;
        if (days) {
            expiry = Date.now() + (days * 24 * 60 * 60 * 1000);
        }

        await Key.create({
            key,
            expiry
        });

        res.json({ status: "added", expiry });

    } catch (err) {
        res.json({ status: "error", error: err.message });
    }
});

// ================= ACTIVATE =================
app.post("/activate", async (req, res) => {
    try {
        const { key, hwid } = req.body;

        if (!key || !hwid) {
            return res.json({ status: "missing_data" });
        }

        const license = await Key.findOne({ key });

        if (!license) {
            return res.json({ status: "invalid" });
        }

        if (license.status !== "active") {
            return res.json({ status: "banned" });
        }

        // ⏳ check expiry
        if (license.expiry !== 0 && Date.now() > license.expiry) {
            return res.json({ status: "expired" });
        }

        // 🔥 first device bind
        if (!license.hwid) {
            license.hwid = hwid;
            await license.save();
            return res.json({ status: "activated_first" });
        }

        // 🟢 same device
        if (license.hwid === hwid) {
            return res.json({ status: "valid" });
        }

        // 🔴 different device
        return res.json({ status: "blocked" });

    } catch (err) {
        res.json({ status: "error", error: err.message });
    }
});

// ================= RESET =================
app.post("/reset", async (req, res) => {
    try {
        const { key } = req.body;

        const license = await Key.findOne({ key });

        if (!license) {
            return res.json({ status: "invalid" });
        }

        license.hwid = null;
        await license.save();

        res.json({ status: "reset_done" });

    } catch (err) {
        res.json({ status: "error", error: err.message });
    }
});

// ================= START =================
app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
});
