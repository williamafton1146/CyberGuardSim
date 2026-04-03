export type ScenarioSlug = "office" | "home" | "public-wifi";

export type ScenarioMeta = {
  slug: ScenarioSlug;
  title: string;
  theme: string;
  difficulty: "easy" | "medium" | "hard";
  isPlayable: boolean;
};

export const scenarioCatalog: ScenarioMeta[] = [
  {
    slug: "office",
    title: "Офис: письмо от ИТ-поддержки",
    theme: "Фишинг и социальная инженерия",
    difficulty: "easy",
    isPlayable: true
  },
  {
    slug: "home",
    title: "Дом: смарт-устройства и пароли",
    theme: "Брутфорс и слабая гигиена паролей",
    difficulty: "medium",
    isPlayable: false
  },
  {
    slug: "public-wifi",
    title: "Общественный Wi-Fi",
    theme: "Поддельные точки доступа и перехват трафика",
    difficulty: "medium",
    isPlayable: false
  }
];
