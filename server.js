const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ===================== DB =====================
mongoose.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected 🔥"))
.catch(err => console.log(err));

// ===================== MODEL =====================
const LicenseSchema = new mongoose.Schema({
    key: String,
    hwid: String
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
        hwid: null
    });

    res.json({ status: "added" });
});

// ===================== ACTIVATE =====================
app.post("/activate", async (req, res) => {
    const { key, hwid } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    // ===================== FIRST DEVICE =====================
    if (!license.hwid) {
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

// ===================== RESET (ADMIN ONLY) =====================
app.post("/reset", async (req, res) => {
    const { key } = req.body;

    const license = await License.findOne({ key });

    if (!license)
        return res.json({ status: "invalid" });

    license.hwid = null;

    await license.save();

    res.json({ status: "reset done" });
});

// ===================== START =====================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
