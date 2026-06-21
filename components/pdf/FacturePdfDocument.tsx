import { Document, Page, StyleSheet, Text, View, Image } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 16, marginBottom: 8 },
  table: { marginTop: 12 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  th: { fontWeight: "bold" },
  col1: { width: "40%" },
  col2: { width: "10%", textAlign: "right" },
  col3: { width: "10%", textAlign: "center" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "10%", textAlign: "right" },
  col6: { width: "15%", textAlign: "right" },
  totals: { marginTop: 16, alignSelf: "flex-end", width: "45%" },
  footer: { marginTop: 24, fontSize: 8, color: "#64748b" },
});

type ProfilePdf = {
  entreprise_nom: string | null;
  adresse: string | null;
  tel: string | null;
  email_facturation: string | null;
  siret: string | null;
  logo_url: string | null;
  mention_legale: string | null;
  conditions_paiement_defaut: string | null;
};

type ClientPdf = { nom: string; prenom: string | null; adresse: string | null } | null;

type LignePdf = {
  id: string;
  designation: string;
  quantite: number;
  unite: string;
  prix_ht: number;
  tva: number;
  total_ht: number;
};

export function FacturePdfDocument({
  profile,
  client,
  numero,
  dateEmissionLabel,
  lignes,
  total_ht,
  total_tva,
  total_ttc,
  notes,
}: {
  profile: ProfilePdf;
  client: ClientPdf;
  numero: string;
  dateEmissionLabel: string;
  lignes: LignePdf[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  notes: string | null;
}) {
  const clientName = client ? [client.prenom, client.nom].filter(Boolean).join(" ") || client.nom : "—";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {profile.logo_url ? (
              /* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image sans alt */
              <Image src={profile.logo_url} style={{ width: 72, height: 72, objectFit: "contain" }} />
            ) : null}
            <Text style={styles.title}>{profile.entreprise_nom || "Entreprise"}</Text>
            <Text>{profile.adresse}</Text>
            <Text>{profile.tel}</Text>
            <Text>{profile.email_facturation}</Text>
            <Text>SIRET : {profile.siret || "—"}</Text>
          </View>
          <View>
            <Text style={styles.title}>Facture {numero}</Text>
            <Text>Date d&apos;émission : {dateEmissionLabel}</Text>
            <Text>Client : {clientName}</Text>
            <Text>Adresse / chantier : {client?.adresse || "—"}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.th]}>
            <Text style={styles.col1}>Désignation</Text>
            <Text style={styles.col2}>Qté</Text>
            <Text style={styles.col3}>Unité</Text>
            <Text style={styles.col4}>PU HT</Text>
            <Text style={styles.col5}>TVA %</Text>
            <Text style={styles.col6}>Total HT</Text>
          </View>
          {lignes.map((l) => (
            <View key={l.id} style={styles.row} wrap={false}>
              <Text style={styles.col1}>{l.designation}</Text>
              <Text style={styles.col2}>{l.quantite}</Text>
              <Text style={styles.col3}>{l.unite}</Text>
              <Text style={styles.col4}>{l.prix_ht.toFixed(2)} €</Text>
              <Text style={styles.col5}>{l.tva}%</Text>
              <Text style={styles.col6}>{l.total_ht.toFixed(2)} €</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <Text>Total HT : {total_ht.toFixed(2)} €</Text>
          <Text>Total TVA : {total_tva.toFixed(2)} €</Text>
          <Text style={{ marginTop: 4, fontSize: 11 }}>Total TTC : {total_ttc.toFixed(2)} €</Text>
        </View>

        {notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontWeight: "bold" }}>Notes et conditions (visibles client)</Text>
            <Text>{notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          {profile.mention_legale ? <Text>{profile.mention_legale}</Text> : null}
          {profile.conditions_paiement_defaut ? <Text>{profile.conditions_paiement_defaut}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}
