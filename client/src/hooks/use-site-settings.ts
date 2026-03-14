import { useQuery } from "@tanstack/react-query";

export function useSiteSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 1000 * 60 * 5,
  });
}

export const defaultSettings: Record<string, string> = {
  home_hero_image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=80&fit=crop",
  home_hero_tag_ar: "مجموعة جديدة",
  home_hero_tag_en: "New Collection",
  home_hero_title_ar: "إعادة تعريف الأناقة",
  home_hero_title_en: "Redefining Elegance",
  home_hero_subtitle_ar: "اكتشفي مجموعتنا المنتقاة من القطع الخالدة المصممة للمرأة العصرية.",
  home_hero_subtitle_en: "Discover our curated collection of timeless pieces designed for the modern woman.",

  dresses_hero_image: "https://images.unsplash.com/photo-1595777457583-95e059d5bf08?w=1920&q=80&fit=crop",
  dresses_hero_subtitle_ar: "تشكيلة فساتين أنيقة لكل مناسبة",
  dresses_hero_subtitle_en: "Elegant dresses for every occasion",

  clothes_hero_image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=1920&q=80&fit=crop",
  clothes_hero_subtitle_ar: "ملابس عصرية راقية لإطلالتك اليومية",
  clothes_hero_subtitle_en: "Modern attire for your everyday look",

  shoes_hero_image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=1920&q=80&fit=crop",
  shoes_hero_subtitle_ar: "أحذية أنيقة لكل خطوة",
  shoes_hero_subtitle_en: "Elegant shoes for every step",

  sales_hero_image: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=1920&q=80&fit=crop",
  sales_hero_subtitle_ar: "أفضل العروض والتخفيضات المختارة لك",
  sales_hero_subtitle_en: "Best deals and discounts selected for you",
};

export function getSetting(settings: Record<string, string> | undefined, key: string): string {
  return settings?.[key] ?? defaultSettings[key] ?? "";
}
