const express = require("express");
const cors = require("cors"); // ✅ ADD
const loadProject = require("./engine/projectLoader");
const normalize = require("./engine/normalizer");
const scoreLead = require("./engine/aiScorer");
const routeLead = require("./engine/router");

const app = express();

/* ─────────────────────────────────────────────
   🌐 CORS (MANDATORY FOR BROWSER CALLS)
───────────────────────────────────────────── */
app.use(cors({
  origin: "*",
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors()); // ✅ Handle preflight
app.use(express.json());

/* ─────────────────────────────────────────────
   🔒 In-memory soft throttling (per IP)
───────────────────────────────────────────── */
const ipTracker = {};
const THROTTLE_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;


/* ─────────────────────────────────────────────
   🚀 MAIN LEAD ENDPOINT
───────────────────────────────────────────── */
app.post("/lead", async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    // ── Soft throttling (silent)
    const now = Date.now();
    ipTracker[ip] = ipTracker[ip] || [];
    ipTracker[ip] = ipTracker[ip].filter(
      (ts) => now - ts < THROTTLE_WINDOW_MS
    );

    if (ipTracker[ip].length >= MAX_REQUESTS_PER_WINDOW) {
      return res.json({ success: true });
    }

    ipTracker[ip].push(now);

    // ── Basic validation
    const { project_id, phone } = req.body || {};
    if (!project_id || !phone) {
      return res.json({ success: true });
    }

    // ── Load project (silent fail if unknown)
    let project;
    try {
      project = loadProject(project_id);
    } catch (e) {
      return res.json({ success: true });
    }

    // ── Normalize input
    const clean = normalize(req.body);

    // ── AI Intelligence
    const ai = scoreLead(clean, project);
    const routing = routeLead(ai.lead_stage, project);

     // 🔥 Monetization bucket (single source of truth)
ai.lead_bucket =
  ai.lead_score >= 70 ? "HOT" :
  ai.lead_score >= 40 ? "WARM" :
  "COLD";

    // ── Final enriched payload
    const payload = {
      // 🔑 Privyr required fields
      name: clean.email || `Lead ${clean.phone}`,
      phone: clean.phone,
      email: clean.email || "",

      // 🧠 AI metadata
      ai_version: "v1",
      project_id: project.project_id,
      project_name: project.project_name,
      intent: clean.intent,
      plot_size: clean.plot_size,
      purchase_timeline: clean.purchase_timeline,
      lead_score: ai.lead_score,
      lead_bucket: ai.lead_bucket,   // ✅ ADD THIS
      lead_stage: ai.lead_stage,
      persona: ai.persona,
      sales_note: ai.sales_note,
      routing,

      page_url: clean.page_url || "",
      ip_address: ip,
      source: "AI Lead Engine v1"
    };

    // ── Fire & forget → Google Sheets
    fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});

    // ── Fire & forget → Privyr
    fetch(process.env.PRIVYR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});

    // ── Instant response (UX NEVER BLOCKS)
    res.json({
      success: true,
      ai_version: "v1",
      routing
    });

  } catch (err) {
    // Absolute fail-safe
    res.json({ success: true });
  }
});

/* ─────────────────────────────────────────────
   🟢 SERVER START
───────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("AI Lead Engine v1 (Hardened) running");
});
