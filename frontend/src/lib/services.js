import api from "./api";

const normalizeItem = (item) => {
  if (!item) return item;
  return {
    ...item,
    _id: item._id || item.id,
    id: item.id || item._id,
  };
};

const normalizeList = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeItem);
};

/* ── Auth ───────────────────────────────────────────────────────────── */
export const authApi = {
  login: async (data) => {
    const res = await api.post("/auth/login", data);
    return res;
  },

  register: async (data) => {
    const res = await api.post("/auth/register", data);
    return res;
  },

  me: async () => {
    const res = await api.get("/auth/me");
    return res;
  },

  updateProfile: async (data) => {
    const res = await api.put("/auth/profile", data);
    return res;
  },
};

/* ── Leads ──────────────────────────────────────────────────────────── */
export const leadsApi = {
  list: async (params) => {
    const res = await api.get("/leads", { params });
    const raw = res.leads || res.data || res || [];
    const leads = normalizeList(raw);
    return { success: true, count: leads.length, leads, data: leads };
  },

  get: async (id) => {
    const res = await api.get(`/leads/${id}`);
    const lead = normalizeItem(res.lead || res.data || res);
    return { success: true, lead, data: lead };
  },

  create: async (data) => {
    const res = await api.post("/leads", data);
    const lead = normalizeItem(res.lead || res.data || res);
    return { success: true, lead, data: lead };
  },

  update: async (id, data) => {
    const res = await api.put(`/leads/${id}`, data);
    const lead = normalizeItem(res.lead || res.data || res);
    return { success: true, lead, data: lead };
  },

  remove: async (id) => {
    const res = await api.delete(`/leads/${id}`);
    return res;
  },

  reorder: async (updates) => {
    const res = await api.patch("/leads/reorder", { updates });
    return res;
  },
};

/* ── Contacts ───────────────────────────────────────────────────────── */
export const contactsApi = {
  list: async (params) => {
    const res = await api.get("/contacts", { params });
    const raw = res.data || res.contacts || res || [];
    const contacts = normalizeList(raw);
    return { success: true, count: contacts.length, contacts, data: contacts };
  },

  get: async (id) => {
    const res = await api.get(`/contacts/${id}`);
    const contact = normalizeItem(res.data || res.contact || res);
    return { success: true, contact, data: contact };
  },

  create: async (data) => {
    const res = await api.post("/contacts", data);
    const contact = normalizeItem(res.data || res.contact || res);
    return { success: true, contact, data: contact };
  },

  update: async (id, data) => {
    const res = await api.put(`/contacts/${id}`, data);
    const contact = normalizeItem(res.data || res.contact || res);
    return { success: true, contact, data: contact };
  },

  remove: async (id) => {
    const res = await api.delete(`/contacts/${id}`);
    return res;
  },
};

/* ── Notes ──────────────────────────────────────────────────────────── */
export const notesApi = {
  list: async (params) => {
    const res = await api.get("/notes", { params });
    const raw = res.data || res.notes || res || [];
    const notes = normalizeList(raw);
    return { success: true, count: notes.length, notes, data: notes };
  },

  create: async (data) => {
    const res = await api.post("/notes", data);
    const note = normalizeItem(res.data || res.note || res);
    return { success: true, note, data: note };
  },

  update: async (id, data) => {
    const res = await api.put(`/notes/${id}`, data);
    const note = normalizeItem(res.data || res.note || res);
    return { success: true, note, data: note };
  },

  remove: async (id) => {
    const res = await api.delete(`/notes/${id}`);
    return res;
  },
};

/* ── Tasks ──────────────────────────────────────────────────────────── */
export const tasksApi = {
  list: async (params) => {
    const res = await api.get("/tasks", { params });
    const raw = res.data || res.tasks || res || [];
    const tasks = normalizeList(raw);
    return { success: true, count: tasks.length, tasks, data: tasks };
  },

  create: async (data) => {
    const res = await api.post("/tasks", data);
    const task = normalizeItem(res.data || res.task || res);
    return { success: true, task, data: task };
  },

  update: async (id, data) => {
    const res = await api.put(`/tasks/${id}`, data);
    const task = normalizeItem(res.data || res.task || res);
    return { success: true, task, data: task };
  },

  remove: async (id) => {
    const res = await api.delete(`/tasks/${id}`);
    return res;
  },
};

/* ── AI ─────────────────────────────────────────────────────────────── */
export const aiApi = {
  status: async () => {
    const res = await api.get("/ai/status");
    return res;
  },

  leadSummary: async (data) => {
    const res = await api.post("/ai/lead-summary", data);
    return res.data || res;
  },

  generateEmail: async (data) => {
    const res = await api.post("/ai/generate-email", data);
    return res.data || res;
  },

  salesInsights: async (data) => {
    const res = await api.post("/ai/sales-insights", data);
    return res.data || res;
  },
};

/* ── Analytics ──────────────────────────────────────────────────────── */
export const analyticsApi = {
  overview: async () => {
    const res = await api.get("/analytics/overview");
    const data = res.data || res;
    
    // Normalize recent leads inside overview
    if (data && data.recentLeads) {
      data.recentLeads = normalizeList(data.recentLeads);
    }
    return {
      success: true,
      stats: data.stats || {},
      pipeline: Array.isArray(data.pipeline)
        ? data.pipeline
        : Object.entries(data.pipeline || {}).map(([stage, val]) => ({
            stage: stage.charAt(0).toUpperCase() + stage.slice(1),
            count: val.count || 0,
            value: val.value || 0,
          })),
      trend: data.trend || [],
      recentLeads: data.recentLeads || [],
    };
  },
};
