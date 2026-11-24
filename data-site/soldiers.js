const { CATEGORIES, lineName } = require("../shared/policy");

function withCheckDigit(first8) {
  let sum = 0;
  for (let i = 0; i < 8; i += 1) {
    let n = Number(first8[i]) * ((i % 2) + 1);
    if (n > 9) n -= 9;
    sum += n;
  }
  return first8 + String((10 - (sum % 10)) % 10);
}

const BASE = {
  personal: 215,
  operational: 0,
  sport: 3000,
  culture: 6000,
  vacation: 3000,
  holiday: 3000,
  economy: 3000,
  welfare: 3000,
  excellence: 505.9,
  activityGrant: 3000,
  food: 5000,
  clothing: 3000,
  transport: 4000,
  family: 3000,
  training: 3000,
  command: 6000,
  readiness: 3000,
  special: 3000,
  field: 3000,
};

function wallets({ exact, seed, sap, card }) {
  const sapWallet = { ...BASE };
  if (!exact) {
    sapWallet.personal = 180 + (seed % 7) * 40;
    sapWallet.sport = 2000 + (seed % 5) * 500;
    sapWallet.operational = seed % 4 === 0 ? 750 : 0;
    sapWallet.food = 2500 + (seed % 3) * 500;
    sapWallet.excellence = seed % 2 === 0 ? 505.9 : 320;
  }
  Object.assign(sapWallet, sap || {});
  const cardWallet = { ...sapWallet, ...(card || {}) };
  return { sap: sapWallet, card: cardWallet };
}

function linesFrom(wallet, serviceType) {
  return CATEGORIES.map((category) => ({
    id: category.id,
    name: lineName(category.id, serviceType),
    amount: Math.round(Number(wallet[category.id] || 0) * 100) / 100,
  }));
}

