module.exports = function normalize(input) {
  return {
    intent: input.intent?.toLowerCase() || "",
    plot_size: input.plot_size || "",
    purchase_timeline: input.purchase_timeline || "",
    phone: input.phone || "",
    email: input.email || "",
    page_url: input.page_url || ""
  };
};
