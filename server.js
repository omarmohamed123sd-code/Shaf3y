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
    lastSeen: Date
});

const License = mongoose.model("License", LicenseSchema);

// ===================== ACTIVATE (ATOMIC FIX) =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // bind HWID first time
    if (!license.hwid) {
        license.hwid = hwid;
        await license.save();
    }

    if (license.hwid !== hwid)
        return res.json({ status: "used on another device" });

    // ===================== ATOMIC LOCK =====================
    const now = Date.now();
    const last = license.lastSeen ? new Date(license.lastSeen).getTime() : 0;
    const diff = (now - last) / 1000;

    // لو session شغالة ولسه جديدة
    if (license.isOnline && diff < 10) {
        return res.json({ status: "already running" });
    }

    // 🔥 أهم جزء: قفل ذري (Atomic Lock)
    const locked = await License.findOneAndUpdate(
        {
            key: key,
            $or: [
                { isOnline: false },
                { lastSeen: { $lt: new Date(Date.now() - 10000) } }
            ]
        },
        {
            $set: {
                isOnline: true,
                lastSeen: new Date()
            }
        },
        { new: true }
    );

    if (!locked) {
        return res.json({ status: "already running" });
    }

    res.json({
        status: "activated"
    });
});

// ===================== HEARTBEAT =====================
app.post("/heartbeat", async (req, res) => {
    const { key, hwid } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    if (license.hwid === hwid) {
        license.isOnline = true;
        license.lastSeen = new Date();
        await license.save();
    }

    res.json({ status: "ok" });
});

// ===================== LOGOUT =====================
app.post("/logout", async (req, res) => {
    const { key, hwid } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    if (license.hwid === hwid) {
        license.isOnline = false;
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
    license.lastSeen = null;

    await license.save();

    res.json({ status: "reset done" });
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