const RAW = [
  ["21110018", "סדיר", "יובל", "כהן", "זכר", 20, "0521111001", "2025-08-01", "2025-08-03", "2028-04-02", "לוחם בגדוד חי״ר", "א+", "לוחם", "סמל", null, "ok", "אתר תקין, יתרה מלאה", "ok", true, 1],
  ["21110029", "סדיר", "נועה", "לוי", "נקבה", 19, "0521111002", "2025-11-16", "2025-11-16", "2027-11-15", "מש״קית ת״ש", "ב", "תומך לחימה", "רב״ט", null, "ok", "אתר תקין", "ok", false, 2],
  ["21110030", "סדיר", "איתי", "מזרחי", "זכר", 21, "0521111003", "2024-07-28", "2024-07-28", "2027-03-27", "מפקד כיתה", "א", "לוחם", "סמ״ר", null, "ok", "אתר תקין", "ok", false, 3],
  ["21110041", "סדיר", "מאיה", "ביטון", "נקבה", 19, "0521111004", "2025-11-01", "2025-12-15", "2027-12-14", "פקידת שלישות", "ד", "לא לוחם", "טוראי", null, "no_card", "לא נמצא כרטיס", "bad", false, 4],
  ["21110052", "סדיר", "דניאל", "אברהם", "זכר", 22, "0521111005", "2024-03-10", "2024-03-17", "2026-11-16", "לוחם בסיירת", "א+", "לוחם", "סמל", null, "ok", "פער בנקודות ספורט", "gap", false, 5, { sport: 6000 }, { sport: 2500 }],
  ["21110063", "סדיר", "שירה", "פרץ", "נקבה", 20, "0521111006", "2025-03-02", "2025-03-02", "2027-03-01", "חובשת גדודית", "ג", "תומך לחימה", "רב״ט", null, "bad_data", "נתונים שגויים", "bad", false, 6],
  ["21110074", "סדיר", "עומר", "דהן", "זכר", 19, "0521111007", "2026-03-15", "2026-03-15", "2028-11-14", "לוחם באיסוף", "ב", "לוחם", "טוראי", null, "bad_data", "נתונים שגויים", "bad", false, 7],
  ["21110085", "סדיר", "הילה", "אזולאי", "נקבה", 21, "0521111008", "2024-12-01", "2024-12-01", "2026-11-30", "חוקרת מודיעין", "ד", "לא לוחם", "סמל", null, "ok", "אתר תקין", "ok", false, 8],
  ["21110096", "סדיר", "יונתן", "חדד", "זכר", 20, "0521111009", "2025-07-06", "2025-07-06", "2028-03-05", "נהג מבצעי", "א", "לוחם", "רב״ט", null, "ok", "פער ביתרה אישית", "gap", false, 9, { personal: 900 }, { personal: 215 }],
  ["21110107", "סדיר", "רוני", "אוחיון", "נקבה", 19, "0521111010", "2026-01-11", "2026-01-18", "2028-01-17", "אלחוטנית", "ב", "תומך לחימה", "טוראי", null, "ok", "אתר תקין", "ok", false, 10],
  ["21110118", "סדיר", "אורי", "גבאי", "זכר", 22, "0521111011", "2024-08-04", "2024-08-04", "2027-04-03", "חבלן", "א+", "לוחם", "סמ״ר", null, "ok", "אתר תקין", "ok", false, 11],
  ["21110129", "סדיר", "ליאן", "שמש", "נקבה", 20, "0521111012", "2025-05-20", "2025-05-20", "2027-05-19", "מדריכת חינוך", "ג", "לא לוחם", "רב״ט", null, "no_card", "לא נמצא כרטיס", "bad", false, 12],
  ["30110010", "קבע", "אביחי", "מלכה", "זכר", 32, "0532222001", "2012-11-01", "2012-11-04", "2026-12-31", "מפקד פלוגה", "א+", "לוחם", "רס״ל", { type: "full_year", from: "2026-01-01", to: "2026-12-31", label: "שנה מלאה (1.1–31.12)" }, "ok", "קבע · א׳+ · שנה מלאה · זכאי ל-3", "uniform", false, 13],
  ["30110021", "קבע", "רונית", "אלון", "נקבה", 29, "0532222002", "2016-08-15", "2016-08-15", "2026-12-31", "קצינת לוגיסטיקה", "ב", "תומך לחימה", "סרן", { type: "full_year", from: "2026-01-01", to: "2026-12-31", label: "שנה מלאה (1.1–31.12)" }, "ok", "קבע · ב׳ · שנה מלאה · זכאי ל-2", "uniform", false, 14],
  ["30110032", "קבע", "גיל", "חדד", "זכר", 41, "0532222003", "2004-02-01", "2004-02-01", "2026-12-31", "מפקד גדוד", "ג", "לוחם", "סא״ל", { type: "full_year", from: "2026-01-01", to: "2026-12-31", label: "שנה מלאה (1.1–31.12)" }, "ok", "קבע · ג׳ · 1 בשנה", "uniform", false, 15],
  ["30110043", "קבע", "קרן", "בן דוד", "נקבה", 27, "0532222004", "2018-06-03", "2018-06-10", "2026-06-30", "רכזת משאבי אנוש", "ד", "לא לוחם", "סמל", { type: "first_semester", from: "2026-01-01", to: "2026-06-30", label: "חציון ראשון מלא (1.1–30.6)" }, "ok", "קבע · דרגת סמל · לא זכאי למדים", "uniform", false, 16],
  ["30110054", "קבע", "משה", "עמר", "זכר", 35, "0532222005", "2010-01-20", "2010-01-20", "2026-12-31", "רס״ר מבצעי", "א", "לוחם", "רס״ר", { type: "second_semester", from: "2026-07-01", to: "2026-12-31", label: "חציון שני בלבד (1.7–31.12)" }, "ok", "קבע · חציון שני בלבד · זכאי ל-1", "uniform", false, 17],
  ["30110065", "קבע", "יעל", "נחום", "נקבה", 38, "0532222006", "2008-09-01", "2008-09-01", "2026-12-31", "מפקדת חטיבה", "א+", "תומך לחימה", "אל״מ", { type: "full_year", from: "2026-01-01", to: "2026-12-31", label: "שנה מלאה (1.1–31.12)" }, "ok", "קבע · אל״מ · א׳+ · זכאי ל-3", "uniform", false, 18],
  ["30110076", "קבע", "תומר", "ויצמן", "זכר", 26, "0532222007", "2019-03-12", "2019-03-12", "2026-06-30", "לוחם ביחידה מיוחדת", "ד", "לוחם", "רס״ל", { type: "first_semester", from: "2026-01-01", to: "2026-06-30", label: "חציון ראשון מלא (1.1–30.6)" }, "ok", "קבע · ד׳ · חציון ראשון · זכאי ל-1", "uniform", false, 19],
  ["30110087", "קבע", "הדס", "מרציאנו", "נקבה", 33, "0532222008", "2014-04-07", "2014-04-07", "2026-12-31", "קצינת תקשוב", "ב", "לא לוחם", "רס״ן", { type: "full_year", from: "2026-01-01", to: "2026-12-31", label: "שנה מלאה (1.1–31.12)" }, "ok", "קבע · פער בספורשיות", "gap", false, 20, { sport: 5000 }, { sport: 1200 }],
];

