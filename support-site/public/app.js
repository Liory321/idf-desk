var state = {
  health: null,
  accounts: [],
  soldier: null,
  staff: null,
  messages: [],
  pending: null,
  seen: {},
  busy: false,
  error: "",
  career: null,
  prefill: {},
  queueName: "rep",
  tickets: [],
  activeId: "",
  apiDraft: IdfApi.base(),
  phoneHelp: false,
};

var DESK_PHONE_HELP = "כדי לעדכן מספר טלפון צריך לחייג למיטב בטלפון 1111, ולבקש מהם שיעדכנו את המספר לא רק במערכת, אלא גם בחדר הכוכבים. רק שעתיים עד שלוש אחרי שאמרו שהמספר עודכן, נכנסים למוקד, פותחים פנייה חדשה וכותבים שחייגת למיטב והם שינו את המספר לפני שעתיים. אז אנחנו מעדכנים את המספר אצלנו, ותוך יומיים עד שלושה זה עובד אוטומטית.";

function readIncoming() {
  try {
    return JSON.parse(sessionStorage.getItem("incoming_card") || "null");
  } catch (error) {
    return null;
  }
}

function captureIncoming() {
  const params = new URLSearchParams(location.search);
  const status = params.get("cardStatus");
  const tz = params.get("tz");
  if (status === "no_card" || status === "bad_data") {
    sessionStorage.setItem("incoming_card", JSON.stringify({ status, tz: tz || "" }));
  }
}

function incomingLabel(status) {
  return status === "bad_data" ? "נתונים שגויים" : "לא נמצא כרטיס";
}

function withPhoneHelp(message) {
  if (!message) return "";
  if (/תואם|נייד|טלפון|קוד/.test(message) && !message.includes("1111")) return `${message}\n${DESK_PHONE_HELP}`;
  return message;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}
function textHtml(value) {
  return esc(value).replace(/\n/g, "<br>");
}
function money(value) {
  return Number(value || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function hebDate(iso) {
  if (!iso) return "—";
  const [year, month, day] = String(iso).split("-");
  if (!day) return esc(iso);
  return `${day}/${month}/${year}`;
}
function phoneFmt(phone) {
  return phone && phone.length === 10 ? `${phone.slice(0, 3)}-${phone.slice(3)}` : phone;
}
function save() {
  sessionStorage.setItem("desk_session", JSON.stringify({
    soldier: state.soldier,
    staff: state.staff,
    messages: state.messages,
    pending: state.pending,
    seen: state.seen,
  }));
}
function restore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem("desk_session") || "null");
    if (!saved) return;
    state.soldier = saved.soldier;
    state.staff = saved.staff;
    state.messages = saved.messages || [];
    state.pending = saved.pending;
    state.seen = saved.seen || {};
  } catch (error) {
    sessionStorage.removeItem("desk_session");
  }
}
function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

