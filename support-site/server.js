const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const file = path.join(__dirname, "data", "tickets.json");
const uploadsDir = path.join(__dirname, "data", "uploads");
const tokens = new Map();

const STAFF = {
  rep: { password: "rep", role: "rep", name: "נועה ברק", title: "נציגת מוקד" },
  cmd: { password: "cmd", role: "commander", name: "רס״ן אמיר שלו", title: "מפקד" },
};

function readTickets() {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return [];
  }
}

function writeTickets(tickets) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(tickets, null, 2), "utf8");
}

function nextId(tickets) {
  const max = tickets.reduce((current, ticket) => {
    return Math.max(current, Number(String(ticket.id).replace(/\D/g, "")) || 0);
  }, 26000);
  return `P-${max + 1}`;
}

function plusDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function staffFrom(req) {
  return tokens.get(req.header("x-staff-token") || "");
}

function saveAttachment(ticketId, dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return "";
  const match = dataUrl.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) return "";
  const raw = match[2].replace(/\s/g, "");
  if (raw.length > 2_500_000) {
    const error = new Error("הצילום גדול מדי. עד כ־2 מגה.");
    error.status = 400;
    throw error;
  }
  const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase().slice(0, 4);
  if (!["jpg", "png", "webp", "gif"].includes(ext)) {
    const error = new Error("אפשר לצרף תמונת jpg או png.");
    error.status = 400;
    throw error;
  }
  const safeExt = ext;
  fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = `${ticketId}.${safeExt}`;
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(raw, "base64"));
  return filename;
}

app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(express.json({ limit: "8mb" }));
app.use("/shared", express.static(path.join(__dirname, "..", "shared")));
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/auth/staff", (req, res) => {
  const user = STAFF[req.body.username];
  if (!user || user.password !== req.body.password) {
    return res.status(401).json({ error: "שם המשתמש או הסיסמה לא נכונים." });
  }
  const token = `${user.role}-${Date.now()}`;
  tokens.set(token, user);
  res.json({ token, role: user.role, name: user.name, title: user.title });
});

app.post("/api/tickets", (req, res) => {
  const body = req.body || {};
  if (!body.soldier || !body.soldier.tz || !body.route || !body.title) {
    return res.status(400).json({ error: "חסרים פרטים לפתיחת פנייה." });
  }
  const tickets = readTickets();
  const now = new Date().toISOString();
  const ticketId = nextId(tickets);
  let attachment = "";
  try {
    attachment = saveAttachment(ticketId, body.attachment);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
  const ticket = {
    id: ticketId,
    attachment,
    createdAt: now,
    expectedAt: body.sla === "יומיים" ? plusDays(2) : body.sla === "יומיים-שלושה" ? plusDays(3) : null,
    status: "open",
    route: body.route,
    requestType: body.requestType || "human_question",
    title: body.title,
    detail: body.detail || "",
    changeRequest: body.changeRequest || "",
    comparison: body.comparison || null,
    context: body.context || null,
    sla: body.sla || null,
    soldier: {
      tz: body.soldier.tz,
      firstName: body.soldier.firstName,
      lastName: body.soldier.lastName,
      serviceType: body.soldier.serviceType,
    },
    messages: [
      {
        from: "agent",
        author: "מוקד",
        text: body.detail || body.title,
        at: now,
      },
    ],
  };
  tickets.unshift(ticket);
  writeTickets(tickets);
  res.status(201).json(ticket);
});

app.get("/api/tickets", (req, res) => {
  const tickets = readTickets();
  if (req.query.tz) {
    return res.json(tickets.filter((ticket) => ticket.soldier.tz === req.query.tz));
  }
  const staff = staffFrom(req);
  if (!staff) return res.status(401).json({ error: "נדרשת כניסת צוות." });
  const queue = req.query.queue;
  if (queue === "commander") {
    if (staff.role !== "commander") return res.status(403).json({ error: "התור הזה שמור למפקד." });
    return res.json(tickets.filter((ticket) => ticket.route === "commander"));
  }
  if (staff.role !== "rep") return res.status(403).json({ error: "התור הזה שמור לנציג." });
  if (queue === "rep") return res.json(tickets.filter((ticket) => ticket.route === "rep"));
  if (queue === "system") {
    return res.json(tickets.filter((ticket) => ticket.route === "system"));
  }
  return res.json(tickets);
});

app.post("/api/tickets/:id/reply", (req, res) => {
  const staff = staffFrom(req);
  if (!staff || staff.role !== "rep") return res.status(401).json({ error: "רק נציג יכול לענות כאן." });
  const text = String(req.body.text || "").trim();
  if (!text) return res.status(400).json({ error: "אי אפשר לשלוח תשובה ריקה." });
  const tickets = readTickets();
  const ticket = tickets.find((item) => item.id === req.params.id);
  if (!ticket || ticket.route !== "rep") return res.status(404).json({ error: "הפנייה לא בתור הנציג." });
  ticket.status = "in_progress";
  ticket.messages.push({ from: "rep", author: staff.name, text, at: new Date().toISOString() });
  writeTickets(tickets);
  res.json(ticket);
});

app.post("/api/tickets/:id/escalate", (req, res) => {
  const staff = staffFrom(req);
  if (!staff || staff.role !== "rep") return res.status(401).json({ error: "רק נציג יכול להעביר למפקד." });
  const tickets = readTickets();
  const ticket = tickets.find((item) => item.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "הפנייה לא נמצאה." });
  ticket.route = "commander";
  ticket.status = "open";
  ticket.messages.push({
    from: "rep",
    author: staff.name,
    text: "העברתי את הפנייה למפקד לבדיקה.",
    at: new Date().toISOString(),
  });
  writeTickets(tickets);
  res.json(ticket);
});

app.post("/api/tickets/:id/close", (req, res) => {
  const staff = staffFrom(req);
  if (!staff) return res.status(401).json({ error: "נדרשת כניסת צוות." });
  const tickets = readTickets();
  const ticket = tickets.find((item) => item.id === req.params.id);
  if (!ticket) return res.status(404).json({ error: "הפנייה לא נמצאה." });
  ticket.status = "closed";
  ticket.messages.push({
    from: staff.role === "commander" ? "commander" : "rep",
    author: staff.name,
    text: "הפנייה נסגרה.",
    at: new Date().toISOString(),
  });
  writeTickets(tickets);
  res.json(ticket);
});

app.post("/api/tickets/:id/decide", (req, res) => {
  const staff = staffFrom(req);
  if (!staff || staff.role !== "commander") return res.status(401).json({ error: "רק מפקד יכול להחליט." });
  const tickets = readTickets();
  const ticket = tickets.find((item) => item.id === req.params.id);
  if (!ticket || ticket.route !== "commander") return res.status(404).json({ error: "הפנייה לא ממתינה למפקד." });
  const decision = req.body.decision === "approve" ? "approve" : "reject";
  const note = String(req.body.text || "").trim();
  const text = decision === "approve"
    ? `אישרתי את הבקשה. ${note}`.trim()
    : `לא אישרתי את הבקשה. ${note}`.trim();
  ticket.status = "closed";
  ticket.decision = decision;
  ticket.messages.push({ from: "commander", author: staff.name, text, at: new Date().toISOString() });
  writeTickets(tickets);
  res.json(ticket);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`מוקד השירות פעיל על http://localhost:${PORT}`);
  });
}

module.exports = app;
