function norm(value) {
  return String(value || "").replace(/[״"׳']/g, "").replace(/\s+/g, " ").trim();
}

const PHONE_HELP = [
  "כדי לעדכן מספר טלפון צריך לחייג למיטב בטלפון 1111, ולבקש מהם שיעדכנו את המספר לא רק במערכת, אלא גם בחדר הכוכבים.",
  "רק שעתיים עד שלוש אחרי שאמרו שהמספר עודכן, פותחים כאן פנייה חדשה וכותבים שחייגת למיטב והם שינו את המספר לפני שעתיים.",
  "אז אנחנו מעדכנים את המספר אצלנו, ותוך יומיים עד שלושה זה עובד אוטומטית.",
].join("\n");
const DESK_PHONE = "073-3720009";

function siteName(soldier) {
  return soldier.serviceType === "קבע" ? "אתר הנקודות" : "אתר הכוכבים";
}

function siteQuestion(soldier) {
  return `מה קרה בעצם — ניסית לפתוח את ${siteName(soldier)} ולא נפתח לך?`;
}

function choicesCommon() {
  return {
    type: "choices",
    items: [
      { id: "site_start", label: "האתר לא נפתח לי" },
      { id: "do_gap", label: "יש פער ביתרה" },
      { id: "do_balance", label: "כמה יש לי?" },
      { id: "do_uniform", label: "מדי ייצוגיים / מדי עבודה" },
      { id: "do_desk_phone", label: "פנה לנציג" },
    ],
  };
}

function traceOf(calls) {
  return { type: "trace", calls };
}

function welcome(soldier) {
  return {
    pending: null,
    blocks: [
      {
        type: "text",
        text: `שלום ${soldier.firstName}. אני המענה של המוקד.\nאפשר לשאול איך נכנסים ל${siteName(soldier)}, על תקלה בכרטיס, על פער ביתרה, או על מדי עבודה.\nבמה אפשר לעזור?`,
      },
      choicesCommon(),
    ],
  };
}

function matchFaq(text, soldier) {
  if (/מי קובע|מה זה סאפ|מולטיפאס/.test(text)) {
    return `הסא״פ קובע את הזכאות. החייל רואה רק את ${siteName(soldier)}, ושם מוצג מה שנטען לכרטיס מולטיפאס.`;
  }
  if (/מה זה כוכב|מה זה נקוד|מה ההבדל/.test(text)) {
    return soldier.serviceType === "קבע"
      ? "אצל חיילי קבע הכרטיס נקרא נקודות. באתר הנקודות מופיעות נקודות מדים וספורשיות. נקודות מדי עבודה מופיעות באתר מדים אקספרס."
      : "אצל חיילי חובה הכרטיס נקרא כוכבים. בפער מדווחים על נקודות כוכבים אישיות ועל כוכבי ספורט. אצל חיילי קבע אותו עולם נקרא נקודות: נקודות מדים, ספורשיות ונקודות מדי עבודה.";
  }
  if (/עתודא/.test(text)) {
    return "עתודאי שעדיין לא השתחרר משירות החובה, ונשארו לו כוכבים, יכול להיכנס לאתר הכוכבים וזכאי למדי ייצוג לפי הזכאות. אחרי שחרור משירות החובה אתר הכוכבים לא קיים לו.";
  }
  if (/איפה קונ|איפה רוכש|רשת|טקטיקל|מדים אקספרס/.test(text)) {
    return "אפשר לרכוש ברשתות עד הבית, ובאתרי החברות טקטיקל וון, ריקווסט, גלי, outsiders, טרקר למטייל ואתר הסיורל. נקודות מדי עבודה לאנשי קבע נמצאות באתר מדים אקספרס.";
  }
  if (/13 בינואר|מתי נטען|מתי ייטען|פעימ/.test(text)) {
    return "עד 13 בינואר 2026 הכרטיס נטען בנקודות מדים ובספורשיות. הזכאות השנתית המלאה למדי עבודה ניתנת בשתי פעימות, בתחילת השנה ובאמצע השנה.";
  }
  if (/איך מפעיל|תקנון|כרטיס פיזי|פיו/.test(text)) {
    return "מפעילים את כרטיס הנקודות הדיגיטלי באתר הנקודות ברשת האזרחית, ומאשרים את התקנון. מספר הכרטיס נשלח ב-SMS ואפשר לראות אותו בכרטיס פיו. לא מנפיקים יותר משני כרטיסים פיזיים.";
  }
  if (/טואלטיקה|היגיינה|תיקוני מדים|מועדון/.test(text)) {
    return "מ־2025 נוספו הקטגוריות טואלטיקה והיגיינה, תיקוני מדים לקבע, ואימונים במועדוני ספורט.";
  }
  if (/אחרי שחרור|כשאשתחרר|הנקודות נשארות/.test(text)) {
    return "הנקודות זמינות לשימוש במהלך השירות הצבאי. לקראת השחרור האישי כדאי לממש אותן בתקופה הזו.";
  }
  if (/אם יש פער|מה זה פער|איך עובד הפער/.test(text)) {
    return soldier.serviceType === "קבע"
      ? "פער ביתרה נפתח למפקד לפי צילום המסך. לקבע רושמים נקודות מדים, ספורשיות ונקודות מדי עבודה. המוקד לא שולף את היתרה לבד."
      : "פער ביתרה נפתח למפקד לפי צילום המסך. לחובה רושמים נקודות כוכבים אישיות וכוכבי ספורט. המוקד לא שולף את היתרה לבד.";
  }
  if (/תוך כמה|כמה זמן|יומיים/.test(text)) {
    return "כשהאתר מחזיר נתונים שגויים או לא נמצא כרטיס, נפתחת בקשה והמערכת אמורה להסתדר תוך יומיים.";
  }
  if (/^(שלום|היי|הי|ערב טוב|בוקר טוב|עזרה)$/.test(text)) {
    return "אפשר לשאול על תקלה באתר, איך רואים יתרה, פער ביתרה, או מדי עבודה. לפנייה טלפונית למוקד בוחרים פנה לנציג.";
  }
  return "";
}

function howToBalance(soldier) {
  if (soldier.serviceType === "קבע") {
    return [
      "כדי לראות את היתרה: רושמים בגוגל אתר הנקודות, מזדהים עם הטלפון ועם 4 הספרות האחרונות של הת״ז, ומקבלים קוד ב-SMS.",
      "אחרי הכניסה לוחצים על יתרה ודוח תנועות. שם מופיעות נקודות המדים והספורשיות.",
      "נקודות מדי עבודה לאנשי קבע מופיעות באתר מדים אקספרס.",
    ].join("\n");
  }
  return [
    "כדי לראות את היתרה: רושמים בגוגל אתר הכוכבים, מזדהים עם ת״ז וסיסמה, ואחרי הכניסה לוחצים על יתרה ודוח תנועות.",
    "שם מופיעות נקודות הכוכבים האישיות וכוכבי הספורט.",
    "עתודאי שעדיין לא השתחרר משירות החובה, ונשארו לו כוכבים, נכנס לאתר הכוכבים באותה דרך וזכאי למדי ייצוג לפי הזכאות. אחרי שחרור משירות החובה האתר לא קיים לו.",
  ].join("\n");
}

function deskPhone(draft) {
  return {
    pending: draft ? { step: "rep_offer", draft } : null,
    blocks: [
      {
        type: "text",
        text: `אפשר לפנות למוקד בטלפון ${DESK_PHONE}.\nאם בכל זאת מתעקשים שנציג יחזור, צריך למלא מ.א., ואם אין מ.א. אז ת״ז, מספר טלפון שמעודכן במערכת, והסבר מלא על הפנייה. אחר כך נפתחת פנייה אוטומטית לנציג.`,
      },
      { type: "choices", items: [{ id: "do_rep_form", label: "בכל זאת לפתוח פנייה לנציג" }] },
    ],
  };
}

function phoneHelpAnswer() {
  return {
    pending: null,
    blocks: [
      { type: "text", text: PHONE_HELP },
      { type: "choices", items: [{ id: "do_phone_update", label: "חייגתי למיטב והמספר עודכן לפני שעתיים" }] },
    ],
  };
}

async function openTicket(soldier, fields) {
  return DeskApi.createTicket(Object.assign({ soldier }, fields));
}

function ticketBlocks(text, ticket, calls) {
  const blocks = [
    { type: "text", text },
    { type: "ticket", ticket },
  ];
  if (calls && calls.length) blocks.push(traceOf(calls));
  blocks.push(choicesCommon());
  return { pending: null, blocks };
}

async function openHuman(soldier, question, pending) {
  const ticket = await openTicket(soldier, {
    route: "rep",
    requestType: "human_question",
    title: "שאלה לנציג",
    detail: `אין לי על זה תשובה בנהלים.\nהשאלה: ${question}`,
    changeRequest: "נציג יבדוק ויענה לחייל.",
    context: pending && pending.facts ? { facts: pending.facts, decision: pending.decision } : null,
  });
  return ticketBlocks(`אין לי על זה תשובה בנהלים. פתחתי פנייה לנציג, והתשובה תופיע כאן.\nמספר פנייה ${ticket.id}.`, ticket);
}

async function openCommander(soldier, question, pending) {
  const ticket = await openTicket(soldier, {
    route: "commander",
    requestType: "commander_decision",
    title: "החלטת מפקד",
    detail: `אני צריך לבדוק את זה ומעביר את הפנייה למפקד.\n${question}`,
    changeRequest: "נדרשת החלטת מפקד.",
    context: pending && pending.facts ? { facts: pending.facts, decision: pending.decision } : { question },
  });
  return ticketBlocks(`אני צריך לבדוק את זה ומעביר את הפנייה למפקד.\nמספר פנייה ${ticket.id}.`, ticket);
}

async function openFix(soldier, card, calls) {
  const detail = `הבנתי את התקלה: ${card.cardStatusLabel}. אני מסדר את זה במערכת. פתחתי בקשה, ועוד יומיים האתר אמור לעבוד.`;
  const ticket = await openTicket(soldier, {
    route: "system",
    requestType: "card_fix",
    sla: "יומיים",
    title: "תיקון כרטיס",
    detail,
    changeRequest: `לתקן את הכרטיס במולטיפאס. סטטוס נוכחי: ${card.cardStatusLabel}. יעד: כרטיס תקין.`,
    context: { cardStatus: card.cardStatus, cardStatusLabel: card.cardStatusLabel },
  });
  return ticketBlocks(detail, ticket, calls);
}

async function siteAfterAnswer(soldier, choice, calls) {
  const card = await IdfApi.card(soldier.tz);
  calls.push({ method: "GET", url: `${IdfApi.base()}/api/soldiers/${soldier.tz}/card` });
  if (card.cardStatus === "bad_data" || card.cardStatus === "no_card") {
    return openFix(soldier, card, calls);
  }
  const detail = "בדקתי את הכרטיס והוא מסומן כתקין, אבל האתר לא נפתח. אני צריך לבדוק את זה ומעביר את הפנייה למפקד.";
  const ticket = await openTicket(soldier, {
    route: "commander",
    requestType: "commander_decision",
    title: "תקלת אתר לא מוכרת",
    detail,
    changeRequest: "בדיקת מפקד לתקלה שלא מוגדרת בנוהל.",
    context: { reported: choice, cardStatus: card.cardStatus },
  });
  return ticketBlocks(detail, ticket, calls);
}

function gapFields(soldier) {
  if (soldier.serviceType === "קבע") {
    return [
      { key: "uniforms", label: "נק' מדים" },
      { key: "sport", label: "ספורשיות" },
      { key: "work", label: "נקודות מדי עבודה" },
    ];
  }
  return [
    { key: "personal", label: "נק' כוכבים אישיות" },
    { key: "sport", label: "כוכבי ספורט" },
  ];
}

function gapAsk(soldier) {
  const fields = gapFields(soldier);
  return {
    pending: { step: "gap_form", fields },
    blocks: [{
      type: "text",
      text: `בשלב הזה אני לא שולף את היתרה מהמערכת. תעלה צילום מסך של יתרה ודוח תנועות, ותרשום מה שמופיע בו: ${fields.map((field) => field.label).join(", ")}. אעביר את זה למפקד.`,
    }],
  };
}

function cleanAmount(value) {
  return String(value || "").replace(/,/g, "").trim();
}

function gapRetry(soldier) {
  return {
    pending: { step: "gap_form", fields: gapFields(soldier) },
    blocks: [{
      type: "text",
      text: `צריך לצרף צילום מסך של היתרה, ולמלא את הסכומים: ${gapFields(soldier).map((field) => field.label).join(", ")}.`,
    }],
  };
}

async function gapSubmit(soldier, gap) {
  const values = (gap && gap.values) || {};
  const fields = gapFields(soldier);
  const amounts = fields.map((field) => ({ ...field, amount: cleanAmount(values[field.key]) }));
  const amountOk = amounts.every((field) => /^\d+(\.\d+)?$/.test(field.amount));
  if (!gap || !gap.attachment || !amountOk) return gapRetry(soldier);
  const listed = amounts.map((field) => `${field.amount} ${field.label}`).join(", ");
  const line = `פער ביתרה, מופיע באתר ${listed} - לטפל`;
  const ticket = await openTicket(soldier, {
    route: "commander",
    requestType: "balance_gap",
    title: "פער ביתרה",
    detail: line,
    changeRequest: line,
    attachment: gap.attachment,
    context: {
      lines: amounts.map((field) => ({ label: field.label, amount: field.amount })),
      fileName: gap.fileName || "",
    },
  });
  return ticketBlocks(`העברתי למפקד:\n${line}`, ticket);
}

function repFormAsk(draft) {
  return {
    pending: { step: "rep_form", draft: draft || "" },
    blocks: [{
      type: "text",
      text: "לפתיחת הפנייה: מלא מ.א. אם יש. אם אין מ.א., מלא ת״ז. חובה גם מספר טלפון שמעודכן במערכת, והסבר מלא. הפנייה תיפתח אוטומטית לנציג שיחזור אליך.",
    }],
  };
}

async function repSubmit(soldier, rep) {
  const personalNumber = String((rep && rep.personalNumber) || "").trim();
  const tz = String((rep && rep.tz) || "").replace(/\D/g, "");
  const phone = String((rep && rep.phone) || "").replace(/\D/g, "");
  const explanation = String((rep && rep.explanation) || "").trim();
  if ((!personalNumber && tz.length < 5) || phone.length < 9 || explanation.length < 8) {
    return {
      pending: { step: "rep_form", draft: explanation },
      blocks: [{ type: "text", text: "חסר פרט. צריך מ.א. או ת״ז, טלפון שמעודכן במערכת, והסבר מלא על הפנייה." }],
    };
  }
  const who = personalNumber ? `מ.א. ${personalNumber}` : `ת״ז ${tz}`;
  const detail = `${who}\nטלפון מעודכן במערכת: ${phone}\n${explanation}`;
  const ticket = await openTicket(soldier, {
    route: "rep",
    requestType: "human_question",
    title: "פנייה לנציג",
    detail,
    changeRequest: "נציג יחזור לחייל.",
    context: { personalNumber, tz, phone },
  });
  return ticketBlocks(`פתחתי פנייה לנציג, והוא יחזור אליך.\nמספר פנייה ${ticket.id}.`, ticket);
}

function phoneFormAsk() {
  return {
    pending: { step: "phone_form" },
    blocks: [{
      type: "text",
      text: "כתוב את המספר החדש שמיטב עדכנו, כולל בחדר הכוכבים. אנחנו נעדכן אותו אצלנו, ותוך יומיים עד שלושה זה יעבוד אוטומטית.",
    }],
  };
}

async function phoneSubmit(soldier, phoneUpdate) {
  const phone = String((phoneUpdate && phoneUpdate.phone) || "").replace(/\D/g, "");
  if (phone.length < 9) {
    return {
      pending: { step: "phone_form" },
      blocks: [{ type: "text", text: "צריך את המספר החדש, כמו שמיטב עדכנו אותו גם בחדר הכוכבים." }],
    };
  }
  const detail = `החייל חייג למיטב, והם עדכנו את המספר לפני כשעתיים גם במערכת וגם בחדר הכוכבים.\nמספר חדש: ${phone}\nלעדכן אצלנו. תוך יומיים עד שלושה זה יעבוד אוטומטית.`;
  const ticket = await openTicket(soldier, {
    route: "system",
    requestType: "phone_update",
    sla: "יומיים-שלושה",
    title: "עדכון מספר טלפון",
    detail,
    changeRequest: `לעדכן אצלנו את מספר הטלפון ל-${phone}, אחרי שמיטב עדכנו אותו גם בחדר הכוכבים.`,
    context: { phone },
  });
  return ticketBlocks("קיבלתי. נעדכן את המספר אצלנו, ותוך יומיים עד שלושה זה יעבוד אוטומטית.", ticket);
}

function balance(soldier) {
  return {
    pending: null,
    blocks: [
      { type: "text", text: howToBalance(soldier) },
      choicesCommon(),
    ],
  };
}

async function personal(soldier, kind, calls) {
  const sap = await IdfApi.sap(soldier.tz);
  calls.push({ method: "GET", url: `${IdfApi.base()}/api/soldiers/${soldier.tz}/sap` });
  let text = "";
  if (kind === "role") {
    text = `התפקיד בסא״פ: ${sap.role}. סטטוס: ${sap.combatStatus}.`;
  } else {
    text = `רמת הפעילות בסא״פ: ${sap.activityLevel}.`;
  }
  return {
    pending: null,
    blocks: [
      { type: "text", text: `${text}\nהנתון נמשך מהסא״פ.` },
      traceOf(calls),
      choicesCommon(),
    ],
  };
}

async function uniformCheck(soldier, calls) {
  const sap = await IdfApi.sap(soldier.tz);
  calls.push({ method: "GET", url: `${IdfApi.base()}/api/soldiers/${soldier.tz}/sap` });
  const decision = Policy.evaluateUniform(sap);
  const facts = `דרגה: ${sap.rank}\nרמת פעילות: ${sap.activityLevel}\nחתימה: ${sap.contract ? sap.contract.label : "—"}\nתפקיד: ${sap.role}`;
  const pending = { step: "uniform_result", decision, facts };
  if (decision.escalate) {
    const ticket = await openTicket(soldier, {
      route: "commander",
      requestType: "commander_decision",
      title: "זכאות מדים חריגה",
      detail: `${facts}\n${decision.detail}`,
      changeRequest: "הנוהל הזמני לא מכריע. נדרשת החלטת מפקד.",
      context: { facts, decision },
    });
    return ticketBlocks(`בדקתי בסא״פ:\n${facts}\n\n${decision.detail}\nאני צריך לבדוק את זה ומעביר את הפנייה למפקד.`, ticket, calls);
  }
  const items = [
    { id: "data_ok", label: "הנתונים נכונים" },
    { id: "data_bad", label: "הנתונים לא נכונים" },
  ];
  if (!decision.eligible) items.push({ id: "want_exception", label: "לבקש חריגה ממפקד" });
  return {
    pending,
    blocks: [
      { type: "text", text: `בדקתי בסא״פ. אשר לי שהנתונים נכונים:\n${facts}\n\n${decision.title}. ${decision.detail}` },
      { type: "choices", items },
      traceOf(calls),
    ],
  };
}

function confirmUniform(pending) {
  const decision = pending && pending.decision;
  if (!decision) {
    return { pending: null, blocks: [{ type: "text", text: "קודם צריך לבדוק את הנתונים בסא״פ." }, choicesCommon()] };
  }
  if (decision.eligible) {
    return {
      pending: null,
      blocks: [
        { type: "text", text: `רשמתי שהנתונים נכונים. ${decision.detail}\nאין צורך בפנייה — זו תשובה לפי הנוהל.` },
        choicesCommon(),
      ],
    };
  }
  return {
    pending,
    blocks: [
      { type: "text", text: `רשמתי שהנתונים נכונים. ${decision.detail}\nאם זו בקשת חריגה, אני מעביר אותה למפקד.` },
      { type: "choices", items: [{ id: "want_exception", label: "לבקש חריגה ממפקד" }] },
    ],
  };
}

async function uniformStart(soldier, text, calls) {
  const personalAsk = /מגיע לי|האם אני|אני זכאי|תבדוק/.test(text);
  if (soldier.serviceType !== "קבע") {
    return {
      pending: null,
      blocks: [
        { type: "text", text: `${Policy.uniformPolicyText()}\n\nאתה מחובר כחייל חובה. עתודאי שעדיין לא השתחרר משירות החובה, ונשארו לו כוכבים, יכול להיכנס לאתר הכוכבים וזכאי למדי ייצוג לפי הזכאות. אחרי שחרור משירות החובה האתר לא קיים לו.` },
        choicesCommon(),
      ],
    };
  }
  if (personalAsk) return uniformCheck(soldier, calls);
  return {
    pending: { step: "uniform_offer" },
    blocks: [
      { type: "text", text: Policy.uniformPolicyText() },
      { type: "choices", items: [{ id: "uniform_check", label: "בדוק לפי הנתונים שלי" }] },
    ],
  };
}

async function respond(input) {
  const soldier = input.soldier;
  const choice = input.choiceId || "";
  const text = norm(input.text || "");
  const pending = input.pending;
  const calls = [];

  try {
    if (input.event === "welcome") return welcome(soldier);
    if (input.event === "incoming_error") {
      const label = input.cardStatus === "bad_data" ? "נתונים שגויים" : "לא נמצא כרטיס";
      return await openFix(soldier, { cardStatus: input.cardStatus, cardStatusLabel: label }, calls);
    }
    if (choice === "site_bad_data" || choice === "site_no_card" || choice === "site_other") {
      return await siteAfterAnswer(soldier, choice, calls);
    }
    if (choice === "uniform_check") return await uniformCheck(soldier, calls);
    if (choice === "data_ok") return confirmUniform(pending);
    if (choice === "data_bad") return await openHuman(soldier, "הנתונים שהוצגו על זכאות המדים לא תואמים למה שהחייל מכיר", pending);
    if (choice === "want_exception") return await openCommander(soldier, "בקשת חריגה למדי ייצוגיים / מדי עבודה", pending);
    if (choice === "do_gap") return gapAsk(soldier);
    if (choice === "gap_submit") return await gapSubmit(soldier, input.gap);
    if (choice === "do_balance") return balance(soldier);
    if (choice === "do_uniform") return await uniformStart(soldier, text, calls);
    if (choice === "do_desk_phone") return deskPhone();
    if (choice === "do_rep_form") return repFormAsk(pending && pending.draft);
    if (choice === "rep_submit") return await repSubmit(soldier, input.rep);
    if (choice === "do_phone_update") return phoneFormAsk();
    if (choice === "phone_submit") return await phoneSubmit(soldier, input.phoneUpdate);
    if (choice === "do_role") return await personal(soldier, "role", calls);
    if (choice === "do_activity") return await personal(soldier, "activity", calls);
    if (choice === "do_human") return await openHuman(soldier, input.text || "החייל ביקש נציג", pending);
    if (choice === "site_start") {
      return {
        pending: { step: "site_what" },
        blocks: [
          { type: "text", text: siteQuestion(soldier) },
          { type: "choices", items: [
            { id: "site_bad_data", label: "נתונים שגויים" },
            { id: "site_no_card", label: "לא נמצא כרטיס" },
            { id: "site_other", label: "משהו אחר" },
          ] },
        ],
      };
    }
    if (pending && pending.step === "commander_reason" && text) return await openCommander(soldier, input.text, pending);
    if (pending && pending.step === "site_what") {
      if (/נתונים שגויים|שגוי/.test(text)) return await siteAfterAnswer(soldier, "site_bad_data", calls);
      if (/לא נמצא|אין כרטיס/.test(text)) return await siteAfterAnswer(soldier, "site_no_card", calls);
      if (text) return await siteAfterAnswer(soldier, "site_other", calls);
    }

    if (/נתונים שגויים|שגוי/.test(text)) return await siteAfterAnswer(soldier, "site_bad_data", calls);
    if (/לא נמצא כרטיס|אין כרטיס/.test(text)) return await siteAfterAnswer(soldier, "site_no_card", calls);
    if (/האתר לא|לא נפתח|לא עובד|תקלה באתר|אין לי גישה/.test(text)) {
      return {
        pending: { step: "site_what" },
        blocks: [
          { type: "text", text: siteQuestion(soldier) },
          { type: "choices", items: [
            { id: "site_bad_data", label: "נתונים שגויים" },
            { id: "site_no_card", label: "לא נמצא כרטיס" },
            { id: "site_other", label: "משהו אחר" },
          ] },
        ],
      };
    }
    if (/יש לי פער|פער ב|לא קיבלתי|חסרים לי|חסר לי|לא נכנסו|היתרה לא/.test(text)) return gapAsk(soldier);
    if (/כמה יש|מה היתרה|היתרה שלי|כמה כוכב|כמה נקוד|מה נשאר לי/.test(text)) return balance(soldier);
    if (/מדים|ייצוג|מדי עבודה/.test(text)) return await uniformStart(soldier, text, calls);
    if (/תפקיד|מה אני עושה/.test(text)) return await personal(soldier, "role", calls);
    if (/רמת פעילות/.test(text)) return await personal(soldier, "activity", calls);
    if (/מפקד/.test(text)) {
      return {
        pending: { step: "commander_reason" },
        blocks: [{ type: "text", text: "אעביר למפקד אם זו בקשה חריגה. כתוב בקצרה מה צריך להחליט." }],
      };
    }
    if (/חייגתי למיטב|מיטב עדכנ|שינו לי את המספר|המספר עודכן לפני/.test(text)) return phoneFormAsk();
    if (/טלפון לא מעודכן|המספר לא מעודכן|לא מגיע קוד|לא מגיע sms|הנייד לא|מספר לא נכון|להחליף מספר|מיטב/.test(text)) {
      return phoneHelpAnswer();
    }
    if (/נציג|בן אדם|מענה אנושי|הטלפון של המוקד/.test(text)) return deskPhone(input.text);

    const faq = matchFaq(text, soldier);
    if (faq) return { pending: null, blocks: [{ type: "text", text: faq }, choicesCommon()] };
    if (!text) return { pending, blocks: [{ type: "text", text: "כתוב את השאלה, או בחר נושא." }] };
    return deskPhone(input.text);
  } catch (error) {
    const detail = error && error.message ? `\n${error.message}` : "";
    return {
      pending,
      blocks: [{ type: "text", text: `לא הצלחתי להשלים את הפעולה מול המערכות.${detail}` }],
    };
  }
}

window.Agent = { respond };
