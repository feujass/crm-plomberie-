"use client";

import { APP_NAME } from "@/lib/app-branding";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import { BackgroundWave } from "@/components/login/BackgroundWave";

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(" ");

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg";
  }
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:pointer-events-none disabled:opacity-50",
        size === "default" && "h-10 px-4 py-2",
        size === "sm" && "h-9 px-3",
        size === "lg" && "h-11 px-8",
        variant === "outline" && "border border-[#2a2d3a] bg-[#13151f] hover:bg-[#1a1d2b]",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = "Button";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-10 w-full rounded-md border border-[#2a2d3a] bg-[#13151f] px-3 py-2 text-base text-gray-200 ring-offset-[#090b13] placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

type RoutePoint = { x: number; y: number; delay: number };

const BASE_W = 320;
const BASE_H = 600;

const DOTMAP_ROUTES: { start: RoutePoint; end: RoutePoint; color: string }[] = [
  { start: { x: 100, y: 150, delay: 0 }, end: { x: 200, y: 80, delay: 2 }, color: "#3b82f6" },
  { start: { x: 200, y: 80, delay: 2 }, end: { x: 260, y: 120, delay: 4 }, color: "#3b82f6" },
  { start: { x: 50, y: 50, delay: 1 }, end: { x: 150, y: 180, delay: 3 }, color: "#3b82f6" },
  { start: { x: 280, y: 60, delay: 0.5 }, end: { x: 180, y: 180, delay: 2.5 }, color: "#3b82f6" },
];

function scalePoint(p: RoutePoint, w: number, h: number): RoutePoint {
  return { x: (p.x / BASE_W) * w, y: (p.y / BASE_H) * h, delay: p.delay };
}

const DotMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const generateDots = (width: number, height: number) => {
    const dots: { x: number; y: number; radius: number; opacity: number }[] = [];
    const gap = 12;
    const dotRadius = 1;

    for (let x = 0; x < width; x += gap) {
      for (let y = 0; y < height; y += gap) {
        const isInMapShape =
          (x < width * 0.25 && x > width * 0.05 && y < height * 0.4 && y > height * 0.1) ||
          (x < width * 0.25 && x > width * 0.15 && y < height * 0.8 && y > height * 0.4) ||
          (x < width * 0.45 && x > width * 0.3 && y < height * 0.35 && y > height * 0.15) ||
          (x < width * 0.5 && x > width * 0.35 && y < height * 0.65 && y > height * 0.35) ||
          (x < width * 0.7 && x > width * 0.45 && y < height * 0.5 && y > height * 0.1) ||
          (x < width * 0.8 && x > width * 0.65 && y < height * 0.8 && y > height * 0.6);

        if (isInMapShape && Math.random() > 0.3) {
          dots.push({ x, y, radius: dotRadius, opacity: Math.random() * 0.5 + 0.1 });
        }
      }
    }
    return dots;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });

    resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const c = ctx;

    const dots = generateDots(dimensions.width, dimensions.height);
    const scaledRoutes = DOTMAP_ROUTES.map((route) => ({
      ...route,
      start: scalePoint(route.start, dimensions.width, dimensions.height),
      end: scalePoint(route.end, dimensions.width, dimensions.height),
    }));

    let animationFrameId = 0;
    let startTime = Date.now();

    function drawDots() {
      c.clearRect(0, 0, dimensions.width, dimensions.height);
      dots.forEach((dot) => {
        c.beginPath();
        c.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        c.fillStyle = `rgba(255, 255, 255, ${dot.opacity})`;
        c.fill();
      });
    }

    function drawRoutes() {
      const currentTime = (Date.now() - startTime) / 1000;

      scaledRoutes.forEach((route) => {
        const elapsed = currentTime - route.start.delay;
        if (elapsed <= 0) return;

        const duration = 3;
        const progress = Math.min(elapsed / duration, 1);

        const x = route.start.x + (route.end.x - route.start.x) * progress;
        const y = route.start.y + (route.end.y - route.start.y) * progress;

        c.beginPath();
        c.moveTo(route.start.x, route.start.y);
        c.lineTo(x, y);
        c.strokeStyle = route.color;
        c.lineWidth = 1.5;
        c.stroke();

        c.beginPath();
        c.arc(route.start.x, route.start.y, 3, 0, Math.PI * 2);
        c.fillStyle = route.color;
        c.fill();

        c.beginPath();
        c.arc(x, y, 3, 0, Math.PI * 2);
        c.fillStyle = "#60a5fa";
        c.fill();

        c.beginPath();
        c.arc(x, y, 6, 0, Math.PI * 2);
        c.fillStyle = "rgba(96, 165, 250, 0.3)";
        c.fill();

        if (progress === 1) {
          c.beginPath();
          c.arc(route.end.x, route.end.y, 3, 0, Math.PI * 2);
          c.fillStyle = route.color;
          c.fill();
        }
      });
    }

    function animate() {
      drawDots();
      drawRoutes();

      const currentTime = (Date.now() - startTime) / 1000;
      if (currentTime > 15) {
        startTime = Date.now();
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions.width, dimensions.height]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};

