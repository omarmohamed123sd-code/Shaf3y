const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
    res.json({ status: "server alive" });
});

// ================= CONNECT MONGO SAFE =================
async function start() {
    try {
        if (!process.env.MONGO_URL) {
            console.log("❌ MONGO_URL is missing");
            return;
        }

        await mongoose.connect(process.env.MONGO_URL);
        console.log("✅ MongoDB Connected");

        app.listen(process.env.PORT || 3000, () => {
            console.log("🚀 Server Running");
        });

    } catch (err) {
        console.log("❌ SERVER ERROR:", err);
    }
}

start();

// ================= LICENSE MODEL =================
const LicenseSchema = new mongoose.Schema({
    key: String,
    hwid: String,
    status: { type: String, default: "active" }, // active | banned
    expiresAt: Date
});

const License = mongoose.model("License", LicenseSchema);

// ================= ACTIVATE =================
app.post("/activate", async (req, res) => {
    try {
        const { key, hwid } = req.body;

        const license = await License.findOne({ key });

        if (!license)
            return res.json({ status: "invalid" });

        if (license.status === "banned")
            return res.json({ status: "banned" });

        if (license.expiresAt && license.expiresAt < new Date())
            return res.json({ status: "expired" });

        // bind HWID first time
        if (!license.hwid) {
            license.hwid = hwid;
            await license.save();
        }

        if (license.hwid !== hwid)
            return res.json({ status: "blocked" });

        return res.json({
            status: "session",
            expiresAt: license.expiresAt
        });

    } catch (err) {
        console.log(err);
        return res.json({ status: "error" });
    }
});

// ================= ADMIN CREATE KEY =================
app.post("/admin/create", async (req, res) => {
    try {
        const { key, days } = req.body;

        let expire = new Date();
        expire.setDate(expire.getDate() + (days || 30));

        await License.create({
            key,
            expiresAt: expire
        });

        res.json({ status: "created", key, expiresAt: expire });

    } catch (err) {
        res.json({ status: "error" });
    }
});

// ================= ADMIN LIST =================
app.get("/admin/list", async (req, res) => {
    const data = await License.find();
    res.json(data);
});

// ================= ADMIN BAN =================
app.post("/admin/ban", async (req, res) => {
    const { key } = req.body;

    await License.findOneAndUpdate(
        { key },
        { status: "banned" }
    );

    res.json({ status: "banned" });
});
