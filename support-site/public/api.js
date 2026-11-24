window.IdfApi = (() => {
  const fallback = location.port === "3000"
    ? `${location.protocol}//${location.hostname}:4000`
    : location.origin;

  function base() {
    return (localStorage.getItem("idf_api_base") || fallback).replace(/\/$/, "");
  }

  async function request(path, options) {
    let response;
    try {
      response = await fetch(base() + path, options);
    } catch (error) {
      const failure = new Error("מקור הנתונים לא זמין");
      failure.cause = error;
      throw failure;
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const failure = new Error(data.error || "הבקשה נכשלה");
      failure.status = response.status;
      throw failure;
    }
    return data;
  }

  function send(path, body) {
    return request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  return {
    base,
    setBase(url) {
      localStorage.setItem("idf_api_base", String(url || "").trim().replace(/\/$/, ""));
    },
    clearBase() {
      localStorage.removeItem("idf_api_base");
    },
    health: () => request("/api/health"),
    accounts: () => request("/api/demo-accounts"),
    sap: (tz) => request(`/api/soldiers/${tz}/sap`),
    card: (tz) => request(`/api/soldiers/${tz}/card`),
    conscript: (tz, phone) => send("/api/auth/conscript", { tz, phone }),
    careerCode: (last4) => send("/api/auth/career/code", { last4 }),
    careerVerify: (last4, code) => send("/api/auth/career/verify", { last4, code }),
  };
})();

window.DeskApi = (() => {
  function token() {
    return sessionStorage.getItem("staff_token") || "";
  }

  async function request(path, options = {}) {
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    if (token()) headers["x-staff-token"] = token();
    const response = await fetch(path, Object.assign({}, options, { headers }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const failure = new Error(data.error || "הבקשה נכשלה");
      failure.status = response.status;
      throw failure;
    }
    return data;
  }

  function send(path, body) {
    return request(path, { method: "POST", body: JSON.stringify(body || {}) });
  }

  return {
    staffLogin: (username, password) => send("/api/auth/staff", { username, password }),
    createTicket: (payload) => send("/api/tickets", payload),
    tickets: (query) => request(`/api/tickets${query}`),
    reply: (id, text) => send(`/api/tickets/${id}/reply`, { text }),
    escalate: (id) => send(`/api/tickets/${id}/escalate`),
    close: (id) => send(`/api/tickets/${id}/close`),
    decide: (id, decision, text) => send(`/api/tickets/${id}/decide`, { decision, text }),
  };
})();
