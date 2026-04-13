const express = require("express");
const app = express();

app.use(express.json());

// 🔥 Users (مؤقت - ممكن تحوله DB بعدين)
let users = [
  {
    username: "test",
    hwid: null,
    status: "active"
  }
];

// 🟢 Home
app.get("/", (req, res) => {
  res.send("Server Running ✅");
});

// 🔥 LOGIN FUNCTION
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

  // 🟢 أول مرة تسجيل HWID
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

// 🚀 تشغيل السيرفر
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
