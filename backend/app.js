const express = require("express");
const cors = require("cors");
const loadProject = require("./engine/projectLoader");
const normalize = require("./engine/normalizer");
const scoreLead = require("./engine/aiScorer");
const routeLead = require("./engine/router");

const app = express();

/* ─────────────────────────────────────────────
   🌐 CORS
───────────────────────────────────────────── */
app.use(cors({
  origin: "*",
  methods: ["POST", "GET", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.options("*", cors());
app.use(express.json());

/* ─────────────────────────────────────────────
   🔒 Soft throttling
───────────────────────────────────────────── */
const ipTracker = {};
const THROTTLE_WINDOW_MS = 60 * 1000;
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

    const now = Date.now();
    ipTracker[ip] = (ipTracker[ip] || []).filter(
      ts => now - ts < THROTTLE_WINDOW_MS
    );

    if (ipTracker[ip].length >= MAX_REQUESTS_PER_WINDOW) {
      return res.json({ success: true });
    }

    ipTracker[ip].push(now);

    const { project_id, phone } = req.body || {};
    if (!project_id || !phone) {
      return res.json({ success: true });
    }

    let project;
    try {
      project = loadProject(project_id);
    } catch {
      return res.json({ success: true });
    }

    const clean = normalize(req.body);

    // 🧠 AI CORE
    const ai = scoreLead(clean, project);
    const routing = routeLead(ai.lead_stage, project);

    // 🔥 Monetization bucket
    ai.lead_bucket =
      ai.lead_score >= 70 ? "HOT" :
      ai.lead_score >= 40 ? "WARM" :
      "COLD";

    const payload = {
      name: clean.email || `Lead ${clean.phone}`,
      phone: clean.phone,
      email: clean.email || "",

      ai_version: "v1",
      project_id: project.project_id,
      project_name: project.project_name,

      intent: clean.intent,
      plot_size: clean.plot_size,
      purchase_timeline: clean.purchase_timeline,

      lead_score: ai.lead_score,
      lead_bucket: ai.lead_bucket,
      lead_stage: ai.lead_stage,
      persona: ai.persona,
      sales_note: ai.sales_note,
      routing,

      page_url: clean.page_url || "",
      ip_address: ip,
      source: "AI Lead Engine v1",
      created_at: new Date().toISOString()
    };

    fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});

    fetch(process.env.PRIVYR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});

    res.json({ success: true, routing });

  } catch {
    res.json({ success: true });
  }
});

/* ─────────────────────────────────────────────
   🟢 SERVER START
───────────────────────────────────────────── */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("AI Lead Engine v1 (Monetization Ready) running");
});
