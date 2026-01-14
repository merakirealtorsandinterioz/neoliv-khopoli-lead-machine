const express = require("express");
const loadProject = require("./engine/projectLoader");
const normalize = require("./engine/normalizer");
const scoreLead = require("./engine/aiScorer");
const routeLead = require("./engine/router");

const app = express();
app.use(express.json());

app.post("/lead", async (req, res) => {
  try {
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";

    const projectId = req.body.project_id;
    if (!projectId || !req.body.phone) {
      return res.json({ success: true });
    }

    const project = loadProject(projectId);
    const clean = normalize(req.body);
    const ai = scoreLead(clean, project);
    const routing = routeLead(ai.lead_stage, project);

    const payload = {
      ...clean,
      project_id: project.project_id,
      project_name: project.project_name,
      lead_score: ai.lead_score,
      lead_stage: ai.lead_stage,
      persona: ai.persona,
      sales_note: ai.sales_note,
      routing,
      ip_address: ip,
      source: "AI Lead Engine v1"
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

  } catch (err) {
    res.json({ success: true });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("AI Engine v1 running"));
