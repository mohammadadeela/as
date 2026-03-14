import CategoryPage from "./CategoryPage";
import { useLanguage } from "@/i18n";
import { useSiteSettings, getSetting } from "@/hooks/use-site-settings";

export default function ClothesPage() {
  const { t, language } = useLanguage();
  const { data: siteSettings } = useSiteSettings();

  const heroImage = getSetting(siteSettings, "clothes_hero_image");
  const subtitle = language === "ar"
    ? getSetting(siteSettings, "clothes_hero_subtitle_ar")
    : getSetting(siteSettings, "clothes_hero_subtitle_en");

  return (
    <CategoryPage
      title={t.nav.clothes}
      subtitle={subtitle}
      categoryIds={[2, 3]}
      heroImage={heroImage}
    />
  );
}
