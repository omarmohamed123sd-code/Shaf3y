const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ===================== DB =====================
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected 🔥"))
.catch(err => console.log(err));

// ===================== MODEL =====================
const LicenseSchema = new mongoose.Schema({
    key: String,
    hwid: String,
    sessionId: String,
    lastHeartbeat: Date
});

const License = mongoose.model("License", LicenseSchema);

// ===================== TEST =====================
app.get("/", (req, res) => {
    res.send("Server is working 🔥");
});

// ===================== ADD KEY =====================
app.post("/addkey", async (req, res) => {
    const { key } = req.body;

    const exists = await License.findOne({ key });

    if (exists)
        return res.json({ status: "exists" });

    await License.create({
        key,
        hwid: null,
        sessionId: null,
        lastHeartbeat: null
    });

    res.json({ status: "added" });
});

// ===================== ACTIVATE =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // ===================== HWID LOCK (FOREVER) =====================
    if (!license.hwid) {
        license.hwid = hwid;
    }

    if (license.hwid !== hwid)
        return res.json({ status: "used on another device" });

    const now = Date.now();

    // ===================== STILL ACTIVE SESSION =====================
    if (
        license.sessionId &&
        license.lastHeartbeat &&
        (now - new Date(license.lastHeartbeat).getTime()) < 15000
    ) {
        return res.json({
            status: "already running",
            sessionId: license.sessionId
        });
    }

    // ===================== CREATE NEW SESSION =====================
    license.sessionId = Math.random().toString(36).substring(2);
    license.lastHeartbeat = new Date();

    await license.save();

    res.json({
        status: "activated",
        sessionId: license.sessionId
    });
});

// ===================== HEARTBEAT =====================
app.post("/heartbeat", async (req, res) => {
    const { key, sessionId } = req.body;

    const license = await License.findOne({ key });

    if (license && license.sessionId === sessionId) {
        license.lastHeartbeat = new Date();
        await license.save();
    }

    res.json({ status: "ok" });
});

// ===================== LOGOUT =====================
app.post("/logout", async (req, res) => {
    const { key, sessionId } = req.body;

    const license = await License.findOne({ key });

    if (license && license.sessionId === sessionId) {
        license.sessionId = null;
        license.lastHeartbeat = null;
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
    license.sessionId = null;
    license.lastHeartbeat = null;

    await license.save();

    res.json({ status: "reset done" });
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
