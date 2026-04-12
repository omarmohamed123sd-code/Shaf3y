const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

// مهم جدًا
app.use(express.json());

// ===================== DATABASE =====================
let licenses = [
  {
    key: "ABC-KEY",
    hwid: null
  }
];

// ===================== HOME (GET) =====================
app.get("/", (req, res) => {
  res.send("Server is working 🔥");
});

// ===================== ADD KEY =====================
app.post("/addkey", (req, res) => {
  const { key, hwid } = req.body;

  if (!key)
    return res.json({ status: "error", message: "no key" });

  let exists = licenses.find(l => l.key === key);

  if (exists)
    return res.json({ status: "exists" });

  licenses.push({
    key: key,
    hwid: hwid || null
  });

  res.json({
    status: "added",
    key,
    hwid: hwid || null
  });
});

// ===================== ACTIVATE KEY =====================
app.post("/activate", (req, res) => {
  const { key, hwid } = req.body;

  console.log("ACTIVATE HIT:", req.body);

  if (!key || !hwid)
    return res.json({ status: "error", message: "missing key or hwid" });

  let license = licenses.find(l => l.key === key);

  if (!license)
    return res.json({ status: "invalid" });

  // أول جهاز
  if (!license.hwid) {
    license.hwid = hwid;
    return res.json({ status: "activated" });
  }

  // نفس الجهاز
  if (license.hwid === hwid) {
    return res.json({ status: "activated" });
  }

  // جهاز مختلف
  return res.json({ status: "used" });
});

// ===================== DEBUG =====================
app.get("/keys", (req, res) => {
  res.json(licenses);
});

// ===================== START SERVER =====================
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
