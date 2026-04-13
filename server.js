import express from "express";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = "./keys.json";

// ================= DB =================
function loadDB() {
    try {
        if (!fs.existsSync(DB_FILE)) return {};
        return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch {
        return {};
    }
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// ================= HEALTH CHECK =================
app.get("/", (req, res) => {
    res.json({ status: "online" });
});

// ================= LOGIN =================
app.post("/login", (req, res) => {
    const { key, hwid } = req.body || {};

    if (!key || !hwid)
        return res.json({ status: "error", message: "missing_data" });

    let db = loadDB();

    if (!db[key])
        return res.json({ status: "error", message: "invalid_key" });

    if (!db[key].hwid) {
        db[key].hwid = hwid;
        saveDB(db);
        return res.json({ status: "success", message: "first_login" });
    }

    if (db[key].hwid === hwid)
        return res.json({ status: "success", message: "ok" });

    return res.json({ status: "error", message: "hwid_locked" });
});

// ================= CREATE KEY =================
app.post("/create", (req, res) => {
    const { key } = req.body || {};

    if (!key)
        return res.json({ status: "error", message: "no_key" });

    let db = loadDB();

    if (db[key])
        return res.json({ status: "error", message: "exists" });

    db[key] = { hwid: null };
    saveDB(db);

    res.json({ status: "success" });
});

// ================= DELETE KEY =================
app.delete("/key", (req, res) => {
    const { key } = req.body || {};

    let db = loadDB();

    if (!db[key])
        return res.json({ status: "error", message: "not_found" });

    delete db[key];
    saveDB(db);

    res.json({ status: "success" });
});

// ================= RESET HWID =================
app.post("/reset", (req, res) => {
    const { key } = req.body || {};

    let db = loadDB();

    if (!db[key])
        return res.json({ status: "error", message: "not_found" });

    db[key].hwid = null;
    saveDB(db);

    res.json({ status: "success" });
});

// ================= KEYS LIST =================
app.get("/keys", (req, res) => {
    res.json(loadDB());
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
