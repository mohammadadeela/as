import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/ui/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { Link } from "wouter";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { useLanguage } from "@/i18n";
import { useSiteSettings, getSetting } from "@/hooks/use-site-settings";

function ViewAllLink({ href, label, Arrow }: { href: string; label: string; Arrow: React.ElementType }) {
  return (
    <Link href={href}>
      <span
        className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-[0.2em] font-semibold border border-foreground overflow-hidden cursor-pointer"
        data-testid={`link-view-all-${href}`}
      >
        <span className="absolute inset-0 bg-foreground translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
        <span className="relative z-10 text-foreground group-hover:text-background transition-colors duration-300">{label}</span>
        <Arrow className="relative z-10 w-3.5 h-3.5 text-foreground group-hover:text-background transition-all duration-300 group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function SectionHeading({ title, subtitle, accent }: { title: string; subtitle?: string; accent?: string }) {
  return (
    <div className="relative">
      {accent && (
        <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2 font-medium">{accent}</span>
      )}
      <h2 className="font-display text-2xl sm:text-4xl font-semibold mb-2" data-testid="section-title">
        {title}
      </h2>
      <div className="flex items-center gap-3 mt-3">
        <span className="block h-px w-10 bg-foreground" />
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>
    </div>
  );
}

export default function Home() {
  const { data: products, isLoading } = useProducts();
  const { t, language } = useLanguage();
  const { data: siteSettings } = useSiteSettings();
  const Arrow = language === "ar" ? ArrowLeft : ArrowRight;

  const heroImage = getSetting(siteSettings, "home_hero_image");
  const heroTag = language === "ar" ? getSetting(siteSettings, "home_hero_tag_ar") : getSetting(siteSettings, "home_hero_tag_en");
  const heroTitle = language === "ar" ? getSetting(siteSettings, "home_hero_title_ar") : getSetting(siteSettings, "home_hero_title_en");
  const heroSubtitle = language === "ar" ? getSetting(siteSettings, "home_hero_subtitle_ar") : getSetting(siteSettings, "home_hero_subtitle_en");

  const featured = products?.filter((p) => p.isFeatured).slice(0, 6) || [];
  const newArrivals = products?.filter((p) => p.isNewArrival).slice(0, 6) || [];
  const bestSellers = products?.filter((p) => (p as any).isBestSeller).slice(0, 6) || [];
  const onSale =
    products
      ?.filter(
        (p) => p.discountPrice && parseFloat(p.discountPrice.toString()) > 0,
      )
      .slice(0, 6) || [];

  const skeletonGrid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-muted aspect-[3/4] mb-4" />
          <div className="h-4 bg-muted w-2/3 mb-2" />
          <div className="h-4 bg-muted w-1/4" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative h-[80vh] sm:h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
              alt="Hero Fashion"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
          </div>

          <div className="relative z-10 text-center text-white px-4">
            <span className="block text-[10px] sm:text-xs uppercase tracking-[0.4em] mb-4 opacity-80 font-light">
              {heroTag}
            </span>
            <h1
              className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold mb-4 sm:mb-6 tracking-tight text-balance"
              data-testid="text-hero-title"
            >
              {heroTitle}
            </h1>
            <p
              className="text-lg md:text-xl font-light mb-10 tracking-wide max-w-2xl mx-auto opacity-90"
              data-testid="text-hero-subtitle"
            >
              {heroSubtitle}
            </p>
            <Link href="/shop">
              <span
                className="group relative inline-flex items-center gap-3 px-10 py-4 text-sm uppercase tracking-widest border border-white overflow-hidden cursor-pointer"
                data-testid="button-shop-collection"
              >
                <span className="absolute inset-0 bg-white translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                <span className="relative z-10 text-white group-hover:text-black transition-colors duration-300 font-semibold">
                  {t.home.shopCollection}
                </span>
                <Arrow className="relative z-10 w-4 h-4 text-white group-hover:text-black transition-all duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </section>

        {/* New Arrivals */}
        <section className="py-12 sm:py-24 w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10 sm:mb-14">
            <SectionHeading
              title={t.home.newArrivals}
              subtitle={t.home.newArrivalsSubtitle}
              accent={language === "ar" ? "وصل حديثاً" : "Just In"}
            />
            <div className="hidden md:block">
              <ViewAllLink href="/shop" label={t.home.viewAll} Arrow={Arrow} />
            </div>
          </div>

          {isLoading ? skeletonGrid : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-10 md:hidden flex justify-center">
            <ViewAllLink href="/shop" label={t.home.viewAll} Arrow={Arrow} />
          </div>
        </section>

        {/* Best Sellers */}
        {bestSellers.length > 0 && (
          <section className="bg-secondary py-12 sm:py-24">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-end mb-10 sm:mb-14">
                <SectionHeading
                  title={t.home.bestSellers}
                  subtitle={t.home.bestSellersSubtitle}
                  accent={language === "ar" ? "الأكثر مبيعاً" : "Top Picks"}
                />
                <div className="hidden md:block">
                  <ViewAllLink href="/shop" label={t.home.viewAll} Arrow={Arrow} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                {bestSellers.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-10 md:hidden flex justify-center">
                <ViewAllLink href="/shop" label={t.home.viewAll} Arrow={Arrow} />
              </div>
            </div>
          </section>
        )}

        {/* Featured */}
        {featured.length > 0 && (
          <section className="py-12 sm:py-24">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-end mb-10 sm:mb-14">
                <SectionHeading
                  title={t.home.featured}
                  subtitle={t.home.featuredSubtitle}
                  accent={language === "ar" ? "مختارات مميزة" : "Curated For You"}
                />
                <div className="hidden md:block">
                  <ViewAllLink href="/shop" label={t.home.viewAll} Arrow={Arrow} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                {featured.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-10 md:hidden flex justify-center">
                <ViewAllLink href="/shop" label={t.home.viewAll} Arrow={Arrow} />
              </div>
            </div>
          </section>
        )}

        {/* On Sale */}
        {onSale.length > 0 && (
          <section className="bg-white py-12 sm:py-24">
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-end mb-10 sm:mb-14">
                <div className="relative">
                  <span className="block text-[10px] uppercase tracking-[0.3em] text-destructive mb-2 font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {language === "ar" ? "عروض حصرية" : "Limited Offers"}
                  </span>
                  <h2 className="font-display text-2xl sm:text-4xl font-semibold mb-2 text-destructive" data-testid="text-sales-title">
                    {t.home.sales}
                  </h2>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="block h-px w-10 bg-destructive" />
                    <p className="text-muted-foreground text-sm">{t.home.salesSubtitle}</p>
                  </div>
                </div>
                <div className="hidden md:block">
                  <Link href="/sales">
                    <span className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-[0.2em] font-semibold border border-destructive overflow-hidden cursor-pointer">
                      <span className="absolute inset-0 bg-destructive translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                      <span className="relative z-10 text-destructive group-hover:text-white transition-colors duration-300">{t.home.viewAll}</span>
                      <Arrow className="relative z-10 w-3.5 h-3.5 text-destructive group-hover:text-white transition-all duration-300 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                {onSale.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
              <div className="mt-10 md:hidden flex justify-center">
                <Link href="/sales">
                  <span className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-[0.2em] font-semibold border border-destructive overflow-hidden cursor-pointer">
                    <span className="absolute inset-0 bg-destructive translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                    <span className="relative z-10 text-destructive group-hover:text-white transition-colors duration-300">{t.home.viewAll}</span>
                    <Arrow className="relative z-10 w-3.5 h-3.5 text-destructive group-hover:text-white transition-all duration-300 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
