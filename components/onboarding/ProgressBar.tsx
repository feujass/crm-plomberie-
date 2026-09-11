export function OnboardingProgress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mb-6">
      <div className="mb-1 flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
        <span>Onboarding</span>
        <span>
          {step}/3
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-sky-600 transition-all"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}