function homeHtml() {
  const sadir = state.accounts.filter((item) => item.serviceType === "סדיר");
  const keva = state.accounts.filter((item) => item.serviceType === "קבע");
  const cards = (list, mode) => list.map((item) => `
    <button class="account" data-account="${esc(item.tz)}">
      <b>${esc(item.firstName)} ${esc(item.lastName)}</b>
      <small>${mode === "סדיר" ? `ת״ז ${esc(item.tz)} · ${phoneFmt(item.phone)}` : `4 ספרות ${esc(item.last4)} · ${phoneFmt(item.phone)}`}</small><br>
      <span class="tag ${esc(item.tone)}">${esc(item.scenario)}</span>
    </button>`).join("");
  const incoming = readIncoming();
  const banner = incoming ? `
    <div class="incoming">
      <strong>האתר החזיר: ${esc(incomingLabel(incoming.status))}</strong>
      <p>היכנס עם החייל כדי שהבקשה תיפתח עם הסטטוס הזה, בלי לשאול שוב מה קרה.</p>
      <button class="primary" type="button" data-incoming>המשך לפתיחת הבקשה</button>
    </div>` : "";
  return `
    <main class="page">
      <h1 class="brand">מוקד<small>מענה לשאלות על כוכבים ונקודות. נתונים פיקטיביים.</small></h1>
      ${banner}
      <div class="doors">
        <button class="door" data-go="#/sadir"><b>חייל חובה</b><span>ת״ז ונייד</span></button>
        <button class="door" data-go="#/keva"><b>חייל קבע</b><span>4 ספרות וקוד SMS</span></button>
        <button class="door" data-go="#/staff"><b>נציג / מפקד</b><span>כניסה לפי הרשאה</span></button>
      </div>
      <div class="status">
        <span><i class="dot ${state.health ? "on" : "off"}"></i>${state.health ? "מקור הנתונים מחובר" : "מקור הנתונים לא זמין"} · <span class="num">${esc(IdfApi.base())}</span></span>
        <a href="${esc(IdfApi.base())}" target="_blank" rel="noreferrer">פתיחת אתר הנתונים</a>
      </div>
      <form id="api-form" class="row-actions">
        <input id="api-base" value="${esc(state.apiDraft)}" />
        <button class="primary" type="submit">החלף כתובת API</button>
      </form>
      <div class="accounts">
        <section><h2>חיילי חובה</h2><div class="account-list">${cards(sadir, "סדיר") || "<p>אין רשימה. בדוק שאתר הנתונים פתוח.</p>"}</div></section>
        <section><h2>חיילי קבע</h2><div class="account-list">${cards(keva, "קבע")}</div></section>
      </div>
    </main>`;
}

function conscriptHtml() {
  return `
    <main class="narrow">
      <form class="panel" id="conscript-form">
        <button class="ghost" type="button" data-go="#/">חזרה</button>
        <h1>כניסת חייל חובה</h1>
        <p>תעודת זהות ומספר נייד שקיימים במאגר.</p>
        ${incomingNote()}
        <label>תעודת זהות</label>
        <input name="tz" inputmode="numeric" value="${esc(state.prefill.tz || "")}" required />
        <label>נייד</label>
        <input name="phone" inputmode="tel" value="${esc(state.prefill.phone || "")}" required />
        <p class="error">${textHtml(state.error)}</p>
        <button class="ghost" type="button" data-phone-help>הטלפון שלי לא מעודכן</button>
        ${state.phoneHelp ? `<p>${textHtml(DESK_PHONE_HELP)}</p>` : ""}
        <button class="primary" type="submit">כניסה</button>
      </form>
    </main>`;
}

function careerHtml() {
  const sms = state.career && state.career.demoCode ? `
    <div class="sms">
      <div>SMS אל ${esc(state.career.maskedPhone)}</div>
      <strong class="num">${esc(state.career.demoCode)}</strong>
      <div>הדמיית הודעה. במערכת אמיתית הקוד לא חוזר למסך.</div>
      <button class="ghost" type="button" data-fill-code="${esc(state.career.demoCode)}">הכנס את הקוד</button>
    </div>` : "";
  return `
    <main class="narrow">
      <form class="panel" id="career-form">
        <button class="ghost" type="button" data-go="#/">חזרה</button>
        <h1>כניסת חייל קבע</h1>
        <p>4 הספרות האחרונות של הת״ז, ואז קוד שנשלח לנייד.</p>
        ${incomingNote()}
        <label>4 ספרות אחרונות</label>
        <input name="last4" inputmode="numeric" maxlength="4" value="${esc(state.prefill.last4 || "")}" required />
        <div class="row-actions"><button class="ghost" type="button" data-send-code>שליחת קוד</button></div>
        ${sms}
        <label>קוד מהטלפון</label>
        <input name="code" inputmode="numeric" />
        <p class="error">${textHtml(state.error)}</p>
        <button class="ghost" type="button" data-phone-help>הטלפון שלי לא מעודכן</button>
        ${state.phoneHelp ? `<p>${textHtml(DESK_PHONE_HELP)}</p>` : ""}
        <button class="primary" type="submit">כניסה</button>
      </form>
    </main>`;
}

