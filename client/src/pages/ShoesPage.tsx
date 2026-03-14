import CategoryPage from "./CategoryPage";
import { useLanguage } from "@/i18n";
import { useSiteSettings, getSetting } from "@/hooks/use-site-settings";

export default function ShoesPage() {
  const { t, language } = useLanguage();
  const { data: siteSettings } = useSiteSettings();

  const heroImage = getSetting(siteSettings, "shoes_hero_image");
  const subtitle = language === "ar"
    ? getSetting(siteSettings, "shoes_hero_subtitle_ar")
    : getSetting(siteSettings, "shoes_hero_subtitle_en");

  return (
    <CategoryPage
      title={t.nav.shoes}
      subtitle={subtitle}
      categoryIds={[4]}
      heroImage={heroImage}
    />
  );
}
