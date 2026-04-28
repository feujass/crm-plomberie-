export function backendBaseUrl() {
  const url = process.env.BACKEND_URL?.trim();
  if (!url) {
    throw new Error(
      "BACKEND_URL manquant : configure l'URL du backend FastAPI (ex: http://localhost:8000) dans .env.local (voir .env.example).",
    );
  }
  return url.replace(/\/+$/, "");
}

