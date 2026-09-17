import { describe, expect, it } from "vitest";

import { profileUpdateFromBody } from "@/lib/supabase/row-maps";

describe("profileUpdateFromBody", () => {
  it("enregistre les mentions sans écrire les colonnes TVA générées", () => {
    const update = profileUpdateFromBody({
      mention_legale: "SARL Test",
      conditions_paiement: "30 jours",
      tva_sur_encaissements: true,
      tva_sur_debits_opt_in: false,
    });
    expect(update.mention_legale).toBe("SARL Test");
    expect(update.conditions_paiement_defaut).toBe("30 jours");
    expect(update).not.toHaveProperty("tva_sur_encaissements");
    expect(update).not.toHaveProperty("tva_sur_debits_opt_in");
    expect(update.regime_tva).toBe("encaissements");
  });

  it("mappe l’option débits vers regime_tva", () => {
    const update = profileUpdateFromBody({
      tva_sur_encaissements: false,
      tva_sur_debits_opt_in: true,
    });
    expect(update.regime_tva).toBe("debits");
    expect(update).not.toHaveProperty("tva_sur_encaissements");
  });

  it("ne change pas le régime si les deux cases sont décochées", () => {
    const update = profileUpdateFromBody({
      mention_legale: "ok",
      tva_sur_encaissements: false,
      tva_sur_debits_opt_in: false,
    });
    expect(update.mention_legale).toBe("ok");
    expect(update).not.toHaveProperty("regime_tva");
    expect(update).not.toHaveProperty("tva_sur_encaissements");
  });
});
