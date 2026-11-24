const data = "http://localhost:4000";
const desk = "http://localhost:3000";

async function j(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || response.statusText);
    error.status = response.status;
    throw error;
  }
  return body;
}

function post(url, payload, headers) {
  return j(url, {
    method: "POST",
    headers: Object.assign({ "Content-Type": "application/json" }, headers || {}),
    body: JSON.stringify(payload),
  });
}

(async () => {
  const health = await j(`${data}/api/health`);
  if (health.soldiers !== 20) throw new Error("expected 20");

  let failed = false;
  try {
    await post(`${data}/api/auth/conscript`, { tz: "211100185", phone: "0500000000" });
    failed = true;
  } catch (error) {
    if (error.status !== 401) throw error;
  }
  if (failed) throw new Error("bad phone should fail");

  const yoval = await post(`${data}/api/auth/conscript`, { tz: "211100185", phone: "0521111001" });
  const mayaCard = await j(`${data}/api/soldiers/211100417/card`);
  if (mayaCard.cardStatus !== "no_card" || mayaCard.lines.length) throw new Error("maya card");
  if (mayaCard.age || mayaCard.role) throw new Error("card leaked sap fields");

  const danielSap = await j(`${data}/api/soldiers/211100524/sap`);
  const danielCard = await j(`${data}/api/soldiers/211100524/card`);
  const sportSap = danielSap.entitlements.find((line) => line.id === "sport");
  const sportCard = danielCard.lines.find((line) => line.id === "sport");
  if (sportSap.amount - sportCard.amount !== 3500) throw new Error(`gap ${sportSap.amount} ${sportCard.amount}`);
  if (sportCard.name !== "נקודות ספורט") throw new Error(sportCard.name);

  const hadasCard = await j(`${data}/api/soldiers/301100871/card`);
  const hadasSport = hadasCard.lines.find((line) => line.id === "sport");
  if (hadasSport.name !== "ספורשיות") throw new Error(hadasSport.name);

  const code = await post(`${data}/api/auth/career/code`, { last4: "0103" });
  if (!code.demoCode) throw new Error("no demo code");
  const avihai = await post(`${data}/api/auth/career/verify`, { last4: "0103", code: code.demoCode });
  if (avihai.firstName !== "אביחי") throw new Error(avihai.firstName);

  try {
    await post(`${data}/api/auth/career/verify`, { last4: "0103", code: "000000" });
    throw new Error("stale code should fail");
  } catch (error) {
    if (error.message === "stale code should fail") throw error;
  }

  const ticket = await post(`${desk}/api/tickets`, {
    soldier: yoval,
    route: "rep",
    requestType: "human_question",
    title: "שאלה לנציג",
    detail: "בדיקה",
    changeRequest: "נציג",
  });
  const staff = await post(`${desk}/api/auth/staff`, { username: "rep", password: "rep" });
  const queue = await j(`${desk}/api/tickets?queue=rep`, { headers: { "x-staff-token": staff.token } });
  if (!queue.some((item) => item.id === ticket.id)) throw new Error("ticket missing");
  await post(`${desk}/api/tickets/${ticket.id}/reply`, { text: "בדקתי, הכול תקין." }, { "x-staff-token": staff.token });
  const mine = await j(`${desk}/api/tickets?tz=${yoval.tz}`);
  const updated = mine.find((item) => item.id === ticket.id);
  if (!updated.messages.some((message) => message.from === "rep")) throw new Error("no reply");

  console.log("smoke ok", yoval.tz, ticket.id, hadasSport.name);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
