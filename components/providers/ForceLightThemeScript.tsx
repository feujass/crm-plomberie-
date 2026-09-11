import Script from "next/script";

/** Appliqué avant hydrate : empêche le flash / le mode sombre iOS sur le premier paint. */
export function ForceLightThemeScript() {
  return (
    <Script id="force-light-theme" strategy="beforeInteractive">{`
(function () {
  var root = document.documentElement;
  root.classList.remove("dark");
  root.classList.add("light");
  root.style.colorScheme = "light only";
})();
    `}</Script>
  );
}