function staffHtml() {
  return `
    <main class="narrow">
      <form class="panel" id="staff-form">
        <button class="ghost" type="button" data-go="#/">חזרה</button>
        <h1>כניסת צוות</h1>
        <p>נציג: rep / rep<br>מפקד: cmd / cmd</p>
        <label>משתמש</label>
        <input name="username" value="${esc(state.prefill.username || "")}" required />
        <label>סיסמה</label>
        <input name="password" type="password" value="${esc(state.prefill.password || "")}" required />
        <p class="error">${esc(state.error)}</p>
        <div class="row-actions">
          <button class="primary" type="submit">כניסה</button>
          <button class="ghost" type="button" data-staff="rep">מלא נציג</button>
          <button class="ghost" type="button" data-staff="cmd">מלא מפקד</button>
        </div>
      </form>
    </main>`;
}

function incomingNote() {
  const incoming = readIncoming();
  if (!incoming) return "";
  return `<p class="incoming">האתר החזיר: ${esc(incomingLabel(incoming.status))}. אחרי הכניסה תיפתח בקשה ליומיים.</p>`;
}

function composerHtml() {
  const dis = state.busy ? "disabled" : "";
  if (state.pending && state.pending.step === "gap_form") {
    const fields = state.pending.fields || [];
    const inputs = fields.map((field) => `<input name="${esc(field.key)}" inputmode="decimal" placeholder="${esc(field.label)}" ${dis} />`).join("");
    return `
      <form class="composer gap-form" id="gap-form">
        <label>צילום מסך של יתרה ודוח תנועות<input type="file" name="shot" accept="image/png,image/jpeg,image/webp" ${dis} /></label>
        ${inputs}
        <button class="primary" type="submit" ${dis}>שליחה למפקד</button>
      </form>`;
  }
  if (state.pending && state.pending.step === "rep_form") {
    return `
      <form class="composer extra-form" id="rep-form">
        <input name="personalNumber" placeholder="מ.א. אם יש" ${dis} />
        <input name="tz" inputmode="numeric" placeholder="ת״ז אם אין מ.א." ${dis} />
        <input name="phone" inputmode="tel" placeholder="טלפון מעודכן במערכת" ${dis} />
        <textarea name="explanation" placeholder="הסבר מלא על הפנייה" ${dis}>${esc(state.pending.draft || "")}</textarea>
        <button class="primary" type="submit" ${dis}>פתיחת פנייה לנציג</button>
      </form>`;
  }
  if (state.pending && state.pending.step === "phone_form") {
    return `
      <form class="composer extra-form" id="phone-form">
        <input name="phone" inputmode="tel" placeholder="המספר החדש אחרי מיטב" ${dis} />
        <button class="primary" type="submit" ${dis}>פתיחת פנייה</button>
      </form>`;
  }
  return `
    <form class="composer" id="composer">
      <input id="msg" placeholder="כתוב שאלה" autocomplete="off" ${state.busy ? "disabled" : ""} />
      <button class="primary" type="submit">שליחה</button>
    </form>`;
}

