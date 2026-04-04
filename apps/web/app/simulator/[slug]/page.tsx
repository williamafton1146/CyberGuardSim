import { notFound } from "next/navigation";

import { MissionExperience } from "@/components/scenario/MissionExperience";

export const dynamic = "force-dynamic";

const supportedSlugs = ["office", "home", "public-wifi"] as const;

type MissionPageProps = {
  params: {
    slug: string;
  };
};

export default function MissionPage({ params }: MissionPageProps) {
  if (!supportedSlugs.includes(params.slug as (typeof supportedSlugs)[number])) {
    notFound();
  }

  return <MissionExperience slug={params.slug as "office" | "home" | "public-wifi"} />;
}
