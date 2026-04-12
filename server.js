const express = require("express");
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔑 Key واحد للتجربة
let licenses = [
  {
    key: "ABC-KEY",
    hwid: null
  }
];

// 🟢 Check server
app.get("/", (req, res) => {
  res.send("Server is working 🔥");
});

// 🔐 Activate Key + HWID
app.post("/activate", (req, res) => {
  const { key, hwid } = req.body;

  let license = licenses.find(l => l.key === key);

  if (!license)
    return res.json({ status: "invalid" });

  // أول جهاز
  if (!license.hwid) {
    license.hwid = hwid;
    return res.json({ status: "activated" });
  }

  // نفس الجهاز
  if (license.hwid === hwid)
    return res.json({ status: "activated" });

  // جهاز تاني
  return res.json({ status: "used" });
});

// 🚀 تشغيل السيرفر
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});