function blockHtml(block) {
  if (block.type === "text") return `<div class="bubble">${textHtml(block.text)}</div>`;
  if (block.type === "choices") {
    return `<div class="choices">${block.items.map((item) => `<button type="button" data-choice="${esc(item.id)}" data-label="${esc(item.label)}">${esc(item.label)}</button>`).join("")}</div>`;
  }
  if (block.type === "balance") {
    const rows = block.lines.map((line) => `<tr><td>${esc(line.name)}</td><td class="num">${money(line.amount)}</td></tr>`).join("");
    return `<div class="sheet"><strong>היתרה באתר</strong><table><tbody>${rows}<tr><td>סה״כ</td><td class="num">${money(block.total)}</td></tr></tbody></table></div>`;
  }
  if (block.type === "compare") {
    const rows = block.rows.map((row) => `<tr><td>${esc(row.name)}</td><td class="num">${money(row.sap)}</td><td class="num">${money(row.card)}</td><td class="num">${money(row.gap)}</td></tr>`).join("");
    return `<div class="sheet"><strong>השוואה</strong><table><thead><tr><th>סעיף</th><th>סא״פ</th><th>אתר</th><th>פער</th></tr></thead><tbody>${rows}</tbody></table><p>${esc(block.note || "")}</p></div>`;
  }
  if (block.type === "ticket") {
    const ticket = block.ticket;
    return `<div class="receipt"><strong>פנייה ${esc(ticket.id)}</strong><div>${esc(ticket.title)}</div><div>סטטוס: ${esc(statusLabel(ticket.status))} · ${esc(routeLabel(ticket.route))}</div>${ticket.expectedAt ? `<div>צפי: ${hebDate(ticket.expectedAt)}</div>` : ""}</div>`;
  }
  if (block.type === "trace") {
    const lines = block.calls.map((call) => `<div><code>${esc(call.method)} ${esc(call.url)}</code></div>`).join("");
    return `<details class="trace"><summary>הבקשות שנשלחו</summary>${lines}</details>`;
  }
  return "";
}

function chatHtml() {
  const soldier = state.soldier;
  const mine = state.tickets.filter((ticket) => ticket.soldier.tz === soldier.tz);
  return `
    <section class="chat-main">
      <header class="chat-head">
        <div><strong>${esc(soldier.firstName)} ${esc(soldier.lastName)}</strong><div>${esc(soldier.serviceType)} · ${esc(soldier.tz)}</div></div>
        <button class="ghost" type="button" data-logout="soldier">יציאה</button>
      </header>
      <div class="log" id="log">
        ${state.messages.map((message) => {
          if (message.from === "user") return `<div class="msg user"><div class="bubble">${textHtml(message.text)}</div></div>`;
          if (message.from === "staff") return `<div class="msg agent"><div class="bubble"><b>${esc(message.author)}</b>\n${textHtml(message.text)}</div></div>`;
          return `<div class="msg agent">${blockHtml(message.block)}</div>`;
        }).join("")}
        ${state.busy ? `<div class="typing">בודק…</div>` : ""}
      </div>
      ${composerHtml()}
    </section>
    <aside class="side">
      <div class="side-head"><strong>הפניות שלי</strong></div>
      <div class="side-body">
        ${mine.length ? mine.map((ticket) => `<div class="mini"><b>${esc(ticket.id)}</b> · ${esc(ticket.title)}<br>${esc(statusLabel(ticket.status))}${ticket.expectedAt ? ` · עד ${hebDate(ticket.expectedAt)}` : ""}</div>`).join("") : "<p>עוד אין פניות.</p>"}
        <p class="trace">שאלת יתרה מסבירה איך נכנסים לאתר. פער ביתרה נפתח למפקד מצילום מסך.</p>
      </div>
    </aside>`;
}

function statusLabel(status) {
  return { open: "פתוחה", in_progress: "בטיפול", closed: "נסגרה" }[status] || status;
}
function routeLabel(route) {
  return { system: "בקשת מערכת", rep: "נציג", commander: "מפקד" }[route] || route;
}

function queueHtml() {
  const staff = state.staff;
  const tabs = staff.role === "commander"
    ? `<div class="tabs"><button class="on">למפקד</button></div>`
    : `<div class="tabs">
        <button data-queue="rep" class="${state.queueName === "rep" ? "on" : ""}">פניות אליי</button>
        <button data-queue="system" class="${state.queueName === "system" ? "on" : ""}">בקשות טיפול</button>
      </div>`;
  const list = state.tickets.map((ticket) => `
    <button class="item" data-ticket="${esc(ticket.id)}">
      <b>${esc(ticket.id)} · ${esc(ticket.soldier.firstName)} ${esc(ticket.soldier.lastName)}</b>
      <div>${esc(ticket.title)}</div>
      <span class="tag ${esc(ticket.route)}">${esc(statusLabel(ticket.status))}</span>
    </button>`).join("") || `<p style="padding:12px;">אין פריטים בתור.</p>`;
  const ticket = state.tickets.find((item) => item.id === state.activeId);
  return `
    <aside class="queue-list">
      <div class="chat-head"><div><strong>${esc(staff.name)}</strong><div>${esc(staff.title)}</div></div><button class="ghost" data-logout="staff">יציאה</button></div>
      ${tabs}
      ${list}
    </aside>
    <section class="detail">${ticket ? ticketDetail(ticket) : "<p>בחר פנייה.</p>"}</section>`;
}

