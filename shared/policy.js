(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Policy = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const CATEGORIES = [
    { id: "personal", name: "אישית" },
    { id: "operational", name: "מבצעי" },
    { id: "sport", name: "נקודות ספורט", careerName: "ספורשיות" },
    { id: "culture", name: "תרבות ופנאי - שנתי" },
    { id: "vacation", name: "נופש - שנתי" },
    { id: "holiday", name: "שי לחג - שנתי" },
    { id: "economy", name: "כלכלה - חודשי" },
    { id: "welfare", name: "רווחה - שנתי" },
    { id: "excellence", name: "הצטיינות - שנתי" },
    { id: "activityGrant", name: "מענק פעילות - חצי שנתי" },
    { id: "food", name: "מזון - חודשי" },
    { id: "clothing", name: "הלבשה - שנתי" },
    { id: "transport", name: "נסיעות - שנתי" },
    { id: "family", name: "משפחה - שנתי" },
    { id: "training", name: "הכשרות - שנתי" },
    { id: "command", name: "פיקוד - שנתי" },
    { id: "readiness", name: "מוכנות - חודשי" },
    { id: "special", name: "תגמול מיוחד - שנתי" },
    { id: "field", name: "שטח - שנתי" },
  ];

  const RANK_ORDER = [
    "טוראי",
    "רב״ט",
    "סמל",
    "סמ״ר",
    "רס״ל",
    "רס״ר",
    "רס״ם",
    "רס״ב",
    "רנ״ג",
    "סג״ם",
    "סגן",
    "סרן",
    "רס״ן",
    "סא״ל",
    "אל״מ",
    "תא״ל",
  ];

  function lineName(id, serviceType) {
    const cat = CATEGORIES.find((item) => item.id === id);
    if (!cat) return id;
    if (id === "sport" && serviceType === "קבע") return cat.careerName;
    return cat.name;
  }

  function sum(lines) {
    return Math.round(lines.reduce((total, line) => total + Number(line.amount || 0), 0) * 100) / 100;
  }

  function diffLines(sapLines, cardLines) {
    const cardById = new Map((cardLines || []).map((line) => [line.id, line]));
    return (sapLines || [])
      .map((line) => {
        const card = cardById.get(line.id);
        const sapAmount = Number(line.amount || 0);
        const cardAmount = card ? Number(card.amount || 0) : 0;
        const gap = Math.round((sapAmount - cardAmount) * 100) / 100;
        return {
          id: line.id,
          name: line.name,
          sap: sapAmount,
          card: cardAmount,
          gap,
        };
      })
      .filter((row) => row.gap !== 0);
  }

  function uniformPolicyText() {
    return [
      "לפי איגרת הנקודות לאנשי הקבע ל־2026, מדרגת רס״ל או סרן ומעלה זכאים לרכוש מדי עבודה בחנויות המכר לפי רמת פעילות ודרגה.",
      "העבודה האישית נמכרת בנקודות מדי עבודה. הזכאות השנתית המלאה ניתנת בשתי פעימות, בתחילת השנה ובאמצע השנה.",
      "תנאי הבסיס נשאר: חתימה על חציון מלא (1.1–31.6) ובדרגת רס״ל ומעלה.",
      "נקודות מדי עבודה לאנשי קבע מופיעות באתר מדים אקספרס.",
      "עתודאי שעדיין לא השתחרר משירות החובה, ונשארו לו כוכבים, יכול להיכנס לאתר הכוכבים וזכאי למדי ייצוג לפי הזכאות. אחרי שחרור משירות החובה אתר הכוכבים לא קיים לו.",
      "בדרגות מרס״ל / סרן ועד אל״מ הזכאות תלויה ברמת הפעילות:",
      "רמה ג׳ או ד׳ — 1 בשנה.",
      "רמה ב׳ — 1 לכל חציון, אם חתום לשנה מלאה.",
      "רמה א׳ או א׳+ — 2 בחציון הראשון, ואם השנה מלאה עוד 1 בחציון השני.",
      "מי שחתום רק מהחציון השני מקבל 1.",
    ].join("\n");
  }

  function evaluateUniform(soldier) {
    if (!soldier || soldier.serviceType !== "קבע") {
      return {
        eligible: false,
        quantity: 0,
        escalate: false,
        title: "הנוהל חל על חיילי קבע",
        detail: "מדי ייצוגיים ומדי עבודה לפי הנוהל הזה מיועדים לחיילי קבע. אין כאן חישוב אישי לחייל חובה.",
      };
    }

    const rank = soldier.rank;
    const index = RANK_ORDER.indexOf(rank);
    const min = RANK_ORDER.indexOf("רס״ל");
    const max = RANK_ORDER.indexOf("אל״מ");

    if (index === -1) {
      return {
        eligible: false,
        quantity: 0,
        escalate: true,
        title: "הדרגה לא מכוסה בנוהל",
        detail: "אין לי כלל לדרגה הזו. צריך להעביר את הבקשה למפקד.",
      };
    }
    if (index < min) {
      return {
        eligible: false,
        quantity: 0,
        escalate: false,
        title: "אין זכאות",
        detail: `הדרגה בסא״פ היא ${rank}. התנאי הוא דרגת רס״ל ומעלה, עד אל״מ.`,
      };
    }
    if (index > max) {
      return {
        eligible: false,
        quantity: 0,
        escalate: true,
        title: "צריך החלטת מפקד",
        detail: `הדרגה ${rank} גבוהה מאל״מ, והנוהל הזמני לא מגדיר אותה.`,
      };
    }

    const contract = soldier.contract && soldier.contract.type;
    const level = soldier.activityLevel;
    const contractLabel = (soldier.contract && soldier.contract.label) || "לא צוינה";

    if (contract === "second_semester") {
      return {
        eligible: true,
        quantity: 1,
        escalate: false,
        title: "זכאות: 1",
        detail: `דרגה ${rank}, רמת פעילות ${level}, ${contractLabel}. חתימה רק מהחציון השני מקנה 1.`,
      };
    }
    if (contract !== "full_year" && contract !== "first_semester") {
      return {
        eligible: false,
        quantity: 0,
        escalate: true,
        title: "חתימה לא ברורה",
        detail: "לא מצאתי חציון חתימה שאפשר להכריע לפיו. צריך להעביר למפקד.",
      };
    }

    let quantity = 0;
    let rule = "";
    if (level === "ג" || level === "ד") {
      quantity = 1;
      rule = `רמת פעילות ${level}: 1 בשנה.`;
    } else if (level === "ב") {
      if (contract === "full_year") {
        quantity = 2;
        rule = "רמת פעילות ב׳ ושנה מלאה: 1 לכל חציון, סה״כ 2.";
      } else {
        quantity = 1;
        rule = "רמת פעילות ב׳ וחציון ראשון מלא: 1 לחציון הזה.";
      }
    } else if (level === "א" || level === "א+") {
      if (contract === "full_year") {
        quantity = 3;
        rule = `רמת פעילות ${level} ושנה מלאה: 2 בחציון הראשון ועוד 1 בחציון השני, סה״כ 3.`;
      } else {
        quantity = 2;
        rule = `רמת פעילות ${level} וחציון ראשון מלא: 2 בחציון הראשון.`;
      }
    } else {
      return {
        eligible: false,
        quantity: 0,
        escalate: true,
        title: "צריך החלטת מפקד",
        detail: "רמת הפעילות לא מכוסה בנוהל הזמני.",
      };
    }

    return {
      eligible: true,
      quantity,
      escalate: false,
      title: `זכאות: ${quantity}`,
      detail: `דרגה ${rank}, רמת פעילות ${level}, ${contractLabel}. ${rule}`,
    };
  }

  return {
    CATEGORIES,
    RANK_ORDER,
    lineName,
    sum,
    diffLines,
    uniformPolicyText,
    evaluateUniform,
  };
});
