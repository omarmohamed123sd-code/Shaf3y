const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ================= MONGO =================
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Mongo Connected"))
    .catch(err => console.log(err));

// ================= MODEL =================
const LicenseSchema = new mongoose.Schema({
    key: String,
    hwid: String, // الجهاز المرتبط
    status: { type: String, default: "active" },
    expiresAt: Date
});

const License = mongoose.model("License", LicenseSchema);

// ================= HEALTH =================
app.get("/", (req, res) => {
    res.json({ status: "alive" });
});

// ================= CREATE KEY =================
app.post("/admin/create", async (req, res) => {
    const { key, days } = req.body;

    let expire = new Date();
    expire.setDate(expire.getDate() + (days || 30));

    await License.create({
        key,
        expiresAt: expire,
        hwid: null
    });

    res.json({ status: "created", key });
});

// ================= ACTIVATE (MAIN LOGIC) =================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    if (license.status === "banned")
        return res.json({ status: "banned" });

    if (license.expiresAt && license.expiresAt < new Date())
        return res.json({ status: "expired" });

    // ================= FIRST TIME BIND =================
    if (!license.hwid) {
        license.hwid = hwid;
        await license.save();
        return res.json({ status: "activated_first_time" });
    }

    // ================= CHECK HWID =================
    if (license.hwid !== hwid)
        return res.json({ status: "blocked" });

    return res.json({ status: "session" });
});

// ================= BAN =================
app.post("/admin/ban", async (req, res) => {
    const { key } = req.body;

    await License.findOneAndUpdate(
        { key },
        { status: "banned" }
    );

    res.json({ status: "banned" });
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
    console.log("Server running");
});