function ticketDetail(ticket) {
  const comparison = ticket.comparison && ticket.comparison.length ? `
    <table><thead><tr><th>סעיף</th><th>סא״פ</th><th>אתר</th><th>פער</th></tr></thead><tbody>
      ${ticket.comparison.map((row) => `<tr><td>${esc(row.name)}</td><td class="num">${money(row.sap)}</td><td class="num">${money(row.card)}</td><td class="num">${money(row.gap)}</td></tr>`).join("")}
    </tbody></table>` : "";
  const context = ticket.context ? `<pre class="trace">${esc(JSON.stringify(ticket.context, null, 2))}</pre>` : "";
  const shot = ticket.attachment ? `<p><img class="shot" src="/uploads/${esc(ticket.attachment)}" alt="צילום מסך של היתרה" /></p>` : "";
  const messages = ticket.messages.map((message) => `<div class="mini"><b>${esc(message.author || message.from)}</b><br>${textHtml(message.text)}</div>`).join("");
  let actions = "";
  if (state.staff.role === "rep" && ticket.route === "rep" && ticket.status !== "closed") {
    actions = `<form class="reply" id="reply-form"><textarea name="text" placeholder="תשובה לחייל"></textarea><div class="row-actions"><button class="primary" type="submit">שליחה לחייל</button><button class="ghost" type="button" data-escalate="${esc(ticket.id)}">העברה למפקד</button><button class="ghost" type="button" data-close="${esc(ticket.id)}">סגירה</button></div></form>`;
  } else if (state.staff.role === "rep" && ticket.route === "system" && ticket.status !== "closed") {
    actions = `<button class="ghost" type="button" data-close="${esc(ticket.id)}">סמן כטופל</button>`;
  } else if (state.staff.role === "commander" && ticket.route === "commander" && ticket.status !== "closed") {
    actions = `<form class="reply" id="decide-form"><textarea name="text" placeholder="נימוק"></textarea><div class="row-actions"><button class="primary" type="submit" data-decision="approve">אישור</button><button class="ghost" type="submit" data-decision="reject">דחייה</button></div></form>`;
  }
  return `
    <h2>${esc(ticket.id)} · ${esc(ticket.title)}</h2>
    <p>${esc(ticket.soldier.firstName)} ${esc(ticket.soldier.lastName)} · ${esc(ticket.soldier.serviceType)} · <span class="num">${esc(ticket.soldier.tz)}</span></p>
    <p><span class="tag ${esc(ticket.route)}">${esc(routeLabel(ticket.route))}</span> ${esc(statusLabel(ticket.status))} ${ticket.expectedAt ? `· צפי ${hebDate(ticket.expectedAt)}` : ""}</p>
    <p><strong>בקשת שינוי:</strong> ${esc(ticket.changeRequest || "—")}</p>
    ${shot}
    ${comparison}
    ${context}
    <div class="side-body">${messages}</div>
    ${actions}`;
}

function scrollLog() {
  const log = document.getElementById("log");
  if (log) log.scrollTop = log.scrollHeight;
}

