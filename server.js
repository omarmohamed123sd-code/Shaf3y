const express = require("express");
const app = express();

app.use(express.json());

// 🔥 Users (مؤقت - بدل DB)
let users = [
  {
    username: "test",
    password: "123",
    hwid: null,
    status: "active"
  }
];

// ✅ Root عشان يمنع Cannot GET /
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ✅ API الأساسي
app.get("/api", (req, res) => {
  try {
    const { user, pass, hwid } = req.query;

    if (!user || !pass || !hwid) {
      return res.send("missing_data");
    }

    const account = users.find(
      u => u.username === user && u.password === pass
    );

    if (!account) {
      return res.send("invalid_login");
    }

    if (account.status !== "active") {
      return res.send("banned");
    }

    // 🔥 أول مرة
    if (!account.hwid) {
      account.hwid = hwid;
      return res.send("success_first_login");
    }

    // ✅ نفس الجهاز
    if (account.hwid === hwid) {
      return res.send("success");
    }

    // ❌ جهاز تاني
    return res.send("hwid_error");

  } catch (err) {
    console.log(err);
    return res.send("server_error");
  }
});

// 🚀 تشغيل السيرفر (مهم لـ Railway)
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
