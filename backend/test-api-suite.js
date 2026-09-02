import fetch from "node-fetch";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";

let passedCount = 0;
let failedCount = 0;
const results = [];

const log = (title, status, detail = "") => {
  const icon = status === "PASS" ? "✅" : "❌";
  console.log(`${icon} [${status}] ${title} ${detail ? "- " + detail : ""}`);
  if (status === "PASS") passedCount++;
  else failedCount++;
  results.push({ title, status, detail });
};

async function runTests() {
  console.log("==========================================================");
  console.log(`🚀 STARTING COMPREHENSIVE CRM API LOGIC TEST SUITE`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log("==========================================================\n");

  let authToken = "";
  let testUser = null;
  let createdLeadId = null;
  let createdContactId = null;
  let createdNoteId = null;
  let createdTaskId = null;
  const uniqueSuffix = Date.now();
  const testEmail = `testuser_${uniqueSuffix}@salescrm.test`;
  const testPassword = "Password@123";

  // 1. HEALTH CHECK
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (res.status === 200 && data.status === "ok") {
      log("Health Check GET /api/health", "PASS", `Status 200, Service: ${data.service}`);
    } else {
      log("Health Check GET /api/health", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Health Check GET /api/health", "FAIL", err.message);
  }

  // 2. AUTHENTICATION & SECURITY
  // 2.1 Register validation failure (missing password)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Incomplete User", email: "inc@test.com" }),
    });
    const data = await res.json();
    if (res.status === 400 && data.success === false) {
      log("Auth Register (Validation failure on missing fields)", "PASS", "Correctly returned 400 Bad Request");
    } else {
      log("Auth Register (Validation failure on missing fields)", "FAIL", `Expected 400, got ${res.status}`);
    }
  } catch (err) {
    log("Auth Register (Validation failure)", "FAIL", err.message);
  }

  // 2.2 Register valid user
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Runner User",
        email: testEmail,
        password: testPassword,
        company: "Test Enterprise Corp",
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.token && data.user) {
      authToken = data.token;
      testUser = data.user;
      log("Auth Register POST /api/auth/register", "PASS", `User created (ID: ${data.user.id}, Email: ${data.user.email})`);
    } else {
      log("Auth Register POST /api/auth/register", "FAIL", `Status ${res.status}: ${data.message || ""}`);
    }
  } catch (err) {
    log("Auth Register POST /api/auth/register", "FAIL", err.message);
  }

  // 2.3 Register duplicate email (Conflict 409)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Duplicate User",
        email: testEmail,
        password: testPassword,
      }),
    });
    const data = await res.json();
    if (res.status === 409 && data.success === false) {
      log("Auth Register (Duplicate email handling)", "PASS", "Correctly rejected duplicate with 409 Conflict");
    } else {
      log("Auth Register (Duplicate email handling)", "FAIL", `Expected 409, got ${res.status}`);
    }
  } catch (err) {
    log("Auth Register (Duplicate email handling)", "FAIL", err.message);
  }

  // 2.4 Login invalid credentials
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "WrongPassword" }),
    });
    const data = await res.json();
    if (res.status === 401 && data.success === false) {
      log("Auth Login (Invalid password)", "PASS", "Correctly rejected invalid credentials with 401 Unauthorized");
    } else {
      log("Auth Login (Invalid password)", "FAIL", `Expected 401, got ${res.status}`);
    }
  } catch (err) {
    log("Auth Login (Invalid password)", "FAIL", err.message);
  }

  // 2.5 Login valid credentials
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.token) {
      authToken = data.token;
      log("Auth Login POST /api/auth/login", "PASS", "Login successful, JWT token acquired");
    } else {
      log("Auth Login POST /api/auth/login", "FAIL", `Status ${res.status}: ${data.message || ""}`);
    }
  } catch (err) {
    log("Auth Login POST /api/auth/login", "FAIL", err.message);
  }

  // 2.6 Protected route without token (expect 401)
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    const data = await res.json();
    if (res.status === 401) {
      log("Security Check (Access protected route without token)", "PASS", "Correctly rejected with 401 Unauthorized");
    } else {
      log("Security Check (Access protected route without token)", "FAIL", `Expected 401, got ${res.status}`);
    }
  } catch (err) {
    log("Security Check without token", "FAIL", err.message);
  }

  // 2.7 Get Current User Profile GET /api/auth/me
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.user.email === testEmail.toLowerCase()) {
      log("Auth Profile GET /api/auth/me", "PASS", `Retrieved profile for ${data.user.name}`);
    } else {
      log("Auth Profile GET /api/auth/me", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Auth Profile GET /api/auth/me", "FAIL", err.message);
  }

  // 2.8 Update Profile PUT /api/auth/profile
  try {
    const res = await fetch(`${BASE_URL}/api/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Updated Test User",
        company: "Acme Global Solutions",
        avatar: "https://example.com/avatar.jpg",
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.user.company === "Acme Global Solutions") {
      log("Auth Update Profile PUT /api/auth/profile", "PASS", `Updated user name & company`);
    } else {
      log("Auth Update Profile PUT /api/auth/profile", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Auth Update Profile PUT /api/auth/profile", "FAIL", err.message);
  }

  // 3. LEADS API
  // 3.1 Create Lead POST /api/leads
  try {
    const res = await fetch(`${BASE_URL}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Enterprise Cloud Security Suite",
        company: "CyberShield Security",
        email: "security@cybershield.io",
        phone: "+1 555-0321",
        status: "Proposal",
        priority: "High",
        source: "Referral",
        value: 75000,
        notes: "Interested in full-stack cloud audit and quarterly penetration testing.",
        tags: ["Cloud", "Security", "Enterprise"],
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.lead && data.lead.id) {
      createdLeadId = data.lead.id;
      log("Leads Create POST /api/leads", "PASS", `Lead created ID: ${createdLeadId}, Value: $${data.lead.value}`);
    } else {
      log("Leads Create POST /api/leads", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log("Leads Create POST /api/leads", "FAIL", err.message);
  }

  // 3.2 Create second lead for filtering/ordering tests
  let secondLeadId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/leads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "AI Analytics License Deal",
        company: "DeepMetrics Inc",
        email: "contact@deepmetrics.ai",
        phone: "+1 555-0999",
        status: "Qualified",
        priority: "Medium",
        source: "Website",
        value: 30000,
        tags: ["AI", "Analytics"],
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.lead) {
      secondLeadId = data.lead.id;
    }
  } catch (err) {}

  // 3.3 Get Leads GET /api/leads (with filters)
  try {
    const res = await fetch(`${BASE_URL}/api/leads?status=Proposal`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && Array.isArray(data.leads) && data.leads.some(l => l.id === createdLeadId)) {
      log("Leads List & Filter GET /api/leads?status=Proposal", "PASS", `Found ${data.count} leads`);
    } else {
      log("Leads List & Filter GET /api/leads?status=Proposal", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Leads List & Filter", "FAIL", err.message);
  }

  // 3.4 Get Leads Search GET /api/leads?search=CyberShield
  try {
    const res = await fetch(`${BASE_URL}/api/leads?search=CyberShield`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.leads.length > 0 && data.leads[0].company === "CyberShield Security") {
      log("Leads Search GET /api/leads?search=CyberShield", "PASS", `Search returned matching lead`);
    } else {
      log("Leads Search GET /api/leads?search=CyberShield", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Leads Search", "FAIL", err.message);
  }

  // 3.5 Get Single Lead GET /api/leads/:id
  try {
    const res = await fetch(`${BASE_URL}/api/leads/${createdLeadId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.lead.id === createdLeadId) {
      log(`Leads Get by ID GET /api/leads/${createdLeadId}`, "PASS", `Retrieved lead: ${data.lead.name}`);
    } else {
      log(`Leads Get by ID GET /api/leads/${createdLeadId}`, "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Leads Get by ID", "FAIL", err.message);
  }

  // 3.6 Update Lead PUT /api/leads/:id
  try {
    const res = await fetch(`${BASE_URL}/api/leads/${createdLeadId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        value: 82000,
        notes: "Updated terms: agreed on enterprise 3-year support SLA.",
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.lead.value === 82000) {
      log(`Leads Update PUT /api/leads/${createdLeadId}`, "PASS", `Updated value to $${data.lead.value}`);
    } else {
      log(`Leads Update PUT /api/leads/${createdLeadId}`, "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Leads Update", "FAIL", err.message);
  }

  // 3.7 Reorder Leads PATCH /api/leads/reorder
  try {
    const res = await fetch(`${BASE_URL}/api/leads/reorder`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        updates: [
          { id: createdLeadId, status: "Won", order: 0 },
          { id: secondLeadId, status: "Proposal", order: 1 },
        ],
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      log("Leads Reorder PATCH /api/leads/reorder", "PASS", "Updated pipeline stages and order");
    } else {
      log("Leads Reorder PATCH /api/leads/reorder", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Leads Reorder", "FAIL", err.message);
  }

  // 4. CONTACTS API
  // 4.1 Create Contact POST /api/contacts
  try {
    const res = await fetch(`${BASE_URL}/api/contacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: "Dr. Jonathan Vance",
        email: "jonathan.vance@cybershield.io",
        phone: "+1 555-4819",
        company: "CyberShield Security",
        title: "Chief Information Security Officer",
        tags: ["Executive", "Security", "Key Decision Maker"],
        notes: "Met at RSA Conference 2026.",
        favorite: true,
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.data && data.data.id) {
      createdContactId = data.data.id;
      log("Contacts Create POST /api/contacts", "PASS", `Contact created ID: ${createdContactId}, Name: ${data.data.name}`);
    } else {
      log("Contacts Create POST /api/contacts", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Contacts Create POST /api/contacts", "FAIL", err.message);
  }

  // 4.2 Get Contacts GET /api/contacts (filter & search)
  try {
    const res = await fetch(`${BASE_URL}/api/contacts?search=Jonathan`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.data.some(c => c.id === createdContactId)) {
      log("Contacts List & Search GET /api/contacts?search=Jonathan", "PASS", `Found contact (${data.count} results)`);
    } else {
      log("Contacts List & Search", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Contacts List & Search", "FAIL", err.message);
  }

  // 4.3 Get Single Contact GET /api/contacts/:id
  try {
    const res = await fetch(`${BASE_URL}/api/contacts/${createdContactId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.data.id === createdContactId) {
      log(`Contacts Get by ID GET /api/contacts/${createdContactId}`, "PASS", `Retrieved ${data.data.name} (${data.data.title})`);
    } else {
      log("Contacts Get by ID", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Contacts Get by ID", "FAIL", err.message);
  }

  // 4.4 Update Contact PUT /api/contacts/:id
  try {
    const res = await fetch(`${BASE_URL}/api/contacts/${createdContactId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: "Senior VP & CISO",
        favorite: false,
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.data.title === "Senior VP & CISO") {
      log(`Contacts Update PUT /api/contacts/${createdContactId}`, "PASS", `Updated title to "${data.data.title}"`);
    } else {
      log("Contacts Update", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Contacts Update", "FAIL", err.message);
  }

  // 5. NOTES API
  // 5.1 Create Note POST /api/notes
  try {
    const res = await fetch(`${BASE_URL}/api/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        content: "Executive review completed. Client requested an updated security architecture diagram.",
        lead: createdLeadId,
        contact: createdContactId,
        pinned: true,
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.data && data.data.id) {
      createdNoteId = data.data.id;
      log("Notes Create POST /api/notes", "PASS", `Note created ID: ${createdNoteId}, Pinned: ${data.data.pinned}`);
    } else {
      log("Notes Create POST /api/notes", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log("Notes Create POST /api/notes", "FAIL", err.message);
  }

  // 5.2 Get Notes GET /api/notes (filtered by lead)
  try {
    const res = await fetch(`${BASE_URL}/api/notes?lead=${createdLeadId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.data.some(n => n.id === createdNoteId)) {
      log(`Notes List GET /api/notes?lead=${createdLeadId}`, "PASS", `Retrieved ${data.count} linked notes`);
    } else {
      log("Notes List", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Notes List", "FAIL", err.message);
  }

  // 5.3 Update Note PUT /api/notes/:id
  try {
    const res = await fetch(`${BASE_URL}/api/notes/${createdNoteId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        content: "Updated note: Diagram sent and approved by CISO.",
        pinned: false,
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.data.content.includes("approved")) {
      log(`Notes Update PUT /api/notes/${createdNoteId}`, "PASS", "Updated note content");
    } else {
      log("Notes Update", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Notes Update", "FAIL", err.message);
  }

  // 6. TASKS API
  // 6.1 Create Task POST /api/tasks
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);

  try {
    const res = await fetch(`${BASE_URL}/api/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        title: "Send finalized SLA and Statement of Work",
        description: "Include customized enterprise uptime warranty and penalty clauses.",
        dueDate: dueDate.toISOString(),
        status: "Pending",
        priority: "High",
        relatedLead: createdLeadId,
        relatedContact: createdContactId,
      }),
    });
    const data = await res.json();
    if (res.status === 201 && data.success && data.data && data.data.id) {
      createdTaskId = data.data.id;
      log("Tasks Create POST /api/tasks", "PASS", `Task created ID: ${createdTaskId}, Title: "${data.data.title}"`);
    } else {
      log("Tasks Create POST /api/tasks", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log("Tasks Create POST /api/tasks", "FAIL", err.message);
  }

  // 6.2 Get Tasks GET /api/tasks (filter by status)
  try {
    const res = await fetch(`${BASE_URL}/api/tasks?status=Pending`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.data.some(t => t.id === createdTaskId)) {
      log("Tasks List & Filter GET /api/tasks?status=Pending", "PASS", `Found ${data.count} pending tasks`);
    } else {
      log("Tasks List & Filter", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Tasks List & Filter", "FAIL", err.message);
  }

  // 6.3 Update Task PUT /api/tasks/:id (Mark Completed -> verify completedAt auto-set)
  try {
    const res = await fetch(`${BASE_URL}/api/tasks/${createdTaskId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        status: "Completed",
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.data.status === "Completed" && data.data.completedAt) {
      log(`Tasks Update PUT /api/tasks/${createdTaskId} (Complete logic)`, "PASS", `Task marked Completed, completedAt set to ${data.data.completedAt}`);
    } else {
      log("Tasks Update (Complete logic)", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log("Tasks Update", "FAIL", err.message);
  }

  // 7. AI SERVICES API
  // 7.1 AI Status GET /api/ai/status
  try {
    const res = await fetch(`${BASE_URL}/api/ai/status`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      log("AI Status GET /api/ai/status", "PASS", `AI Configured: ${data.configured}, Model: ${data.model}`);
    } else {
      log("AI Status GET /api/ai/status", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("AI Status", "FAIL", err.message);
  }

  // 7.2 AI Lead Summary POST /api/ai/lead-summary
  try {
    const res = await fetch(`${BASE_URL}/api/ai/lead-summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        leadId: createdLeadId,
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.summary && typeof data.riskScore === "number") {
      log("AI Lead Summary POST /api/ai/lead-summary", "PASS", `Generated summary with riskScore ${data.riskScore} & nextBestAction: "${data.nextBestAction}"`);
    } else {
      log("AI Lead Summary POST /api/ai/lead-summary", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log("AI Lead Summary", "FAIL", err.message);
  }

  // 7.3 AI Email Draft POST /api/ai/generate-email
  try {
    const res = await fetch(`${BASE_URL}/api/ai/generate-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        leadId: createdLeadId,
        purpose: "follow-up on SOC2 architecture diagram",
        tone: "executive",
      }),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.subject && data.body) {
      log("AI Email Draft POST /api/ai/generate-email", "PASS", `Subject: "${data.subject}"`);
    } else {
      log("AI Email Draft POST /api/ai/generate-email", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("AI Email Draft", "FAIL", err.message);
  }

  // 7.4 AI Sales Insights POST /api/ai/sales-insights
  try {
    const res = await fetch(`${BASE_URL}/api/ai/sales-insights`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (res.status === 200 && data.success && data.insights && data.recommendations) {
      log("AI Sales Insights POST /api/ai/sales-insights", "PASS", `HealthScore: ${data.healthScore}, Insights count: ${data.insights.length}`);
    } else {
      log("AI Sales Insights POST /api/ai/sales-insights", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("AI Sales Insights", "FAIL", err.message);
  }

  // 8. ANALYTICS API
  // 8.1 Analytics Overview GET /api/analytics/overview
  try {
    const res = await fetch(`${BASE_URL}/api/analytics/overview`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (
      res.status === 200 &&
      data.success &&
      data.data.stats &&
      typeof data.data.stats.totalPipelineValue === "number" &&
      typeof data.data.stats.winRate === "number" &&
      Array.isArray(data.data.trend)
    ) {
      log(
        "Analytics Overview GET /api/analytics/overview",
        "PASS",
        `Total Leads: ${data.data.stats.totalLeads}, Pipeline Value: $${data.data.stats.totalPipelineValue}, Win Rate: ${data.data.stats.winRate}%`
      );
    } else {
      log("Analytics Overview GET /api/analytics/overview", "FAIL", `Status ${res.status}: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    log("Analytics Overview", "FAIL", err.message);
  }

  // 9. CLEANUP / DELETE OPERATIONS
  // 9.1 Delete Task
  try {
    const res = await fetch(`${BASE_URL}/api/tasks/${createdTaskId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      log(`Tasks Delete DELETE /api/tasks/${createdTaskId}`, "PASS", "Task deleted successfully");
    } else {
      log("Tasks Delete", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Tasks Delete", "FAIL", err.message);
  }

  // 9.2 Delete Note
  try {
    const res = await fetch(`${BASE_URL}/api/notes/${createdNoteId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      log(`Notes Delete DELETE /api/notes/${createdNoteId}`, "PASS", "Note deleted successfully");
    } else {
      log("Notes Delete", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Notes Delete", "FAIL", err.message);
  }

  // 9.3 Delete Contact
  try {
    const res = await fetch(`${BASE_URL}/api/contacts/${createdContactId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      log(`Contacts Delete DELETE /api/contacts/${createdContactId}`, "PASS", "Contact deleted successfully");
    } else {
      log("Contacts Delete", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Contacts Delete", "FAIL", err.message);
  }

  // 9.4 Delete Lead
  try {
    const res = await fetch(`${BASE_URL}/api/leads/${createdLeadId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 200 && data.success) {
      log(`Leads Delete DELETE /api/leads/${createdLeadId}`, "PASS", "Lead deleted successfully");
    } else {
      log("Leads Delete", "FAIL", `Status ${res.status}`);
    }
  } catch (err) {
    log("Leads Delete", "FAIL", err.message);
  }

  // 10. ERROR HANDLING & 404
  // 10.1 Access deleted lead (Expect 404)
  try {
    const res = await fetch(`${BASE_URL}/api/leads/${createdLeadId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (res.status === 404) {
      log("Error Handling (Access non-existent lead)", "PASS", "Correctly returned 404 Lead not found");
    } else {
      log("Error Handling (Access non-existent lead)", "FAIL", `Expected 404, got ${res.status}`);
    }
  } catch (err) {
    log("Error Handling (Access non-existent lead)", "FAIL", err.message);
  }

  // 10.2 Unknown route 404
  try {
    const res = await fetch(`${BASE_URL}/api/non-existent-route`);
    const data = await res.json();
    if (res.status === 404 && data.success === false) {
      log("Error Handling (Unknown API route)", "PASS", `Correctly returned 404: ${data.message}`);
    } else {
      log("Error Handling (Unknown API route)", "FAIL", `Expected 404, got ${res.status}`);
    }
  } catch (err) {
    log("Error Handling (Unknown API route)", "FAIL", err.message);
  }

  console.log("\n==========================================================");
  console.log(`📊 TEST SUITE EXECUTION SUMMARY`);
  console.log(`Total Tests Run: ${passedCount + failedCount}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Success Rate: ${Math.round((passedCount / (passedCount + failedCount)) * 100)}%`);
  console.log("==========================================================\n");
}

runTests();
