const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

// ===================== MIDDLEWARE =====================
app.use(express.json());

// ===================== SAFE START CHECK =====================
if (!process.env.MONGO_URL) {
    console.log("❌ MONGO_URL is missing in Railway Variables");
}

// ===================== MONGO CONNECT =====================
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected 🔥"))
.catch(err => console.log("Mongo Error:", err));

// ===================== MODEL =====================
const LicenseSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    hwid: { type: String, default: null }
});

const License = mongoose.model("License", LicenseSchema);

// ===================== HOME =====================
app.get("/", (req, res) => {
    res.send("Server is working 🔥");
});

// ===================== ADD KEY =====================
app.post("/addkey", async (req, res) => {
    try {
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

        res.json({ status: "added", key, hwid: hwid || null });

    } catch (err) {
        res.json({ status: "error", message: err.message });
    }
});

// ===================== ACTIVATE =====================
app.post("/activate", async (req, res) => {
    try {
        const { key, hwid } = req.body;

        if (!key || !hwid)
            return res.json({ status: "error", message: "missing key or hwid" });

        const license = await License.findOne({ key });

        if (!license)
            return res.json({ status: "invalid" });

        // أول جهاز
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
        return res.json({ status: "used" });

    } catch (err) {
        res.json({ status: "error", message: err.message });
    }
});

// ===================== RESET =====================
app.post("/reset", async (req, res) => {
    try {
        const { key } = req.body;

        const license = await License.findOne({ key });

        if (!license)
            return res.json({ status: "invalid" });

        license.hwid = null;
        await license.save();

        res.json({ status: "reset done" });

    } catch (err) {
        res.json({ status: "error", message: err.message });
    }
});

// ===================== DELETE =====================
app.post("/deletekey", async (req, res) => {
    try {
        const { key } = req.body;

        await License.deleteOne({ key });

        res.json({ status: "deleted", key });

    } catch (err) {
        res.json({ status: "error", message: err.message });
    }
});

// ===================== DEBUG =====================
app.get("/keys", async (req, res) => {
    const data = await License.find();
    res.json(data);
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
