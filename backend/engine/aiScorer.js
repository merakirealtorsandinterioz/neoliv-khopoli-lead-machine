module.exports = function scoreLead(data, config) {

  let score = 0;

  /* ─────────────────────────────
     INTENT
  ───────────────────────────── */
  if (config.intent_weights) {
    score += config.intent_weights[data.intent] || 0;
  }

  /* ─────────────────────────────
     TIMELINE
  ───────────────────────────── */
  if (config.timeline_weights) {
    score += config.timeline_weights[data.purchase_timeline] || 0;
  }

  /* ─────────────────────────────
     PLOT SIZE (NeoLiv)
  ───────────────────────────── */
  if (config.plot_size_weights && data.plot_size) {
    if (data.plot_size.includes("1500"))
      score += config.plot_size_weights["1500-2500"] || 0;
    else if (data.plot_size.includes("2500"))
      score += config.plot_size_weights["2500+"] || 0;
    else
      score += config.plot_size_weights["1000-1500"] || 0;
  }

  /* ─────────────────────────────
     CONFIGURATION (Irish)
  ───────────────────────────── */
  if (config.configuration_weights && data.configuration) {
    score += config.configuration_weights[data.configuration] || 0;
  }

  /* ─────────────────────────────
     BUDGET (Irish)
  ───────────────────────────── */
  if (config.budget_weights && data.budget) {
    score += config.budget_weights[data.budget] || 0;
  }

  /* ─────────────────────────────
     LEAD STAGE
  ───────────────────────────── */
  let stage = "cold";

  if (score >= 80) stage = "hot";
  else if (score >= 50) stage = "warm";

  return {
    lead_score: score,
    lead_stage: stage,

    persona:
      data.intent === "Self Use"
        ? "End User"
        : "Investor",

    sales_note:
      stage === "hot"
        ? "High urgency - priority follow-up"
        : stage === "warm"
        ? "Interested - follow up soon"
        : "Low urgency - nurture required"
  };
};
