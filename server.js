const express = require("express");
const app = express();

app.use(express.json());

// 🔥 بيانات مؤقتة
let users = [
  {
    username: "test",
    hwid: null,
    status: "active"
  }
];

// 🟢 Test Route
app.get("/", (req, res) => {
  res.send("Server Running ✅");
});

// 🔥 Login Logic
function login(user, hwid, res) {
  if (!user || !hwid) {
    return res.send("missing_data");
  }

  const account = users.find(u => u.username === user);

  if (!account) {
    return res.send("invalid_user");
  }

  if (account.status !== "active") {
    return res.send("banned");
  }

  // 🟢 أول مرة يدخل
  if (!account.hwid) {
    account.hwid = hwid;
    return res.send("success_first_login");
  }

  // 🟢 نفس الجهاز
  if (account.hwid === hwid) {
    return res.send("success");
  }

  // 🔴 جهاز مختلف
  return res.send("hwid_error");
}

// 🟢 GET
app.get("/api", (req, res) => {
  login(req.query.user, req.query.hwid, res);
});

// 🟢 POST
app.post("/api", (req, res) => {
  login(req.body.user, req.body.hwid, res);
});

// 🚀 تشغيل السيرفر (مهم جدًا لـ Railway)
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