async function render() {
  const hash = location.hash || "#/";
  const app = document.getElementById("app");
  if (hash === "#/" || hash === "") {
    app.innerHTML = homeHtml();
    return;
  }
  if (hash === "#/sadir") {
    app.innerHTML = conscriptHtml();
    return;
  }
  if (hash === "#/keva") {
    app.innerHTML = careerHtml();
    return;
  }
  if (hash === "#/staff") {
    app.innerHTML = staffHtml();
    return;
  }
  if (hash === "#/chat") {
    if (!state.soldier) return go("#/");
    app.className = "";
    document.getElementById("app").innerHTML = `<div class="chat-shell">${chatHtml()}</div>`;
    scrollLog();
    const input = document.getElementById("msg");
    if (input) input.focus();
    return;
  }
  if (hash === "#/rep" || hash === "#/commander") {
    if (!state.staff) return go("#/staff");
    if (hash === "#/commander" && state.staff.role !== "commander") return go("#/staff");
    if (hash === "#/rep" && state.staff.role !== "rep") return go("#/staff");
    await loadQueue();
    if ((location.hash || "") !== hash) return;
    app.innerHTML = `<div class="queue">${queueHtml()}</div>`;
  }
}

async function loadQueue() {
  const queue = state.staff.role === "commander" ? "commander" : state.queueName;
  try {
    state.tickets = await DeskApi.tickets(`?queue=${queue}`);
    if (!state.tickets.some((ticket) => ticket.id === state.activeId)) {
      state.activeId = state.tickets[0] ? state.tickets[0].id : "";
    }
  } catch (error) {
    state.tickets = [];
    if (error.status === 401 || error.status === 403) {
      state.staff = null;
      sessionStorage.removeItem("staff_token");
      save();
      go("#/staff");
      return;
    }
    state.error = error.message;
  }
}

async function refreshSoldierTickets() {
  if (!state.soldier) return;
  try {
    state.tickets = await DeskApi.tickets(`?tz=${state.soldier.tz}`);
  } catch (error) {
    state.tickets = [];
  }
}

async function enterChat(soldier) {
  state.soldier = soldier;
  state.messages = [];
  state.pending = null;
  state.seen = {};
  state.error = "";
  const incoming = readIncoming();
  const matches = incoming && (!incoming.tz || incoming.tz === soldier.tz);
  const result = matches
    ? await Agent.respond({ event: "incoming_error", soldier, cardStatus: incoming.status })
    : await Agent.respond({ event: "welcome", soldier });
  if (matches) sessionStorage.removeItem("incoming_card");
  state.pending = result.pending;
  result.blocks.forEach((block) => state.messages.push({ from: "agent", block }));
  save();
  await refreshSoldierTickets();
  go("#/chat");
  await pullReplies();
}

async function sendChat(text, choiceId, extra) {
  if (state.busy || (!text && !choiceId)) return;
  state.busy = true;
  if (text) state.messages.push({ from: "user", text });
  save();
  render();
  const result = await Agent.respond({
    soldier: state.soldier,
    text,
    choiceId,
    pending: state.pending,
    gap: extra && extra.gap,
    rep: extra && extra.rep,
    phoneUpdate: extra && extra.phoneUpdate,
  });
  state.pending = result.pending;
  result.blocks.forEach((block) => {
    if (block.type === "ticket") state.seen[block.ticket.id] = block.ticket.messages.length;
    state.messages.push({ from: "agent", block });
  });
  state.busy = false;
  save();
  await refreshSoldierTickets();
  render();
}

async function pullReplies() {
  if (location.hash !== "#/chat" || !state.soldier) return;
  let list;
  try {
    list = await DeskApi.tickets(`?tz=${state.soldier.tz}`);
  } catch (error) {
    return;
  }
  state.tickets = list;
  let added = false;
  list.forEach((ticket) => {
    const seen = state.seen[ticket.id];
    const start = seen === undefined ? 0 : seen;
    ticket.messages.slice(start).forEach((message) => {
      if (message.from === "rep" || message.from === "commander") {
        state.messages.push({ from: "staff", author: message.author || "צוות", text: message.text });
        added = true;
      }
    });
    state.seen[ticket.id] = ticket.messages.length;
  });
  if (added) {
    save();
    render();
  }
}

