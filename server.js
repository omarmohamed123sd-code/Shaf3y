const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ================= DB =================
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// ================= MODEL =================
const LicenseSchema = new mongoose.Schema({
    key: String,
    hwid: String,
    expiresAt: Date,
    createdAt: { type: Date, default: Date.now }
});

const License = mongoose.model("License", LicenseSchema);

// ================= ADD KEY =================
app.post("/addkey", async (req, res) => {
    const { key, days } = req.body;

    const exists = await License.findOne({ key });
    if (exists) return res.json({ status: "exists" });

    let expire = new Date();
    expire.setDate(expire.getDate() + (days || 30));

    await License.create({
        key,
        hwid: null,
        expiresAt: expire
    });

    res.json({ status: "added", expiresAt: expire });
});

// ================= ACTIVATE =================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid)
        return res.json({ status: "bad_request" });

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    if (license.expiresAt < new Date())
        return res.json({ status: "expired" });

    if (!license.hwid)
    {
        license.hwid = hwid;
        await license.save();

        return res.json({
            status: "session",
            expiresAt: license.expiresAt
        });
    }

    if (license.hwid === hwid)
    {
        return res.json({
            status: "session",
            expiresAt: license.expiresAt
        });
    }

    return res.json({ status: "blocked" });
});

app.listen(PORT, () => console.log("Server running on port " + PORT));
