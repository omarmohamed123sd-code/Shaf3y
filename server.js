const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected 🔥"))
.catch(err => console.log(err));

const LicenseSchema = new mongoose.Schema({
    key: String,
    hwid: String
});

const License = mongoose.model("License", LicenseSchema);

// ===================== ADD KEY =====================
app.post("/addkey", async (req, res) => {
    const { key } = req.body;

    const exists = await License.findOne({ key });

    if (exists)
        return res.json({ status: "exists" });

    await License.create({
        key,
        hwid: null
    });

    res.json({ status: "added" });
});

// ===================== ACTIVATE (FIXED LOGIC) =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid)
        return res.json({ status: "invalid" });

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // ===================== FIRST TIME ONLY =====================
    if (license.hwid === null || license.hwid === undefined) {

        license.hwid = hwid;
        await license.save();

        return res.json({
            status: "session"
        });
    }

    // ===================== SAME DEVICE =====================
    if (license.hwid === hwid) {
        return res.json({
            status: "session"
        });
    }

    // ===================== DIFFERENT DEVICE =====================
    return res.json({
        status: "blocked"
    });
});

// ===================== RESET =====================
app.post("/reset", async (req, res) => {
    const { key } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    license.hwid = null;

    await license.save();

    res.json({ status: "reset done" });
});

app.listen(3000, () => {
    console.log("Server running 🔥");
});
