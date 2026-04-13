const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ================= MONGO =================
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Mongo Connected"))
    .catch(err => console.log(err));

// ================= MODEL =================
const UserSchema = new mongoose.Schema({
    key: String,
    hwid: String,
    status: { type: String, default: "active" }
});

const User = mongoose.model("User", UserSchema);

// ================= LOGIN =================
app.post("/login", async (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid)
        return res.json({ status: "missing_data" });

    const user = await User.findOne({ key });

    if (!user)
        return res.json({ status: "wrong_key" });

    if (user.status === "banned")
        return res.json({ status: "banned" });

    // أول مرة ربط HWID
    if (!user.hwid) {
        user.hwid = hwid;
        await user.save();
        return res.json({ status: "first_login" });
    }

    // جهاز مختلف
    if (user.hwid !== hwid)
        return res.json({ status: "hwid_locked" });

    return res.json({ status: "success" });
});

// ================= CREATE KEY =================
app.post("/create", async (req, res) => {
    const { key } = req.body;

    const exists = await User.findOne({ key });
    if (exists)
        return res.json({ status: "key_exists" });

    await User.create({ key, hwid: null });

    res.json({ status: "created" });
});

// ================= BAN =================
app.post("/ban", async (req, res) => {
    const { key } = req.body;

    await User.findOneAndUpdate(
        { key },
        { status: "banned" }
    );

    res.json({ status: "banned" });
});

app.listen(3000, () => {
    console.log("Server running");
});
