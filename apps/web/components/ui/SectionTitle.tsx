type SectionTitleProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionTitle({ eyebrow, title, description }: SectionTitleProps) {
  return (
    <div className="space-y-4">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="text-3xl font-semibold leading-[1.08] text-[var(--color-text-primary)] md:text-4xl">{title}</h2>
      <p className="max-w-2xl text-sm leading-8 text-[var(--color-text-muted)] md:text-base">{description}</p>
    </div>
  );
}