export function LoginForm({
  redirectTo,
  backendConfigured,
  passwordResetOk = false,
}: {
  redirectTo: string;
  backendConfigured: boolean;
  passwordResetOk?: boolean;
}) {
  const router = useRouter();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authDisabled = !backendConfigured;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (authDisabled) {
      setError(
        "Auth indisponible : configurez Supabase (NEXT_PUBLIC_SUPABASE_*) ou BACKEND_URL dans les variables d'environnement."
      );
      return;
    }
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = (await res.json().catch(() => null)) as unknown;
    setLoading(false);
    if (!res.ok) {
      const msg = backendErrorMessage(json) ?? "Connexion impossible";
      setError(msg);
      return;
    }
    router.replace(redirectTo);
  }

  // OAuth Google non implémenté côté backend FastAPI pour l’instant.

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center p-4">
      <BackgroundWave />
      <motion.div
        initial={false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative z-10 flex w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50"
      >
        <div className="relative hidden h-[600px] w-1/2 overflow-hidden border-r border-gray-200 bg-gray-50 md:block dark:border-gray-800 dark:bg-gray-925">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-925 dark:to-gray-900">
            <DotMap />
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mb-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
                  <ArrowRight className="h-6 w-6 text-white" />
                </div>
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
                className="mb-2 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-center text-3xl font-bold text-transparent"
              >
                {APP_NAME}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="max-w-xs text-center text-sm text-gray-600 dark:text-gray-400"
              >
                Devis, chantiers, clients et facturation — pilotez votre activité depuis un seul tableau de bord.
              </motion.p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-10">
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <h1 className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl dark:text-gray-50">Bon retour</h1>
            <p className="mb-2 text-gray-600 dark:text-gray-400">Connectez-vous à votre compte</p>
            <p className="mb-8 text-sm">
              <Link href="/" className="text-blue-500 hover:text-blue-400">
                ← Découvrir Flowo sans se connecter
              </Link>
            </p>

            {authDisabled ? (
              <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Connexion indisponible : configurez{" "}
                <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_URL</code> et{" "}
                <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> sur Vercel, ou{" "}
                <code className="rounded bg-black/30 px-1">BACKEND_URL</code> pour le mode FastAPI local.
              </p>
            ) : null}

            {passwordResetOk ? (
              <p className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                Mot de passe réinitialisé. Tu peux te connecter avec ton nouveau mot de passe.
              </p>
            ) : null}

            {error ? (
              <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
            ) : null}

            {/* OAuth Google : non implémenté côté backend FastAPI pour l’instant. */}

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#2a2d3a]" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-400 dark:bg-gray-900">ou</span>
              </div>
            </div>

            <form className="space-y-5" onSubmit={(e) => void onSubmit(e)}>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
                  Email <span className="text-blue-500">*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.fr"
                  required
                  disabled={authDisabled}
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
                  Mot de passe <span className="text-blue-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={isPasswordVisible ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={authDisabled}
                    className="w-full pr-10"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                    aria-label={isPasswordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="pt-2"
              >
                <Button
                  type="submit"
                  disabled={loading || authDisabled}
                  className={cn(
                    "relative w-full overflow-hidden rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 py-2 text-white transition-all duration-300 hover:from-blue-500 hover:to-indigo-500",
                    isHovered ? "shadow-lg shadow-blue-500/25" : ""
                  )}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {loading ? "Connexion…" : "Se connecter"}
                    {!loading ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
                  </span>
                  {isHovered ? (
                    <motion.span
                      initial={{ left: "-100%" }}
                      animate={{ left: "100%" }}
                      transition={{ duration: 1, ease: "easeInOut" }}
                      className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      style={{ filter: "blur(8px)" }}
                    />
                  ) : null}
                </Button>
              </motion.div>

              <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm">
                <Link href="/forgot-password" className="text-blue-500 transition-colors hover:text-blue-400">
                  Mot de passe oublié ?
                </Link>
                <span className="text-gray-500">
                  Pas encore de compte ?{" "}
                  <Link href="/register" className="text-blue-500 hover:text-blue-400">
                    Créer un compte
                  </Link>
                </span>
              </div>
            </form>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function backendErrorMessage(json: unknown) {
  if (!json || typeof json !== "object") return null;
  const rec = json as Record<string, unknown>;
  return typeof rec.error === "string" ? rec.error : null;
}
