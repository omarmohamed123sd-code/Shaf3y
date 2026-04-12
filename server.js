const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

// ===================== FAKE DATABASE =====================
let licenses = [
  {
    key: "ABC-KEY",
    hwid: null
  }
];

// ===================== HOME =====================
app.get("/", (req, res) => {
  res.send("Server is working 🔥");
});

// ===================== ADD KEY (POSTMAN) =====================
app.post("/addkey", (req, res) => {
  const { key } = req.body;

  if (!key)
    return res.json({ status: "error", message: "no key provided" });

  let exists = licenses.find(l => l.key === key);

  if (exists)
    return res.json({ status: "exists" });

  licenses.push({
    key: key,
    hwid: null
  });

  res.json({ status: "added", key: key });
});

// ===================== ACTIVATE KEY + HWID =====================
app.post("/activate", (req, res) => {
  const { key, hwid } = req.body;

  if (!key || !hwid)
    return res.json({ status: "error", message: "missing data" });

  let license = licenses.find(l => l.key === key);

  if (!license)
    return res.json({ status: "invalid" });

  // أول استخدام
  if (!license.hwid) {
    license.hwid = hwid;
    return res.json({ status: "activated" });
  }

  // نفس الجهاز
  if (license.hwid === hwid)
    return res.json({ status: "activated" });

  // جهاز مختلف
  return res.json({ status: "used" });
});

// ===================== LIST KEYS (OPTIONAL DEBUG) =====================
app.get("/keys", (req, res) => {
  res.json(licenses);
});

// ===================== START SERVER =====================
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
