const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== MIDDLEWARE =====================
app.use(express.json());

// ===================== MONGO CONNECT =====================
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected 🔥"))
.catch(err => console.log("Mongo Error:", err));

// ===================== SCHEMA =====================
const LicenseSchema = new mongoose.Schema({
    key: String,
    hwid: String,
    isOnline: { type: Boolean, default: false }
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
        isOnline: false
    });

    res.json({ status: "added", key });
});

// ===================== ACTIVATE =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid)
        return res.json({ status: "error", message: "missing data" });

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // أول مرة ربط HWID
    if (!license.hwid) {
        license.hwid = hwid;
    }

    // جهاز مختلف
    if (license.hwid !== hwid) {
        return res.json({ status: "used on another device" });
    }

    // لو شغال بالفعل
    if (license.isOnline) {
        return res.json({ status: "already running" });
    }

    license.isOnline = true;
    await license.save();

    res.json({ status: "activated" });
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

// ===================== RESET HWID =====================
app.post("/reset", async (req, res) => {
    const { key } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    license.hwid = null;
    license.isOnline = false;

    await license.save();

    res.json({ status: "reset done" });
});

// ===================== DELETE KEY =====================
app.post("/deletekey", async (req, res) => {
    const { key } = req.body;

    await License.deleteOne({ key });

    res.json({ status: "deleted" });
});

// ===================== GET KEYS =====================
app.get("/keys", async (req, res) => {
    const data = await License.find();
    res.json(data);
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
