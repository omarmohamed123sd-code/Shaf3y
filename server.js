const express = require("express");
const mongoose = require("mongoose");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());

// ================= MONGO =================
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log("Mongo Connected"))
    .catch(err => console.log(err));

// ================= MODEL =================
const UserSchema = new mongoose.Schema({
    username: String,
    key: String,
    hwid: String,
    status: { type: String, default: "active" }
});

const User = mongoose.model("User", UserSchema);

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
    res.json({ status: "server alive" });
});

// ================= CREATE USER =================
app.post("/create", async (req, res) => {
    const { username, key } = req.body;

    if (!username || !key)
        return res.json({ status: "missing_data" });

    const exists = await User.findOne({ username });
    if (exists)
        return res.json({ status: "user_exists" });

    await User.create({
        username,
        key,
        hwid: null
    });

    res.json({ status: "created" });
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
    const { username, key, hwid } = req.body;

    const user = await User.findOne({ username });

    if (!user)
        return res.json({ status: "invalid_user" });

    if (user.key !== key)
        return res.json({ status: "wrong_key" });

    if (user.status === "banned")
        return res.json({ status: "banned" });

    // ================= FIRST TIME HWID BIND =================
    if (!user.hwid) {
        user.hwid = hwid;
        await user.save();
        return res.json({ status: "first_login" });
    }

    // ================= HWID CHECK =================
    if (user.hwid !== hwid)
        return res.json({ status: "hwid_locked" });

    return res.json({ status: "success" });
});

// ================= BAN USER =================
app.post("/ban", async (req, res) => {
    const { username } = req.body;

    const user = await User.findOne({ username });

    if (!user)
        return res.json({ status: "not_found" });

    user.status = "banned";
    await user.save();

    res.json({ status: "banned" });
});

// ================= START SERVER =================
app.listen(process.env.PORT || 3000, () => {
    console.log("Server running");
});
