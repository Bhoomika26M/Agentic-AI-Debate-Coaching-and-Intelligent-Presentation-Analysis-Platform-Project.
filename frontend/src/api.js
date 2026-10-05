const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("debate_coach_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("debate_coach_token", token);
  else localStorage.removeItem("debate_coach_token");
}

async function request(path, { method = "GET", body, form = false } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let payload = body;
  if (body && !form) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const data = await res.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    } catch (_) {
      /* ignore */
    }
    throw new Error(detail);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (email, password) => {
    const form = new URLSearchParams();
    form.append("username", email);
    form.append("password", password);
    return request("/auth/login", { method: "POST", body: form, form: true });
  },
  me: () => request("/users/me"),
  updateProfile: (payload) => request("/users/me", { method: "PUT", body: payload }),

  createSession: (payload) => request("/debates/sessions", { method: "POST", body: payload }),
  listSessions: () => request("/debates/sessions"),
  submitArgument: (payload) => request("/debates/arguments", { method: "POST", body: payload }),
  listArguments: (sessionId) => request(`/debates/sessions/${sessionId}/arguments`),

  dashboard: () => request("/dashboard"),
};
