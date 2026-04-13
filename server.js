const express = require("express");
const app = express();

app.use(express.json());

// 🔥 test route (مهم جدًا)
app.get("/", (req, res) => {
  res.send("Server Working ✅");
});

// 🔑 keys
let keys = [
  {
    key: "ABC-123",
    hwid: null,
    used: false,
    status: "active"
  }
];

function activate(key, hwid, res) {
  if (!key || !hwid) return res.send("missing_data");

  const k = keys.find(x => x.key === key);

  if (!k) return res.send("invalid_key");
  if (k.status !== "active") return res.send("banned");

  if (!k.used) {
    k.used = true;
    k.hwid = hwid;
    return res.send("activated_first_time");
  }

  if (k.hwid === hwid) return res.send("key_ok");

  return res.send("hwid_error");
}

// ✅ GET
app.get("/activate", (req, res) => {
  activate(req.query.key, req.query.hwid, res);
});

// ✅ POST
app.post("/activate", (req, res) => {
  activate(req.body.key, req.body.hwid, res);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running...");
});
