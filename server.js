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
    hwid: { type: String, default: null },
    banned: { type: Boolean, default: false }
});

const User = mongoose.model("User", UserSchema);

// ================= LOGIN =================
app.post("/login", async (req, res) => {
    const { key, hwid } = req.body;

    // validation
    if (!key || !hwid) {
        return res.json({ status: "missing_data" });
    }

    const user = await User.findOne({ key });

    // key not found
    if (!user) {
        return res.json({ status: "wrong_key" });
    }

    // banned check
    if (user.banned) {
        return res.json({ status: "banned" });
    }

    // first login → bind HWID
    if (!user.hwid) {
        user.hwid = hwid;
        await user.save();
        return res.json({ status: "first_login" });
    }

    // HWID mismatch
    if (user.hwid !== hwid) {
        return res.json({ status: "hwid_locked" });
    }

    // success login
    return res.json({ status: "success" });
});

// ================= CREATE KEY =================
app.post("/create", async (req, res) => {
    const { key } = req.body;

    if (!key) {
        return res.json({ status: "missing_key" });
    }

    const exists = await User.findOne({ key });

    if (exists) {
        return res.json({ status: "key_exists" });
    }

    await User.create({ key });

    return res.json({ status: "created" });
});

// ================= BAN =================
app.post("/ban", async (req, res) => {
    const { key } = req.body;

    await User.findOneAndUpdate(
        { key },
        { banned: true }
    );

    return res.json({ status: "banned" });
});

// ================= SERVER =================
app.listen(3000, () => {
    console.log("Server running on port 3000");
});