const STATUS = {
  ok: "תקין",
  bad_data: "נתונים שגויים",
  no_card: "לא נמצא כרטיס",
};

function transactionsFor(index, multipass, sportName) {
  return [
    {
      orderId: String(15020 + index),
      multipass,
      action: "קנייה",
      time: index === 1 ? "17:27" : "12:40",
      date: "2026-10-11",
      amount: index === 1 ? 455.64 : 180 + index * 7,
      pointType: index % 2 === 0 ? sportName : "אישית",
      chain: index % 2 === 0 ? "צרכניית בסיס" : "שקם",
      store: index % 2 === 0 ? "צרכנייה דרומית" : "שקם הקריה",
    },
    {
      orderId: String(16020 + index),
      multipass,
      action: "קנייה",
      time: "09:15",
      date: "2026-10-02",
      amount: 96.5,
      pointType: "מזון - חודשי",
      chain: "חדר אוכל",
      store: "חדר אוכל מרכזי",
    },
  ];
}

const soldiers = RAW.map((row) => {
  const [
    tz8,
    serviceType,
    firstName,
    lastName,
    gender,
    age,
    phone,
    plannedEnlistment,
    actualEnlistment,
    releaseDate,
    role,
    activityLevel,
    combatStatus,
    rank,
    contract,
    cardStatus,
    scenario,
    tone,
    exact,
    seed,
    sapOverride,
    cardOverride,
  ] = row;
  const tz = withCheckDigit(tz8);
  const built = wallets({ exact, seed, sap: sapOverride, card: cardOverride });
  const sportName = serviceType === "קבע" ? "ספורשיות" : "נקודות ספורט";
  const multipassNumber = String(880010000 + seed);
  return {
    tz,
    serviceType,
    firstName,
    lastName,
    gender,
    age,
    phone,
    plannedEnlistment,
    actualEnlistment,
    releaseDate,
    role,
    activityLevel,
    combatStatus,
    rank,
    contract,
    cardStatus,
    cardStatusLabel: STATUS[cardStatus],
    scenario,
    tone,
    multipassNumber,
    sapLines: linesFrom(built.sap, serviceType),
    cardLines: linesFrom(built.card, serviceType),
    transactions: transactionsFor(seed, multipassNumber, sportName),
  };
});

const careerLast4 = soldiers.filter((s) => s.serviceType === "קבע").map((s) => s.tz.slice(-4));
if (new Set(careerLast4).size !== careerLast4.length) {
  throw new Error("4 הספרות האחרונות של חיילי הקבע חייבות להיות ייחודיות");
}

module.exports = { soldiers, STATUS };
