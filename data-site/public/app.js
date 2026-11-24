function supportOrigin() {
  if (location.port === "4000") return `${location.protocol}//${location.hostname}:3000`;
  return location.origin;
}
const state = {
  list: [],
  query: "",
  service: "all",
  range: { from: "2026-10-01", to: "2026-10-31" },
  redirectFor: "",
};

function supportUrl(card) {
  if (!card || card.cardStatus === "ok") return supportOrigin();
  return `${supportOrigin()}/?cardStatus=${encodeURIComponent(card.cardStatus)}&tz=${encodeURIComponent(card.tz)}`;
}

function money(value) {
  return Number(value || 0).toLocaleString("he-IL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function hebDate(iso) {
  if (!iso) return "—";
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
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
function phoneFmt(phone) {
  return phone && phone.length === 10 ? `${phone.slice(0, 3)}-${phone.slice(3)}` : phone || "—";
}
function nameOf(person) {
  return `${person.firstName} ${person.lastName}`;
}
function parseHash() {
  const parts = (location.hash || "#/").replace(/^#\/?/, "").split("/").filter(Boolean);
  return { page: parts[0] || "hub", id: parts[1] || "" };
}

function shell(page, body) {
  return `
    <header class="top">
      <div class="top-row">
        <h1 class="brand">מקור נתונים<span>סא״פ, אתר הכוכבים ואתר הנקודות · נתונים פיקטיביים, בלי חיבור לצה״ל</span></h1>
        <div class="demo-pill">דמו להחלפת API</div>
      </div>
      <nav class="nav">
        <a href="#/" class="${page === "hub" ? "active" : ""}">סקירה</a>
        <a href="#/sap" class="${page === "sap" ? "active" : ""}">סא״פ</a>
        <a href="#/stars" class="${page === "stars" ? "active" : ""}">כוכבים / נקודות</a>
      </nav>
    </header>
    <main class="wrap">${body}</main>`;
}

function hubHtml() {
  return `
    <p class="lead">שני המקורות שהמוקד קורא להם.</p>
    <p class="quiet">כשמחברים מערכת אמיתית לא מחליפים את המוקד. במוקד מחליפים רק את כתובת ה-API, והנתיבים נשארים באותה צורה.</p>
    <div class="grid-2" style="margin: 16px 0;">
      <a class="panel" href="#/sap"><h2>סא״פ</h2><p>20 חיילים עם פרטים אישיים, יתרות שהסא״פ קובע, וזכאות למדים.</p></a>
      <a class="panel" href="#/stars"><h2>אתר הכוכבים / הנקודות</h2><p>מה שהחייל רואה: ת״ז, שם, יתרה ותנועות. לחובה הכותרת היא כוכבים. לקבע הכותרת היא נקודות, ויתרת הספורט היא ספורשיות.</p></a>
    </div>
    <section class="panel">
      <h2>הבקשות</h2>
      ${[
        ["GET", "/api/health"],
        ["GET", "/api/soldiers"],
        ["GET", "/api/demo-accounts"],
        ["GET", "/api/soldiers/:tz/sap"],
        ["GET", "/api/soldiers/:tz/card"],
        ["POST", "/api/auth/conscript"],
        ["POST", "/api/auth/career/code"],
        ["POST", "/api/auth/career/verify"],
      ].map(([method, path]) => `<div class="endpoint"><strong>${method}</strong><code>${path}</code></div>`).join("")}
      <p class="quiet" style="margin-top:12px;">המוקד רץ בכתובת <a href="${supportOrigin()}">${supportOrigin()}</a></p>
    </section>`;
}

function filtered() {
  const q = state.query.trim();
  return state.list.filter((soldier) => {
    const hay = `${soldier.firstName} ${soldier.lastName} ${soldier.tz} ${soldier.role} ${soldier.scenario} ${soldier.phone}`;
    const serviceOk = state.service === "all" || soldier.serviceType === state.service;
    return serviceOk && (!q || hay.includes(q));
  });
}

function sapList() {
  const rows = filtered().map((soldier) => `
    <tr class="clickable" data-href="#/sap/${soldier.tz}">
      <td>${esc(nameOf(soldier))}</td>
      <td class="num">${esc(soldier.tz)}</td>
      <td>${esc(soldier.serviceType)}</td>
      <td>${esc(soldier.gender)}</td>
      <td>${esc(soldier.age)}</td>
      <td>${esc(soldier.role)}</td>
      <td>${esc(soldier.activityLevel)}</td>
      <td>${esc(soldier.combatStatus)}</td>
      <td><span class="tag ${esc(soldier.tone)}">${esc(soldier.cardStatusLabel)}</span></td>
      <td>${esc(soldier.scenario)}</td>
    </tr>`).join("");
  return `
    <div class="toolbar">
      <input id="q" placeholder="חיפוש לפי שם, ת״ז או תפקיד" value="${esc(state.query)}" />
    </div>
    <div class="toolbar">
      ${["all", "סדיר", "קבע"].map((item) => `<button data-service="${item}" class="${state.service === item ? "btn-balance" : ""}">${item === "all" ? "הכל" : item}</button>`).join("")}
    </div>
    <table>
      <thead><tr><th>שם</th><th>ת״ז</th><th>שירות</th><th>מין</th><th>גיל</th><th>תפקיד</th><th>רמת פעילות</th><th>לוחם / תומך</th><th>כרטיס</th><th>תרחיש</th></tr></thead>
      <tbody id="rows">${rows || `<tr><td colspan="10">אין תוצאות</td></tr>`}</tbody>
    </table>`;
}

function fact(label, value) {
  return `<div class="fact"><span>${label}</span><strong>${esc(value || "—")}</strong></div>`;
}

function walletTable(lines, gaps) {
  const gapIds = new Set((gaps || []).map((row) => row.id));
  const body = lines.map((line) => `
    <tr class="${gapIds.has(line.id) ? "gap-row" : ""}">
      <td>${esc(line.name)}</td>
      <td class="num">${money(line.amount)}</td>
    </tr>`).join("");
  const total = lines.reduce((sum, line) => sum + Number(line.amount || 0), 0);
  return `<table class="balance"><tbody>${body}<tr class="total"><td>סה״כ יתרה</td><td class="num">${money(total)}</td></tr></tbody></table>`;
}

async function renderSapProfile(tz) {
  document.getElementById("app").innerHTML = shell("sap", `<p class="quiet">מושך את תיק הסא״פ ואת כרטיס הכוכבים או הנקודות…</p>`);
  const [sapRes, cardRes] = await Promise.all([
    fetch(`/api/soldiers/${tz}/sap`),
    fetch(`/api/soldiers/${tz}/card`),
  ]);
  if (!sapRes.ok) {
    document.getElementById("app").innerHTML = shell("sap", `<p>החייל לא נמצא בסא״פ.</p>`);
    return;
  }
  const sap = await sapRes.json();
  const card = await cardRes.json();
  const gaps = card.cardStatus === "ok" ? Policy.diffLines(sap.entitlements, card.lines) : [];
  const uniform = sap.serviceType === "קבע" ? Policy.evaluateUniform(sap) : null;
  const contract = sap.contract ? `${sap.contract.label} · ${hebDate(sap.contract.from)} עד ${hebDate(sap.contract.to)}` : "—";
  document.getElementById("app").innerHTML = shell("sap", `
    <a class="back" href="#/sap">חזרה לרשימה</a>
    <div class="profile-head">
      <h2>${esc(nameOf(sap))}</h2>
      <span class="tag ${gaps.length ? "gap" : "ok"}">${gaps.length ? `פער ב-${gaps.length} סעיפים` : "יתרות תואמות"}</span>
    </div>
    <div class="facts">
      ${fact("ת״ז", sap.tz)}
      ${fact("נייד", phoneFmt(sap.phone))}
      ${fact("מין", sap.gender)}
      ${fact("גיל", String(sap.age))}
      ${fact("סוג שירות", sap.serviceType)}
      ${fact("דרגה", sap.rank)}
      ${fact("גיוס מיועד", hebDate(sap.plannedEnlistment))}
      ${fact("גיוס בפועל", hebDate(sap.actualEnlistment))}
      ${fact("שחרור / תום התחייבות", hebDate(sap.releaseDate))}
      ${fact("תפקיד", sap.role)}
      ${fact("רמת פעילות", sap.activityLevel)}
      ${fact("לוחם / תומך / לא לוחם", sap.combatStatus)}
      ${fact("חתימת קבע", contract)}
    </div>
    <div class="wallets">
      <section class="wallet">
        <h3>מה שהסא״פ קובע</h3>
        <p class="quiet">החייל לא רואה את המסך הזה. זו הזכאות.</p>
        ${walletTable(sap.entitlements, gaps)}
      </section>
      <section class="wallet">
        <h3>מה שנמשך מאתר הכוכבים או הנקודות</h3>
        <p class="quiet">קריאה נפרדת אל <span class="num">/card</span>. ${esc(card.cardStatusLabel)}</p>
        ${card.cardStatus === "ok" ? walletTable(card.lines, gaps) : `<div class="error-box">${esc(card.cardStatusLabel)}</div>`}
        <p><a class="back" href="#/stars/${esc(sap.tz)}">לפתוח את מסך הכוכבים או הנקודות של החייל</a></p>
      </section>
    </div>
    ${uniform ? `<section class="rule"><strong>${esc(uniform.title)}</strong>\n${esc(uniform.detail)}</section>` : ""}
  `);
}

function starsPick() {
  const items = state.list.map((soldier) => `
    <a href="#/stars/${soldier.tz}">
      <strong>${esc(nameOf(soldier))}</strong>
      <small>${esc(soldier.serviceType)} · ${esc(soldier.scenario)}</small>
    </a>`).join("");
  return `<div class="stars-layout"><section class="stage"><p class="quiet">בחר חייל כדי לראות את המסך שהוא רואה.</p></section><aside class="picker">${items}</aside></div>`;
}

function txRows(card) {
  const rows = (card.transactions || []).filter((tx) => tx.date >= state.range.from && tx.date <= state.range.to);
  if (!rows.length) return `<tr><td colspan="9">אין תנועות בטווח</td></tr>`;
  return rows.map((tx) => `
    <tr>
      <td class="num">${esc(tx.orderId)}</td>
      <td class="num">${esc(tx.multipass)}</td>
      <td>${esc(tx.action)}</td>
      <td class="num">${esc(tx.time)}</td>
      <td class="num">${hebDate(tx.date)}</td>
      <td class="num">${money(tx.amount)}</td>
      <td>${esc(tx.pointType)}</td>
      <td>${esc(tx.chain)}</td>
      <td>${esc(tx.store)}</td>
    </tr>`).join("");
}

function phoneHtml(card) {
  const career = card.serviceType === "קבע";
  const title = career ? "נקודות" : "כוכבים";
  const sport = career ? "ספורשיות" : "נקודות ספורט";
  const note = career
    ? "זוהי מערכת להצגת מצב הנקודות. לדוח תנועות בוחרים תאריכים ולוחצים על הצג יתרה."
    : "זוהי מערכת להצגת מצב הכוכבים. לדוח תנועות בוחרים תאריכים ולוחצים על הצג יתרה.";
  const broken = card.cardStatus === "no_card" || card.cardStatus === "bad_data";
  const body = card.cardStatus === "ok"
    ? `<h3 class="section-title">היתרה שלי</h3>${walletTable(card.lines)}
       <h3 class="section-title">תנועות אחרונות</h3>
       <div class="scroll-x"><table class="moves"><thead><tr>
         <th>מספר הזמנה</th><th>מספר מולטיפאס</th><th>סוג פעולה</th><th>שעה</th><th>תאריך</th><th>סכום</th><th>סוג יתרה</th><th>שם הרשת</th><th>שם החנות</th>
       </tr></thead><tbody>${txRows(card)}</tbody></table></div>`
    : `<div class="error-box">${esc(card.cardStatusLabel)}<p>מעבירים למוקד עם הסטטוס הזה.</p><a href="${esc(supportUrl(card))}">אם לא עברת, פתח את המוקד</a></div>`;
  return `
    <article class="phone">
      <div class="banner">
        <svg class="mark" viewBox="0 0 64 64" aria-hidden="true"><polygon points="32,4 39,24 60,24 43,36 50,58 32,44 14,58 21,36 4,24 25,24" fill="#f2d48a"/></svg>
        <p>כרטיס הקניות הדיגיטלי</p>
        <h2>${title}</h2>
      </div>
      <div class="mp-nav"><span>יציאה</span><span>רשימות</span><span class="on">יתרה ודוח תנועות</span><span>אישור תקנון</span></div>
      <div class="hello"><span>שלום ל: ${esc(nameOf(card))}</span><span>ת״ז ${esc(card.tz)}</span></div>
      <div class="hello"><span>תקנון: ${esc(card.regulation)}</span><span>${esc(sport)}</span></div>
      <p class="note">${note}</p>
      <div class="dates">
        <label>מתאריך<input type="date" id="from" value="${esc(state.range.from)}" /></label>
        <label>עד תאריך<input type="date" id="to" value="${esc(state.range.to)}" /></label>
      </div>
      <div class="center"><button class="btn-balance" data-filter="${esc(card.tz)}">הצג יתרה</button></div>
      ${body}
      <div class="foot"><b>MULTIPASS</b><div>דמו · מולטיפאס · 2026</div><a href="${esc(broken ? supportUrl(card) : supportOrigin())}">מוקד השירות</a></div>
    </article>
    <details class="raw"><summary>מה חזר מה-API של הכרטיס</summary><pre>${esc(JSON.stringify(card, null, 2))}</pre></details>`;
}

async function renderCard(tz) {
  const items = state.list.map((soldier) => `
    <a class="${soldier.tz === tz ? "active" : ""}" href="#/stars/${soldier.tz}">
      <strong>${esc(nameOf(soldier))}</strong>
      <small>${esc(soldier.serviceType)} · ${esc(soldier.scenario)}</small>
    </a>`).join("");
  document.getElementById("app").innerHTML = shell("stars", `<div class="stars-layout"><section class="stage"><p class="quiet">מושך כרטיס…</p></section><aside class="picker">${items}</aside></div>`);
  const response = await fetch(`/api/soldiers/${tz}/card`);
  const card = await response.json();
  if (!response.ok) {
    document.getElementById("app").innerHTML = shell("stars", `<p>${esc(card.error || "לא נמצא")}</p>`);
    return;
  }
  document.getElementById("app").innerHTML = shell("stars", `
    <div class="stars-layout">
      <section class="stage">${phoneHtml(card)}</section>
      <aside class="picker">${items}</aside>
    </div>`);
  if ((card.cardStatus === "no_card" || card.cardStatus === "bad_data") && state.redirectFor !== `${card.tz}:${card.cardStatus}`) {
    state.redirectFor = `${card.tz}:${card.cardStatus}`;
    const target = supportUrl(card);
    const expected = `#/stars/${card.tz}`;
    setTimeout(() => {
      if (location.hash === expected) location.href = target;
    }, 1400);
  }
}

function render() {
  const { page, id } = parseHash();
  if (!state.list.length && page !== "hub") {
    document.getElementById("app").innerHTML = shell(page, `<p class="quiet">טוען חיילים…</p>`);
    return;
  }
  if (page === "sap" && id) return renderSapProfile(id);
  if (page === "stars" && id) return renderCard(id);
  const body = page === "sap" ? sapList() : page === "stars" ? starsPick() : hubHtml();
  document.getElementById("app").innerHTML = shell(page, body);
}

document.body.addEventListener("input", (event) => {
  if (event.target.id !== "q") return;
  state.query = event.target.value;
  const rows = document.getElementById("rows");
  if (rows) rows.innerHTML = filtered().map((soldier) => `
    <tr class="clickable" data-href="#/sap/${soldier.tz}">
      <td>${esc(nameOf(soldier))}</td><td class="num">${esc(soldier.tz)}</td><td>${esc(soldier.serviceType)}</td>
      <td>${esc(soldier.gender)}</td><td>${esc(soldier.age)}</td><td>${esc(soldier.role)}</td>
      <td>${esc(soldier.activityLevel)}</td><td>${esc(soldier.combatStatus)}</td>
      <td><span class="tag ${esc(soldier.tone)}">${esc(soldier.cardStatusLabel)}</span></td><td>${esc(soldier.scenario)}</td>
    </tr>`).join("") || `<tr><td colspan="10">אין תוצאות</td></tr>`;
});

document.body.addEventListener("click", (event) => {
  const service = event.target.closest("[data-service]");
  if (service) {
    state.service = service.dataset.service;
    render();
    return;
  }
  const filter = event.target.closest("[data-filter]");
  if (filter) {
    state.range.from = document.getElementById("from").value;
    state.range.to = document.getElementById("to").value;
    renderCard(filter.dataset.filter);
    return;
  }
  const row = event.target.closest("[data-href]");
  if (row) location.hash = row.dataset.href;
});

window.addEventListener("hashchange", render);

fetch("/api/soldiers")
  .then((response) => response.json())
  .then((list) => {
    state.list = list;
    render();
  })
  .catch(() => {
    document.getElementById("app").innerHTML = shell("hub", "<p>לא הצלחתי לטעון את נתוני הדמו.</p>");
  });
