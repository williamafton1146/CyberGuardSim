type StatCardProps = {
  label: string;
  value: string;
  accent?: "safe" | "alert" | "muted";
};

export function StatCard({ label, value, accent = "muted" }: StatCardProps) {
  const accentClass = {
    safe: "border-safe/40 bg-safe/10 text-safe",
    alert: "border-alert/40 bg-alert/10 text-alert",
    muted: "border-white/10 bg-white/5 text-white"
  }[accent];

  return (
    <div className={`rounded-3xl border p-5 shadow-ambient ${accentClass}`}>
      <p className="text-xs uppercase tracking-[0.3em] text-current/70">{label}</p>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
    </div>
  );
}