document.body.addEventListener("click", async (event) => {
  const goBtn = event.target.closest("[data-go]");
  if (goBtn) {
    state.error = "";
    state.phoneHelp = false;
    if (goBtn.dataset.go === "#/sadir" || goBtn.dataset.go === "#/keva" || goBtn.dataset.go === "#/staff") {
      state.prefill = {};
      state.career = null;
    }
    go(goBtn.dataset.go);
    return;
  }
  if (event.target.closest("[data-incoming]")) {
    const incoming = readIncoming();
    const account = state.accounts.find((item) => item.tz === (incoming && incoming.tz));
    if (!account) return;
    if (account.serviceType === "סדיר") {
      state.prefill = { tz: account.tz, phone: account.phone };
      go("#/sadir");
    } else {
      state.prefill = { last4: account.last4 };
      state.career = null;
      go("#/keva");
    }
    return;
  }
  if (event.target.closest("[data-phone-help]")) {
    const careerForm = document.getElementById("career-form");
    const conscriptForm = document.getElementById("conscript-form");
    if (careerForm && careerForm.last4) state.prefill.last4 = careerForm.last4.value;
    if (conscriptForm) state.prefill = { tz: conscriptForm.tz.value, phone: conscriptForm.phone.value };
    state.phoneHelp = !state.phoneHelp;
    render();
    return;
  }
  const accountBtn = event.target.closest("[data-account]");
  if (accountBtn) {
    const account = state.accounts.find((item) => item.tz === accountBtn.dataset.account);
    if (!account) return;
    if (account.serviceType === "סדיר") {
      state.prefill = { tz: account.tz, phone: account.phone };
      go("#/sadir");
    } else {
      state.prefill = { last4: account.last4 };
      state.career = null;
      go("#/keva");
    }
    return;
  }
  const staffFill = event.target.closest("[data-staff]");
  if (staffFill) {
    state.prefill = staffFill.dataset.staff === "cmd"
      ? { username: "cmd", password: "cmd" }
      : { username: "rep", password: "rep" };
    render();
    return;
  }
  if (event.target.closest("[data-send-code]")) {
    const form = document.getElementById("career-form");
    state.error = "";
    try {
      const result = await IdfApi.careerCode(form.last4.value);
      state.career = result;
      state.prefill.last4 = form.last4.value;
      render();
    } catch (error) {
      state.error = withPhoneHelp(error.message);
      render();
    }
    return;
  }
  const fillCode = event.target.closest("[data-fill-code]");
  if (fillCode) {
    const input = document.querySelector("[name=code]");
    if (input) input.value = fillCode.dataset.fillCode;
    return;
  }
  const choice = event.target.closest("[data-choice]");
  if (choice) {
    sendChat(choice.dataset.label, choice.dataset.choice);
    return;
  }
  const logout = event.target.closest("[data-logout]");
  if (logout) {
    if (logout.dataset.logout === "soldier") {
      state.soldier = null;
      state.messages = [];
      state.pending = null;
      state.seen = {};
      state.phoneHelp = false;
    } else {
      state.staff = null;
      sessionStorage.removeItem("staff_token");
    }
    save();
    go("#/");
    return;
  }
  const queue = event.target.closest("[data-queue]");
  if (queue) {
    state.queueName = queue.dataset.queue;
    state.activeId = "";
    render();
    return;
  }
  const ticketBtn = event.target.closest("[data-ticket]");
  if (ticketBtn) {
    state.activeId = ticketBtn.dataset.ticket;
    render();
    return;
  }
  const escalate = event.target.closest("[data-escalate]");
  if (escalate) {
    await DeskApi.escalate(escalate.dataset.escalate);
    render();
    return;
  }
  const close = event.target.closest("[data-close]");
  if (close) {
    await DeskApi.close(close.dataset.close);
    render();
    return;
  }
});

