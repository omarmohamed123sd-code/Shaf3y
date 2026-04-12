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

// ===================== ACTIVATE =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // bind HWID first time
    if (!license.hwid) {
        license.hwid = hwid;
    }

    if (license.hwid !== hwid)
        return res.json({ status: "used on another device" });

    // ===================== STRONG LOCK =====================
    const now = Date.now();
    const last = license.lastSeen ? new Date(license.lastSeen).getTime() : 0;
    const diff = (now - last) / 1000;

    // لو في Session شغالة ولسه alive
    if (license.isOnline && diff <= 10) {
        return res.json({ status: "already running" });
    }

    // 🧠 نعمل Session جديدة
    license.isOnline = true;
    license.lastSeen = new Date();
    license.sessionId = Math.random().toString(36).substring(2);

    await license.save();

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

    // لازم نفس الجهاز + نفس session
    if (license.hwid === hwid && license.sessionId === sessionId) {
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

    if (license.hwid === hwid && license.sessionId === sessionId) {
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

    license.isOnline = false;
    license.hwid = null;
    license.sessionId = null;
    license.lastSeen = null;

    await license.save();

    res.json({ status: "reset done" });
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
