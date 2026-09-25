/**
 * Point d’entrée Vercel pour le cron « relances devis ».
 * require("./lib/...") reste sous api/ pour un bundle fiable.
 */
require("dotenv").config();
const { authorizeCronRequest, executeDevisRelances } = require("./lib/devisRelancesJob");

function parseJsonBody(req) {
  return new Promise((resolve) => {
    if (req.method !== "POST" && req.method !== "PUT" && req.method !== "PATCH") {
      resolve({});
      return;
    }
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        raw = "";
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

module.exports = async (req, res) => {
  const denied = authorizeCronRequest(req);
  if (denied) {
    res.status(denied.status).json(denied.body);
    return;
  }
  try {
    const body = await parseJsonBody(req);
    const dryRun = Boolean(body.dryRun);
    const out = await executeDevisRelances({ dryRun });
    res.status(200).json(out);
  } catch (e) {
    console.error("[relances/devis] Fatal :", e);
    res.status(500).json({ ok: false, sent: 0, errors: [{ detail: e instanceof Error ? e.message : String(e) }] });
  }
};
