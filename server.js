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
    hwid: String
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
        hwid: hwid || null
    });

    res.json({
        status: "added",
        key,
        hwid: hwid || null
    });
});

// ===================== ACTIVATE KEY =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid)
        return res.json({ status: "error", message: "missing key or hwid" });

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // أول مرة ربط
    if (!license.hwid) {
        license.hwid = hwid;
        await license.save();
        return res.json({ status: "activated" });
    }

    // نفس الجهاز
    if (license.hwid === hwid) {
        return res.json({ status: "activated" });
    }

    // جهاز مختلف
    return res.json({ status: "used on another device" });
});

// ===================== RESET HWID =====================
app.post("/reset", async (req, res) => {
    const { key } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    license.hwid = null;
    await license.save();

    res.json({ status: "reset done" });
});

// ===================== DELETE KEY =====================
app.post("/deletekey", async (req, res) => {
    const { key } = req.body;

    await License.deleteOne({ key });

    res.json({ status: "deleted", key });
});

// ===================== GET ALL KEYS (DEBUG) =====================
app.get("/keys", async (req, res) => {
    const data = await License.find();
    res.json(data);
});

// ===================== START SERVER =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
