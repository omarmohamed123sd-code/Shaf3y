const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL);

// ================= MODEL =================
const LicenseSchema = new mongoose.Schema({
    key: String,
    hwid: String,
    status: { type: String, default: "active" }, // active / banned
    expiresAt: Date
});

const License = mongoose.model("License", LicenseSchema);

// ================= SECRET =================
const SECRET = "SHAF3Y_SECRET_123";

// ================= SIGN =================
function sign(key, hwid) {
    return crypto
        .createHash("sha256")
        .update(key + hwid + SECRET)
        .digest("hex")
        .toUpperCase();
}

// ================= CREATE KEY (ADMIN) =================
app.post("/admin/create", async (req, res) => {
    const { key, days } = req.body;

    let expire = new Date();
    expire.setDate(expire.getDate() + (days || 30));

    await License.create({
        key,
        expiresAt: expire
    });

    res.json({ status: "created" });
});

// ================= ACTIVATE =================
app.post("/activate", async (req, res) => {
    const { key, hwid, signature } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    if (license.status === "banned")
        return res.json({ status: "banned" });

    if (license.expiresAt < new Date())
        return res.json({ status: "expired" });

    // verify signature
    const validSig = sign(key, hwid);

    if (signature && signature !== validSig)
        return res.json({ status: "tampered" });

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
});

// ================= BAN =================
app.post("/admin/ban", async (req, res) => {
    const { key } = req.body;

    await License.findOneAndUpdate({ key }, { status: "banned" });

    res.json({ status: "banned" });
});

// ================= LIST =================
app.get("/admin/list", async (req, res) => {
    const data = await License.find();
    res.json(data);
});

app.listen(3000, () => console.log("PRO SERVER RUNNING"));
