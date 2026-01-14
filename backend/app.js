const express = require("express");
const app = express();

app.use(express.json());

app.post("/lead", async (req, res) => {
  try {
    const body = req.body;

    // Soft validation
    if (!body.phone) {
      return res.json({ success: true });
    }

    // Capture real IP
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "";

    const payload = {
      intent: body.intent || "",
      location: body.location || "",
      budget: body.budget || "",
      plot_size: body.plot_size || "",
      purchase_timeline: body.purchase_timeline || "",
      lead_stage: "New",
      phone: body.phone,
      source: body.source || "NeoLiv Khopoli Landing",
      page_url: body.page_url || "",
      ip_address: ip
    };

    // Fire Google Sheets
    fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});

    // Fire Privyr
    fetch(process.env.PRIVYR_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).catch(() => {});

    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
