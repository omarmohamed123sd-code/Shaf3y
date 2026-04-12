const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ===================== DB =====================
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected 🔥"))
.catch(err => console.log("Mongo Error:", err));

// ===================== SCHEMA =====================
const LicenseSchema = new mongoose.Schema({
    key: String,
    hwid: String,
    isOnline: { type: Boolean, default: false },
    lastSeen: Date,
    sessionId: String
});

const License = mongoose.model("License", LicenseSchema);

// ===================== HOME =====================
app.get("/", (req, res) => {
    res.send("Server is working 🔥");
});

// ===================== ADD KEY =====================
app.post("/addkey", async (req, res) => {
    const { key, hwid } = req.body;

    if (!key)
        return res.json({ status: "error", message: "key required" });

    const exists = await License.findOne({ key });

    if (exists)
        return res.json({ status: "exists" });

    await License.create({
        key,
        hwid: hwid || null,
        isOnline: false,
        lastSeen: null,
        sessionId: null
    });

    res.json({ status: "added" });
});

// ===================== ACTIVATE (STRONG LOCK) =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid)
        return res.json({ status: "error" });

    // 🔥 ATOMIC LOCK (MongoDB handles concurrency)
    const license = await License.findOneAndUpdate(
        {
            key: key,
            $or: [
                { isOnline: false },
                { lastSeen: { $lt: new Date(Date.now() - 10000) } }
            ]
        },
        {
            $set: {
                hwid: hwid,
                isOnline: true,
                lastSeen: new Date()
            },
            $setOnInsert: {
                sessionId: Math.random().toString(36).substring(2)
            }
        },
        { new: true }
    );

    // ❌ already taken by another device
    if (!license) {
        return res.json({ status: "already running" });
    }

    // ❌ wrong device
    if (license.hwid !== hwid) {
        return res.json({ status: "used on another device" });
    }

    res.json({
        status: "activated",
        sessionId: license.sessionId
    });
});

// ===================== HEARTBEAT =====================
app.post("/heartbeat", async (req, res) => {
    const { key, hwid, sessionId } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    if (
        license.hwid === hwid &&
        license.sessionId === sessionId
    ) {
        license.lastSeen = new Date();
        license.isOnline = true;
        await license.save();
    }

    res.json({ status: "ok" });
});

// ===================== LOGOUT =====================
app.post("/logout", async (req, res) => {
    const { key, hwid, sessionId } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    if (
        license.hwid === hwid &&
        license.sessionId === sessionId
    ) {
        license.isOnline = false;
        license.sessionId = null;
        await license.save();
    }

    res.json({ status: "offline" });
});

// ===================== RESET =====================
app.post("/reset", async (req, res) => {
    const { key } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    license.hwid = null;
    license.isOnline = false;
    license.lastSeen = null;
    license.sessionId = null;

    await license.save();

    res.json({ status: "reset done" });
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
