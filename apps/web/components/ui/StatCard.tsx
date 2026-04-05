type StatCardProps = {
  label: string;
  value: string;
  accent?: "safe" | "alert" | "muted";
};

export function StatCard({ label, value, accent = "muted" }: StatCardProps) {
  const accentClass = {
    safe: "border-[var(--color-border-strong)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
    alert: "border-[rgba(255,114,92,0.28)] bg-[var(--color-alert-soft)] text-[var(--color-alert)]",
    muted: "border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text-primary)]"
  }[accent];

  return (
    <div className={`rounded-[1.6rem] border p-5 ${accentClass}`}>
      <p className="text-xs uppercase tracking-[0.22em] text-current/70">{label}</p>
      <p className="mt-4 text-3xl font-semibold leading-none">{value}</p>
    </div>
  );
}
