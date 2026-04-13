const express = require("express");
const app = express();

app.use(express.json());

// داتا مؤقتة (بدل database)
let users = [
  {
    username: "test",
    password: "123",
    hwid: null,
    status: "active"
  }
];

app.get("/api", (req, res) => {
  const { user, pass, hwid } = req.query;

  if (!user || !pass || !hwid) {
    return res.send("missing_data");
  }

  const account = users.find(u => u.username === user && u.password === pass);

  if (!account) {
    return res.send("invalid_login");
  }

  if (account.status !== "active") {
    return res.send("banned");
  }

  // أول مرة
  if (!account.hwid) {
    account.hwid = hwid;
    return res.send("success_first_login");
  }

  // نفس الجهاز
  if (account.hwid === hwid) {
    return res.send("success");
  }

  // جهاز تاني
  return res.send("hwid_error");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
