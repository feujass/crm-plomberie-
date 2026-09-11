"use client";

import { APP_NAME } from "@/lib/app-branding";
import { CircleBackLink } from "@/components/ui/CircleBackLink";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { BackgroundWave } from "@/components/login/BackgroundWave";
import { DotMap } from "@/components/login/DotMap";

type AuthShellProps = {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  children: React.ReactNode;
};

export function AuthShell({
  title,
  subtitle,
  backHref = "/login",
  backLabel = "Retour connexion",
  heroTitle,
  heroSubtitle,
  children,
}: AuthShellProps) {
  const panelTitle = heroTitle ?? APP_NAME;
  const panelSubtitle =
    heroSubtitle ?? "Devis, chantiers, clients et facturation — pilotez votre activité depuis un seul tableau de bord.";
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center bg-[#090b13] p-4 font-sans antialiased">
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
                {panelTitle}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="max-w-xs text-center text-sm text-gray-600 dark:text-gray-400"
              >
                {panelSubtitle}
              </motion.p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col justify-center p-8 md:w-1/2 md:p-10">
          <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <div className="mb-6">
              <CircleBackLink href={backHref} label={backLabel} />
            </div>
            <h1 className="mb-1 text-2xl font-bold text-gray-900 md:text-3xl dark:text-gray-50">{title}</h1>
            <p className="mb-8 text-gray-600 dark:text-gray-400">{subtitle}</p>
            {children}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
