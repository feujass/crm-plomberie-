// PlombiCRM Theme Constants
export const Colors = {
  background: '#F4F4F5',
  surface: '#FFFFFF',
  primary: '#E15C32',
  primaryHover: '#C94824',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  border: '#E4E4E7',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#2563EB',
  draft: '#71717A',
};

export const StatusColors: Record<string, { bg: string; text: string }> = {
  brouillon: { bg: '#71717A', text: '#FFFFFF' },
  envoye: { bg: '#2563EB', text: '#FFFFFF' },
  accepte: { bg: '#16A34A', text: '#FFFFFF' },
  refuse: { bg: '#DC2626', text: '#FFFFFF' },
  expire: { bg: '#F59E0B', text: '#0F172A' },
  facture: { bg: '#7C3AED', text: '#FFFFFF' },
  emise: { bg: '#2563EB', text: '#FFFFFF' },
  payee: { bg: '#16A34A', text: '#FFFFFF' },
  partiellement_payee: { bg: '#F59E0B', text: '#0F172A' },
  en_retard: { bg: '#DC2626', text: '#FFFFFF' },
};

export const StatusLabels: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
  facture: 'Facturé',
  emise: 'Émise',
  payee: 'Payée',
  partiellement_payee: 'Partiellement payée',
  en_retard: 'En retard',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
