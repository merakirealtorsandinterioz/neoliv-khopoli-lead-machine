module.exports = function routeLead(stage, config) {
  return config.routing_rules[stage] || ["whatsapp"];
};
