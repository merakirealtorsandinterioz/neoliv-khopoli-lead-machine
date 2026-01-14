module.exports = function scoreLead(data, config) {
  let score = 0;

  score += config.intent_weights[data.intent] || 0;
  score += config.timeline_weights[data.purchase_timeline] || 0;

  if (data.plot_size.includes("1500")) score += config.plot_size_weights["1500-2500"];
  else if (data.plot_size.includes("2500")) score += config.plot_size_weights["2500+"];
  else score += config.plot_size_weights["1000-1500"];

  let stage = "cold";
  if (score >= 80) stage = "hot";
  else if (score >= 50) stage = "warm";

  return {
    lead_score: score,
    lead_stage: stage,
    persona:
      data.intent === "buy"
        ? "End User – Weekend Home Buyer"
        : "Long-Term Investor",
    sales_note:
      stage === "hot"
        ? "High urgency, premium fit"
        : stage === "warm"
        ? "Interested but follow-up needed"
        : "Low urgency"
  };
};
