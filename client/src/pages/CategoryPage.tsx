import { useState, useMemo, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ProductCard } from "@/components/ui/ProductCard";
import { useProducts } from "@/hooks/use-products";
import { useLanguage } from "@/i18n";
import type { ColorVariant } from "@shared/schema";
import { FilterPanel, type FilterState, type ColorOption } from "@/components/FilterPanel";

interface CategoryPageProps {
  title: string;
  subtitle: string;
  categoryIds: number[];
  heroImage: string;
}

export default function CategoryPage({ title, subtitle, categoryIds, heroImage }: CategoryPageProps) {
  const { data: products, isLoading } = useProducts();
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sort: null,
    sizes: [],
    colors: [],
    brands: [],
    priceRange: [0, 99999],
    inStockOnly: false,
    newArrivals: false,
    onSale: false,
  });

  const categoryProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => p.categoryId && categoryIds.includes(p.categoryId));
  }, [products, categoryIds]);

  const allColors = useMemo((): ColorOption[] => {
    const map = new Map<string, string>();
    categoryProducts.forEach((p) => {
      const cv = (p as any).colorVariants as ColorVariant[] | undefined;
      if (cv && cv.length > 0) {
        cv.forEach((v) => { if (!map.has(v.name)) map.set(v.name, v.colorCode || "#d1d5db"); });
      } else {
        (p.colors || []).forEach((c) => { if (!map.has(c)) map.set(c, "#d1d5db"); });
      }
    });
    return Array.from(map.entries()).map(([name, colorCode]) => ({ name, colorCode })).sort((a, b) => a.name.localeCompare(b.name));
  }, [categoryProducts]);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    categoryProducts.forEach((p) => {
      const cv = (p as any).colorVariants as ColorVariant[] | undefined;
      if (cv && cv.length > 0) cv.forEach((v) => (v.sizes || []).forEach((s: string) => set.add(s)));
      else (p.sizes || []).forEach((s) => set.add(s));
    });
    return Array.from(set);
  }, [categoryProducts]);

  const allBrands = useMemo(() => {
    const set = new Set<string>();
    categoryProducts.forEach((p) => { if (p.brand) set.add(p.brand); });
    return Array.from(set).sort();
  }, [categoryProducts]);

  const { minPrice, maxPrice } = useMemo(() => {
    if (categoryProducts.length === 0) return { minPrice: 0, maxPrice: 9999 };
    const prices = categoryProducts.map((p) => parseFloat(p.price.toString()));
    return { minPrice: Math.floor(Math.min(...prices)), maxPrice: Math.ceil(Math.max(...prices)) };
  }, [categoryProducts]);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, priceRange: [minPrice, maxPrice] }));
  }, [minPrice, maxPrice]);

  const filtered = useMemo(() => {
    let result = categoryProducts;
    if (search) result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
    if (filters.colors.length > 0) {
      result = result.filter((p) => {
        const cv = (p as any).colorVariants as ColorVariant[] | undefined;
        const cols = cv && cv.length > 0 ? cv.map((v) => v.name) : (p.colors || []);
        return cols.some((c) => filters.colors.some((fc) => fc.toLowerCase() === c.toLowerCase()));
      });
    }
    if (filters.sizes.length > 0) {
      result = result.filter((p) => {
        const cv = (p as any).colorVariants as ColorVariant[] | undefined;
        const szs: string[] = cv && cv.length > 0 ? cv.flatMap((v) => v.sizes || []) : (p.sizes || []);
        return szs.some((s) => filters.sizes.includes(s));
      });
    }
    if (filters.brands.length > 0) result = result.filter((p) => filters.brands.includes(p.brand || ""));
    result = result.filter((p) => {
      const price = parseFloat(p.price.toString());
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });
    if (filters.inStockOnly) result = result.filter((p) => (p.stockQuantity ?? 0) > 0);
    if (filters.newArrivals) result = result.filter((p) => p.isNewArrival);
    if (filters.onSale) result = result.filter((p) => !!p.discountPrice);
    if (filters.sort === "rising") result = [...result].sort((a, b) => parseFloat(a.price.toString()) - parseFloat(b.price.toString()));
    else if (filters.sort === "decreasing") result = [...result].sort((a, b) => parseFloat(b.price.toString()) - parseFloat(a.price.toString()));
    return result;
  }, [categoryProducts, search, filters]);

  const activeCount =
    (filters.sort ? 1 : 0) +
    filters.sizes.length + filters.colors.length + filters.brands.length +
    (filters.inStockOnly ? 1 : 0) + (filters.newArrivals ? 1 : 0) + (filters.onSale ? 1 : 0) +
    (filters.priceRange[0] > minPrice || filters.priceRange[1] < maxPrice ? 1 : 0);

  const clearAll = () => setFilters({ sort: null, sizes: [], colors: [], brands: [], priceRange: [minPrice, maxPrice], inStockOnly: false, newArrivals: false, onSale: false });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <section className="relative h-72 md:h-96 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={heroImage} alt={title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="font-display text-3xl sm:text-4xl md:text-6xl font-bold mb-3 tracking-tight" data-testid="text-category-title">{title}</h1>
          <p className="text-sm sm:text-base md:text-lg font-light opacity-90 max-w-xl mx-auto" data-testid="text-category-subtitle">{subtitle}</p>
        </div>
      </section>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-10">
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground text-sm" data-testid="text-product-count">
              {filtered.length} {t.shop.itemsCount}
            </p>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-xs text-muted-foreground underline hover:text-foreground" data-testid="button-clear-filters-top">
                {t.shop.clearFilters}
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
            <input
              type="text"
              placeholder={t.shop.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-b border-border bg-transparent px-2 py-2 focus:outline-none focus:border-primary transition-colors text-sm w-full sm:w-52"
              data-testid="input-category-search"
            />
            <button
              onClick={() => setFilterOpen(true)}
              className={`flex items-center gap-2 text-sm border px-4 py-2 transition-colors whitespace-nowrap ${activeCount > 0 ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-foreground"}`}
              data-testid="button-open-filter"
            >
              <SlidersHorizontal size={14} />
              {t.filter.title}
              {activeCount > 0 && (
                <span className="bg-primary-foreground text-primary text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted aspect-[3/4] mb-4"></div>
                <div className="h-4 bg-muted w-2/3 mb-2"></div>
                <div className="h-4 bg-muted w-1/4"></div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 sm:py-24 text-muted-foreground">
            <p data-testid="text-no-products">{t.shop.noProducts}</p>
            <button onClick={clearAll} className="mt-4 text-primary uppercase tracking-widest text-sm font-semibold underline" data-testid="button-clear-filters">
              {t.shop.clearFilters}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
      <Footer />

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        availableColors={allColors}
        availableSizes={allSizes}
        availableBrands={allBrands}
        minPrice={minPrice}
        maxPrice={maxPrice}
        filters={filters}
        onChange={setFilters}
      />
    </div>
  );
}
