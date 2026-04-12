const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ===================== DB =====================
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected 🔥"))
.catch(err => console.log(err));

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

// ===================== RESET EXPIRED SESSIONS =====================
async function cleanup() {
    await License.updateMany(
        {
            isOnline: true,
            lastSeen: { $lt: new Date(Date.now() - 10000) }
        },
        {
            $set: {
                isOnline: false,
                sessionId: null
            }
        }
    );
}

// ===================== ADD KEY =====================
app.post("/addkey", async (req, res) => {
    const { key } = req.body;

    const exists = await License.findOne({ key });
    if (exists) return res.json({ status: "exists" });

    await License.create({ key });

    res.json({ status: "added" });
});

// ===================== ACTIVATE (FIXED) =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    await cleanup(); // 🔥 مهم جدًا

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // bind HWID
    if (!license.hwid) {
        license.hwid = hwid;
        await license.save();
    }

    if (license.hwid !== hwid)
        return res.json({ status: "used on another device" });

    // 🔥 لو شغال فعليًا ولسه جديد
    if (license.isOnline && license.lastSeen &&
        (Date.now() - new Date(license.lastSeen).getTime()) < 8000) {
        return res.json({ status: "already running" });
    }

    // ===================== LOCK =====================
    const locked = await License.findOneAndUpdate(
        {
            key: key,
            $or: [
                { isOnline: false },
                { lastSeen: { $lt: new Date(Date.now() - 8000) } }
            ]
        },
        {
            $set: {
                isOnline: true,
                hwid: hwid,
                lastSeen: new Date(),
                sessionId: Math.random().toString(36).substring(2)
            }
        },
        { new: true }
    );

    if (!locked)
        return res.json({ status: "already running" });

    res.json({
        status: "activated",
        sessionId: locked.sessionId
    });
});

// ===================== HEARTBEAT =====================
app.post("/heartbeat", async (req, res) => {
    const { key, hwid, sessionId } = req.body;

    const license = await License.findOne({ key });

    if (
        license &&
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

    if (
        license &&
        license.hwid === hwid &&
        license.sessionId === sessionId
    ) {
        license.isOnline = false;
        license.sessionId = null;
        license.lastSeen = null;
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
    license.sessionId = null;
    license.lastSeen = null;

    await license.save();

    res.json({ status: "reset done" });
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
