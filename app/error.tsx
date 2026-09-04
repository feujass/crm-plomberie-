"use client";

/** Boundary erreur racine — sans instrumentation debug (évite imports serveur côté client). */
export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Une erreur s’est produite</h1>
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-400">
        {process.env.NODE_ENV === "development" ? error.message : "Réessayez plus tard."}
      </p>
      <button
        type="button"
        className="mt-6 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-gray-100 dark:text-gray-900"
        onClick={() => reset()}
      >
        Réessayer
      </button>
    </div>
  );
}
