const express = require("express");
const mongoose = require("mongoose");

const app = express();
app.use(express.json());

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
    res.json({ status: "server alive" });
});

// ================= MONGO =================
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Mongo Connected"))
    .catch(err => console.log("Mongo Error:", err));

// ================= MODEL =================
const UserSchema = new mongoose.Schema({
    key: String,
    hwid: { type: String, default: null },
    banned: { type: Boolean, default: false }
});

const User = mongoose.model("User", UserSchema);

// ================= LOGIN =================
app.post("/login", async (req, res) => {
    try {
        const { key, hwid } = req.body;

        if (!key || !hwid) {
            return res.json({ status: "missing_data" });
        }

        const user = await User.findOne({ key });

        if (!user) {
            return res.json({ status: "wrong_key" });
        }

        if (user.banned) {
            return res.json({ status: "banned" });
        }

        // first login bind
        if (!user.hwid) {
            user.hwid = hwid;
            await user.save();
            return res.json({ status: "first_login" });
        }

        // hwid mismatch
        if (user.hwid !== hwid) {
            return res.json({ status: "hwid_locked" });
        }

        return res.json({ status: "success" });

    } catch (err) {
        console.log(err);
        return res.json({ status: "server_error" });
    }
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

// ================= BAN USER =================
app.post("/ban", async (req, res) => {
    const { key } = req.body;

    await User.findOneAndUpdate(
        { key },
        { banned: true }
    );

    return res.json({ status: "banned" });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
