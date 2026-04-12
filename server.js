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
    sessionId: String,
    loginExpiresAt: Date
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
        loginExpiresAt: null
    });

    res.json({ status: "added" });
});

// ===================== ACTIVATE =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // ===================== HWID LOCK (PERMANENT) =====================
    if (!license.hwid) {
        license.hwid = hwid;
    }

    if (license.hwid !== hwid)
        return res.json({ status: "used on another device" });

    const now = Date.now();

    // ===================== STILL VALID SESSION =====================
    if (
        license.sessionId &&
        license.loginExpiresAt &&
        new Date(license.loginExpiresAt).getTime() > now
    ) {
        return res.json({
            status: "already running",
            sessionId: license.sessionId
        });
    }

    // ===================== CREATE NEW SESSION =====================
    license.sessionId = Math.random().toString(36).substring(2);
    license.loginExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

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

    if (
        license &&
        license.hwid === hwid &&
        license.sessionId === sessionId
    ) {
        license.loginExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
        await license.save();
    }

    res.json({ status: "ok" });
});

// ===================== LOGOUT =====================
app.post("/logout", async (req, res) => {
    const { key, sessionId } = req.body;

    const license = await License.findOne({ key });

    if (
        license &&
        license.sessionId === sessionId
    ) {
        license.sessionId = null;
        license.loginExpiresAt = null;
        await license.save();
    }

    res.json({ status: "logged out" });
});

// ===================== RESET (ADMIN ONLY) =====================
app.post("/reset", async (req, res) => {
    const { key } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    license.hwid = null;
    license.sessionId = null;
    license.loginExpiresAt = null;

    await license.save();

    res.json({ status: "reset done" });
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
