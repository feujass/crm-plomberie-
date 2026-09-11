"""Tests unitaires conformité (sans MongoDB) — unittest (stdlib)."""

from __future__ import annotations

import unittest

from conformite import (
    classify_client_branche,
    derive_siren,
    simulation_status_for_env,
    transmission_kinds_for_branche,
    validate_facture_emission,
)


class ConformiteTest(unittest.TestCase):
    def test_derive_siren(self) -> None:
        self.assertEqual(derive_siren("12345678901234"), "123456789")
        self.assertEqual(derive_siren("123 456 789 01234"), "123456789")
        self.assertIsNone(derive_siren(""))

    def test_classify_branche(self) -> None:
        self.assertEqual(classify_client_branche({"type": "particulier"}), "b2c")
        self.assertEqual(
            classify_client_branche({"secteur_public": True, "type": "professionnel"}),
            "secteur_public",
        )
        self.assertEqual(
            classify_client_branche({"type": "professionnel", "categorie_fiscale": "pro_assujetti"}),
            "b2b_fr_tva",
        )
        self.assertEqual(
            classify_client_branche({"categorie_fiscale": "pro_non_assujetti"}),
            "b2b_fr_non_assujetti",
        )

    def test_transmission_kinds(self) -> None:
        self.assertEqual(transmission_kinds_for_branche("b2b_fr_tva"), ["pdp_einvoicing"])
        self.assertEqual(transmission_kinds_for_branche("b2c"), ["pdp_ereporting"])
        self.assertIn("chorus_pro", transmission_kinds_for_branche("secteur_public"))

    def test_simulation_status(self) -> None:
        s, _ = simulation_status_for_env(True, False)
        self.assertEqual(s, "simulated_ok")
        s2, _ = simulation_status_for_env(False, True)
        self.assertEqual(s2, "pending_send")
        s3, _ = simulation_status_for_env(False, False)
        self.assertEqual(s3, "configuration_required")

    def test_validate_facture_b2b_warnings(self) -> None:
        facture = {
            "numero": "F-1",
            "lignes": [{"designation": "x", "quantite": 1, "prix_ht": 10, "tva": 10}],
            "chorus_service_code": "",
        }
        profile = {"siret": "", "siren": "", "mention_legale": "", "conditions_paiement": ""}
        client = {"type": "professionnel", "categorie_fiscale": "pro_assujetti", "siret": ""}
        errs = validate_facture_emission(facture, profile, client)
        self.assertTrue(any("SIRET émetteur" in e for e in errs))
        self.assertTrue(any("40" in e for e in errs))


if __name__ == "__main__":
    unittest.main()
