const express = require("express");
const cors = require("cors");
const path = require("path");
const { soldiers } = require("./soldiers");
const { sum } = require("../shared/policy");

const app = express();
const PORT = 4000;
const codes = new Map();

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(cors());
app.use(express.json());
app.use("/shared", express.static(path.join(__dirname, "..", "shared")));
if (process.env.COMBINED !== "1") {
  app.use(express.static(path.join(__dirname, "public")));
}

function byTz(tz) {
  return soldiers.find((soldier) => soldier.tz === String(tz || "").replace(/\D/g, ""));
}

function identity(soldier) {
  return {
    tz: soldier.tz,
    firstName: soldier.firstName,
    lastName: soldier.lastName,
    serviceType: soldier.serviceType,
  };
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}-****${phone.slice(-3)}`;
}

function sapView(soldier) {
  return {
    tz: soldier.tz,
    firstName: soldier.firstName,
    lastName: soldier.lastName,
    gender: soldier.gender,
    age: soldier.age,
    phone: soldier.phone,
    serviceType: soldier.serviceType,
    rank: soldier.rank,
    plannedEnlistment: soldier.plannedEnlistment,
    actualEnlistment: soldier.actualEnlistment,
    releaseDate: soldier.releaseDate,
    role: soldier.role,
    activityLevel: soldier.activityLevel,
    combatStatus: soldier.combatStatus,
    contract: soldier.contract,
    scenario: soldier.scenario,
    entitlements: soldier.sapLines,
    entitlementTotal: sum(soldier.sapLines),
  };
}

function cardView(soldier) {
  const visible = soldier.cardStatus === "ok";
  return {
    tz: soldier.tz,
    firstName: soldier.firstName,
    lastName: soldier.lastName,
    serviceType: soldier.serviceType,
    cardStatus: soldier.cardStatus,
    cardStatusLabel: soldier.cardStatusLabel,
    multipassNumber: soldier.multipassNumber,
    regulation: "מאושר",
    lines: visible ? soldier.cardLines : [],
    total: visible ? sum(soldier.cardLines) : 0,
    transactions: visible ? soldier.transactions : [],
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "idf-demo-data", soldiers: soldiers.length });
});

app.get("/api/soldiers", (_req, res) => {
  res.json(
    soldiers.map((soldier) => ({
      tz: soldier.tz,
      firstName: soldier.firstName,
      lastName: soldier.lastName,
      gender: soldier.gender,
      age: soldier.age,
      phone: soldier.phone,
      serviceType: soldier.serviceType,
      role: soldier.role,
      activityLevel: soldier.activityLevel,
      combatStatus: soldier.combatStatus,
      rank: soldier.rank,
      cardStatus: soldier.cardStatus,
      cardStatusLabel: soldier.cardStatusLabel,
      scenario: soldier.scenario,
      tone: soldier.tone,
      plannedEnlistment: soldier.plannedEnlistment,
      actualEnlistment: soldier.actualEnlistment,
      releaseDate: soldier.releaseDate,
    }))
  );
});

app.get("/api/demo-accounts", (_req, res) => {
  res.json(
    soldiers.map((soldier) => ({
      tz: soldier.tz,
      last4: soldier.tz.slice(-4),
      phone: soldier.phone,
      firstName: soldier.firstName,
      lastName: soldier.lastName,
      serviceType: soldier.serviceType,
      scenario: soldier.scenario,
      tone: soldier.tone,
    }))
  );
});

app.get("/api/soldiers/:tz/sap", (req, res) => {
  const soldier = byTz(req.params.tz);
  if (!soldier) return res.status(404).json({ error: "החייל לא נמצא בסא״פ" });
  res.json(sapView(soldier));
});

app.get("/api/soldiers/:tz/card", (req, res) => {
  const soldier = byTz(req.params.tz);
  if (!soldier) return res.status(404).json({ error: "החייל לא נמצא" });
  res.json(cardView(soldier));
});

app.post("/api/auth/conscript", (req, res) => {
  const tz = String(req.body.tz || "").replace(/\D/g, "");
  const phone = String(req.body.phone || "").replace(/\D/g, "");
  const soldier = byTz(tz);
  if (!soldier || soldier.serviceType !== "סדיר") {
    return res.status(401).json({ error: "הכניסה הזו מיועדת לחיילי חובה. בדוק ת״ז, או היכנס במסך הקבע." });
  }
  if (soldier.phone !== phone) {
    return res.status(401).json({ error: "הת״ז לא תואמת למספר הנייד." });
  }
  res.json(identity(soldier));
});

app.post("/api/auth/career/code", (req, res) => {
  const last4 = String(req.body.last4 || "").replace(/\D/g, "");
  const matches = soldiers.filter((soldier) => soldier.serviceType === "קבע" && soldier.tz.slice(-4) === last4);
  if (!matches.length) {
    return res.status(404).json({ error: "לא נמצא חייל קבע עם 4 הספרות האלה." });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  codes.set(last4, { code, expires: Date.now() + 5 * 60 * 1000, tz: matches[0].tz });
  res.json({
    ok: true,
    simulation: true,
    maskedPhone: maskPhone(matches[0].phone),
    demoCode: code,
  });
});

app.post("/api/auth/career/verify", (req, res) => {
  const last4 = String(req.body.last4 || "").replace(/\D/g, "");
  const code = String(req.body.code || "").replace(/\D/g, "");
  const pending = codes.get(last4);
  if (!pending || pending.expires < Date.now() || pending.code !== code) {
    return res.status(401).json({ error: "הקוד לא תואם, או שפג תוקפו. אפשר לבקש קוד חדש." });
  }
  const soldier = byTz(pending.tz);
  if (!soldier || soldier.serviceType !== "קבע") {
    return res.status(401).json({ error: "החייל לא נמצא במאגר הקבע." });
  }
  codes.delete(last4);
  res.json(identity(soldier));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`מקור הנתונים פעיל על http://localhost:${PORT}`);
  });
}

module.exports = app;
