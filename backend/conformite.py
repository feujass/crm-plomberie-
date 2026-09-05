"""
Règles de conformité facturation / devis — France (réforme e-invoicing / e-reporting, BTP).
Logique pure (sans I/O) pour tests et réutilisation.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Literal, Optional, Tuple

ConformiteBranche = Literal[
    "b2b_fr_tva",
    "b2c",
    "secteur_public",
    "b2b_intl",
    "b2b_fr_non_assujetti",
]

OperationsType = Literal["biens", "services", "mixte"]


def normaliser_siret_siren(val: Optional[str]) -> str:
    if not val:
        return ""
    return re.sub(r"\s+", "", str(val).strip())


def derive_siren(siret_or_siren: str) -> Optional[str]:
    s = normaliser_siret_siren(siret_or_siren)
    if len(s) >= 9 and s[:9].isdigit():
        return s[:9]
    return None


def classify_client_branche(
    client: Optional[Dict[str, Any]],
) -> ConformiteBranche:
    """Détermine le rail de transmission principal (PDP e-invoicing vs e-reporting vs Chorus)."""
    if not client:
        return "b2c"
    if client.get("secteur_public") is True:
        return "secteur_public"
    cat = str(client.get("categorie_fiscale") or "").strip().lower()
    if cat == "particulier":
        return "b2c"
    if cat == "pro_non_assujetti":
        return "b2b_fr_non_assujetti"
    if cat == "pro_international":
        return "b2b_intl"
    ctype = str(client.get("type") or "").strip().lower()
    if ctype == "particulier":
        return "b2c"
    # professionnel par défaut : assujetti TVA France (à affiner côté produit)
    return "b2b_fr_tva"


def transmission_kinds_for_branche(branche: ConformiteBranche) -> List[str]:
    if branche == "b2b_fr_tva":
        return ["pdp_einvoicing"]
    if branche == "b2c":
        return ["pdp_ereporting"]
    if branche == "b2b_fr_non_assujetti":
        return ["pdp_ereporting"]
    if branche == "b2b_intl":
        return ["pdp_ereporting"]
    if branche == "secteur_public":
        return ["chorus_pro", "pdp_einvoicing"]
    return ["pdp_ereporting"]


def default_b2b_mentions_footer() -> str:
    """Mentions fréquemment exigées en facture B2B (à compléter par l'expert-comptable)."""
    return (
        "Pénalités de retard : au taux légal en vigueur. "
        "Indemnité forfaitaire pour frais de recouvrement en cas de retard de paiement : 40 € (B2B). "
        "Escompte pour paiement anticipé : néant sauf mention contraire."
    )


def validate_facture_emission(
    facture: Dict[str, Any],
    profile: Optional[Dict[str, Any]],
    client: Optional[Dict[str, Any]],
    *,
    operations_type_required_from: str = "2026-09-01",
) -> List[str]:
    """
    Retourne une liste d'avertissements / erreurs bloquantes (strings).
    `operations_type_required_from` est un placeholder de date réforme (côté produit : feature flag).
    """
    errors: List[str] = []
    if not facture.get("numero"):
        errors.append("Numéro de facture manquant.")
    if not facture.get("lignes"):
        errors.append("La facture doit contenir au moins une ligne.")
    branche = classify_client_branche(client)
    if branche == "b2b_fr_tva":
        p = profile or {}
        if not normaliser_siret_siren(str(p.get("siret") or "")):
            errors.append("SIRET émetteur recommandé pour factures B2B.")
        if not derive_siren(str(p.get("siren") or p.get("siret") or "")):
            errors.append("SIREN émetteur : renseignez le SIREN ou un SIRET valide pour dériver le SIREN.")
        c = client or {}
        if not normaliser_siret_siren(str(c.get("siret") or "")) and not normaliser_siret_siren(
            str(c.get("siren") or "")
        ):
            errors.append("Client professionnel : SIRET ou SIREN client recommandé.")
        # mentions B2B
        cond = str(p.get("conditions_paiement") or "")
        mention = str(p.get("mention_legale") or "")
        if "40" not in mention and "40" not in cond:
            errors.append(
                "Facture B2B : ajoutez l'indemnité forfaitaire de recouvrement (40 €) dans les mentions ou conditions."
            )
        if "pénalit" not in mention.lower() and "pénalit" not in cond.lower():
            errors.append("Facture B2B : mentionnez les pénalités de retard (taux légal).")
    if branche == "secteur_public":
        if not str(facture.get("chorus_service_code") or "").strip():
            errors.append("Secteur public : renseignez le code service / référence Chorus Pro sur la facture.")
    op = str(facture.get("operations_type") or "").strip()
    if op and op not in ("biens", "services", "mixte"):
        errors.append("Type d'opérations invalide (biens | services | mixte).")
    return errors


def chorus_export_payload(
    facture: Dict[str, Any],
    profile: Optional[Dict[str, Any]],
    client: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """Niveau 1 — export structuré pour dépôt manuel ou intégration API ultérieure."""
    p = profile or {}
    c = client or {}
    return {
        "format": "flowo.chorus_export.v1",
        "facture": {
            "numero": facture.get("numero"),
            "date_emission": facture.get("date_emission"),
            "date_echeance": facture.get("date_echeance"),
            "total_ht": facture.get("total_ht"),
            "total_tva": facture.get("total_tva"),
            "total_ttc": facture.get("total_ttc"),
            "lignes": facture.get("lignes"),
            "notes": facture.get("notes"),
            "chorus_service_code": facture.get("chorus_service_code"),
            "adresse_livraison_chantier": facture.get("adresse_livraison_chantier"),
            "operations_type": facture.get("operations_type"),
        },
        "emetteur": {
            "entreprise": p.get("entreprise"),
            "siret": p.get("siret"),
            "siren": p.get("siren"),
            "adresse": p.get("adresse"),
            "email_facturation": p.get("email_facturation"),
            "numero_tva_intracom": p.get("numero_tva_intracom"),
        },
        "destinataire_public": {
            "nom": c.get("nom"),
            "siret": c.get("siret"),
            "siren": c.get("siren"),
            "adresse": c.get("adresse"),
        },
    }


def ereporting_transaction_snapshot(facture: Dict[str, Any], client: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Données minimales pour e-reporting (à mapper vers le schéma PDP réel)."""
    pays = []
    for pmt in facture.get("paiements") or []:
        pays.append(
            {
                "montant": pmt.get("montant"),
                "date": pmt.get("date"),
                "mode": pmt.get("mode"),
            }
        )
    return {
        "format": "flowo.ereporting_snapshot.v1",
        "facture_id": facture.get("id"),
        "numero": facture.get("numero"),
        "date_emission": facture.get("date_emission"),
        "total_ht": facture.get("total_ht"),
        "total_tva": facture.get("total_tva"),
        "total_ttc": facture.get("total_ttc"),
        "operations_type": facture.get("operations_type"),
        "client_type": (client or {}).get("type"),
        "categorie_fiscale": (client or {}).get("categorie_fiscale"),
        "paiements": pays,
    }


def pdp_einvoice_snapshot(facture: Dict[str, Any], profile: Optional[Dict[str, Any]], client: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Snapshot pour e-invoicing B2B (Factur-X / UBL / CII via PDP — ici métadonnées uniquement)."""
    p = profile or {}
    c = client or {}
    return {
        "format": "flowo.pdp_einvoice_snapshot.v1",
        "facture_id": facture.get("id"),
        "numero": facture.get("numero"),
        "date_emission": facture.get("date_emission"),
        "totaux": {
            "ht": facture.get("total_ht"),
            "tva": facture.get("total_tva"),
            "ttc": facture.get("total_ttc"),
        },
        "operations_type": facture.get("operations_type"),
        "adresse_livraison_chantier": facture.get("adresse_livraison_chantier"),
        "emetteur": {
            "siren": p.get("siren") or derive_siren(str(p.get("siret") or "")),
            "siret": p.get("siret"),
            "nom": p.get("entreprise"),
        },
        "client": {
            "siren": c.get("siren") or derive_siren(str(c.get("siret") or "")),
            "siret": c.get("siret"),
            "nom": c.get("nom"),
            "tva_intracom": c.get("tva_intracom"),
        },
        "lignes": facture.get("lignes"),
    }


def simulation_status_for_env(simulate: bool, has_real_config: bool) -> Tuple[str, str]:
    """Retourne (status, detail_message)."""
    if simulate:
        return "simulated_ok", "PDP_SIMULATE=true : aucun envoi réel."
    if has_real_config:
        return "pending_send", "En attente d'envoi vers la PDP."
    return "configuration_required", "Configurez PDP_API_URL / PDP_API_KEY pour l'envoi réel."
