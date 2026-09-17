import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Flowo — devis vocal pour plombiers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0f766e 0%, #115e59 45%, #134e4a 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          padding: 56,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, paddingRight: 40 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 28,
              fontWeight: 700,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
              }}
            >
              F
            </div>
            Flowo
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.08, maxWidth: 620 }}>
            Devis vocal en 30 secondes
          </div>
          <div style={{ marginTop: 24, fontSize: 28, lineHeight: 1.35, opacity: 0.92, maxWidth: 560 }}>
            Parle de ton chantier. Zeus rédige le devis et l&apos;envoie à ton client.
          </div>
          <div style={{ marginTop: 32, fontSize: 22, opacity: 0.85 }}>Essai gratuit · sans carte bancaire</div>
        </div>
        <div
          style={{
            width: 380,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.12)",
              borderRadius: 24,
              padding: 28,
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <div style={{ fontSize: 18, opacity: 0.8, marginBottom: 12 }}>Nouveau devis vocal</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {[24, 36, 18, 42, 28, 34].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: 8,
                    height: h,
                    borderRadius: 4,
                    background: "rgba(255,255,255,0.85)",
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.5, opacity: 0.95 }}>
              « Remplacement chauffe-eau 200 L, pose et raccordements… »
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 18 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Z
            </div>
            Zeus · assistant IA
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