document.body.addEventListener("submit", async (event) => {
  const form = event.target;
  if (form.id === "api-form") {
    event.preventDefault();
    IdfApi.setBase(document.getElementById("api-base").value);
    state.apiDraft = IdfApi.base();
    await loadHome();
    render();
    return;
  }
  if (form.id === "conscript-form") {
    event.preventDefault();
    state.error = "";
    try {
      const soldier = await IdfApi.conscript(form.tz.value, form.phone.value);
      await enterChat(soldier);
    } catch (error) {
      state.error = withPhoneHelp(error.message);
      state.prefill = { tz: form.tz.value, phone: form.phone.value };
      render();
    }
    return;
  }
  if (form.id === "career-form") {
    event.preventDefault();
    state.error = "";
    try {
      const soldier = await IdfApi.careerVerify(form.last4.value, form.code.value);
      await enterChat(soldier);
    } catch (error) {
      state.error = withPhoneHelp(error.message);
      state.prefill.last4 = form.last4.value;
      render();
    }
    return;
  }
  if (form.id === "staff-form") {
    event.preventDefault();
    state.error = "";
    try {
      const staff = await DeskApi.staffLogin(form.username.value, form.password.value);
      sessionStorage.setItem("staff_token", staff.token);
      state.staff = staff;
      state.queueName = staff.role === "commander" ? "commander" : "rep";
      save();
      go(staff.role === "commander" ? "#/commander" : "#/rep");
    } catch (error) {
      state.error = error.message;
      render();
    }
    return;
  }
  if (form.id === "composer") {
    event.preventDefault();
    const input = document.getElementById("msg");
    const text = input.value.trim();
    input.value = "";
    sendChat(text, "");
    return;
  }
  if (form.id === "gap-form") {
    event.preventDefault();
    const file = form.shot.files && form.shot.files[0];
    const values = {};
    [...form.elements].forEach((el) => {
      if (el.name && el.name !== "shot") values[el.name] = el.value;
    });
    const fields = (state.pending && state.pending.fields) || [];
    const summary = fields.map((field) => `${field.label} ${values[field.key] || "—"}`).join(", ");
    const gap = { values, fileName: file ? file.name : "", attachment: "" };
    if (!file) {
      sendChat("פער ביתרה", "gap_submit", { gap });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      gap.attachment = String(reader.result || "");
      sendChat(`צילום מסך (${gap.fileName})\n${summary}`, "gap_submit", { gap });
    };
    reader.readAsDataURL(file);
    return;
  }
  if (form.id === "rep-form") {
    event.preventDefault();
    const rep = {
      personalNumber: form.personalNumber.value.trim(),
      tz: form.tz.value.trim(),
      phone: form.phone.value.trim(),
      explanation: form.explanation.value.trim(),
    };
    const who = rep.personalNumber ? `מ.א. ${rep.personalNumber}` : `ת״ז ${rep.tz || "—"}`;
    sendChat(`${who}\nטלפון ${rep.phone}\n${rep.explanation}`, "rep_submit", { rep });
    return;
  }
  if (form.id === "phone-form") {
    event.preventDefault();
    const phone = form.phone.value.trim();
    sendChat(`המספר החדש ${phone}`, "phone_submit", { phoneUpdate: { phone } });
    return;
  }
  if (form.id === "reply-form") {
    event.preventDefault();
    await DeskApi.reply(state.activeId, form.text.value);
    render();
    return;
  }
  if (form.id === "decide-form") {
    event.preventDefault();
    const decision = event.submitter && event.submitter.dataset.decision === "reject" ? "reject" : "approve";
    await DeskApi.decide(state.activeId, decision, form.text.value);
    render();
  }
});

async function loadHome() {
  try {
    state.health = await IdfApi.health();
    state.accounts = await IdfApi.accounts();
  } catch (error) {
    state.health = null;
    state.accounts = [];
  }
}

window.addEventListener("hashchange", render);
captureIncoming();
restore();
loadHome().then(() => render()).catch((error) => {
  const app = document.getElementById("app");
  if (app) app.textContent = String(error && error.stack ? error.stack : error);
});
setInterval(pullReplies, 4000);
refreshSoldierTickets().then(() => {
  if ((location.hash || "") === "#/chat") render();
});
