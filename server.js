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

// ===================== ACTIVATE =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // bind hwid first time
    if (!license.hwid) {
        license.hwid = hwid;
    }

    if (license.hwid !== hwid)
        return res.json({ status: "used on another device" });

    // auto fix stale session
    if (license.isOnline && license.lastSeen) {
        const diff = (Date.now() - new Date(license.lastSeen)) / 1000;

        if (diff < 30) {
            return res.json({ status: "already running" });
        }
    }

    license.isOnline = true;
    license.lastSeen = new Date();

    await license.save();

    res.json({ status: "activated" });
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

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
