import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "wouter";
import { type Product, type ColorVariant } from "@shared/schema";
import { useLanguage } from "@/i18n";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useLanguage();

  const price = parseFloat(product.price.toString()).toFixed(2);
  const discountPrice = product.discountPrice ? parseFloat(product.discountPrice.toString()).toFixed(2) : null;

  const cv = (product as any).colorVariants as ColorVariant[] | undefined;
  const hasVariants = cv && cv.length > 0;

  const [activeColorIdx, setActiveColorIdx] = useState<number | null>(null);
  const [hoveredColorIdx, setHoveredColorIdx] = useState<number | null>(null);
  const [isCardHovered, setIsCardHovered] = useState(false);

  const effectiveColorIdx = hoveredColorIdx !== null ? hoveredColorIdx : activeColorIdx;

  const { allImages, imageColorMap } = useMemo(() => {
    if (hasVariants && effectiveColorIdx !== null && cv[effectiveColorIdx]) {
      const v = cv[effectiveColorIdx];
      const imgs = [v.mainImage, ...(v.images || [])].filter(Boolean) as string[];
      return { allImages: imgs, imageColorMap: imgs.map(() => effectiveColorIdx) };
    }
    const imgs: string[] = [];
    const colorMap: number[] = [];
    if (hasVariants) {
      cv.forEach((v, colorIdx) => {
        if (v.mainImage) { imgs.push(v.mainImage); colorMap.push(colorIdx); }
        (v.images || []).forEach(img => { if (img) { imgs.push(img); colorMap.push(colorIdx); } });
      });
    } else {
      if (product.mainImage) { imgs.push(product.mainImage); colorMap.push(-1); }
      (product.images || []).forEach(img => { if (img) { imgs.push(img); colorMap.push(-1); } });
    }
    return { allImages: imgs, imageColorMap: colorMap };
  }, [product, cv, hasVariants, effectiveColorIdx]);

  const displayImage = useMemo(() => {
    if (hasVariants && effectiveColorIdx !== null && cv[effectiveColorIdx]) {
      return cv[effectiveColorIdx].mainImage;
    }
    return product.mainImage;
  }, [product, cv, hasVariants, effectiveColorIdx]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoColorIdx = effectiveColorIdx === null ? (imageColorMap[currentIdx] ?? -1) : null;

  const stopCycle = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startCycle = useCallback(() => {
    if (allImages.length <= 1) return;
    stopCycle();
    intervalRef.current = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % allImages.length);
    }, 2500);
  }, [allImages.length, stopCycle]);

  useEffect(() => {
    if (effectiveColorIdx !== null) { stopCycle(); setCurrentIdx(0); return stopCycle; }
    setCurrentIdx(0); startCycle(); return stopCycle;
  }, [effectiveColorIdx, allImages.length]);

  const handleSwatchClick = (e: React.MouseEvent, idx: number) => {
    e.preventDefault(); e.stopPropagation();
    stopCycle();
    if (activeColorIdx === idx) { setActiveColorIdx(null); startCycle(); }
    else { setActiveColorIdx(idx); setCurrentIdx(0); }
  };

  const handleSwatchHover = (e: React.MouseEvent, idx: number | null) => {
    e.preventDefault(); e.stopPropagation();
    setHoveredColorIdx(idx);
    if (idx !== null) { stopCycle(); setCurrentIdx(0); }
    else if (activeColorIdx === null) { startCycle(); }
  };

  return (
    <div
      className="group block cursor-pointer"
      data-testid={`card-product-${product.id}`}
      onMouseEnter={() => setIsCardHovered(true)}
      onMouseLeave={() => setIsCardHovered(false)}
    >
      {/* Image container */}
      <Link href={`/product/${product.id}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary mb-3">

          {/* NEW badge — top start */}
          {product.isNewArrival && (
            <div className="absolute top-3 start-3 z-20">
              <span
                className="bg-foreground text-background text-[10px] font-bold uppercase tracking-[0.15em] px-2.5 py-1 leading-none"
                data-testid={`badge-new-${product.id}`}
              >
                {t.product.new}
              </span>
            </div>
          )}

          {/* SALE badge — circle, top end */}
          {discountPrice && (
            <div className="absolute top-3 end-3 z-20">
              <span
                className="w-10 h-10 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wide flex items-center justify-center leading-none shadow"
                data-testid={`badge-sale-${product.id}`}
              >
                {t.product.sale}
              </span>
            </div>
          )}

          {/* Images */}
          {effectiveColorIdx !== null ? (
            <img
              src={displayImage}
              alt={product.name}
              className="absolute inset-0 object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div
              style={{
                position: "absolute", top: 0, left: 0,
                height: "100%", width: `${allImages.length * 100}%`,
                display: "flex",
                transform: `translateX(-${(currentIdx / allImages.length) * 100}%)`,
                transition: "transform 700ms ease-in-out",
              }}
            >
              {allImages.map((img, idx) => (
                <div key={idx} style={{ width: `${100 / allImages.length}%`, height: "100%", flexShrink: 0, overflow: "hidden" }}>
                  <img
                    src={img} alt={product.name}
                    style={{
                      width: "100%", height: "100%", objectFit: "cover", display: "block",
                      transform: isCardHovered ? "scale(1.05)" : "scale(1)",
                      transition: "transform 700ms ease-in-out",
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Hover dark overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-400 z-10" />

          {/* Carousel dots */}
          {allImages.length > 1 && effectiveColorIdx === null && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 z-20">
              {allImages.map((_, idx) => (
                <span
                  key={idx}
                  className={`rounded-full transition-all duration-300 ${
                    idx === currentIdx ? "w-4 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="space-y-2 px-0.5">
        <p className="text-[10px] text-muted-foreground/70 uppercase tracking-[0.2em] font-medium">
          {product.brand || "Lucerne Boutique"}
        </p>

        <Link href={`/product/${product.id}`}>
          <h3 className="font-semibold text-foreground text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-200">
            {product.name}
          </h3>
        </Link>

        {hasVariants && cv.length > 1 && (
          <div className="flex gap-1.5" data-testid={`swatches-${product.id}`}>
            {cv.map((v, idx) => (
              <button
                key={idx}
                onClick={(e) => handleSwatchClick(e, idx)}
                onMouseEnter={(e) => handleSwatchHover(e, idx)}
                onMouseLeave={(e) => handleSwatchHover(e, null)}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  activeColorIdx === idx || hoveredColorIdx === idx
                    ? "border-foreground scale-125 shadow"
                    : autoColorIdx === idx
                      ? "border-foreground/60 scale-110"
                      : "border-transparent hover:border-foreground/50"
                }`}
                style={{ backgroundColor: v.colorCode, boxShadow: "0 0 0 1px rgba(0,0,0,0.12)" }}
                title={v.name}
                data-testid={`swatch-${product.id}-${idx}`}
              />
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {discountPrice ? (
            <>
              <span className="font-bold text-destructive text-sm sm:text-base" data-testid={`text-discount-price-${product.id}`}>
                ₪{discountPrice}
              </span>
              <span className="text-xs text-muted-foreground/60 line-through" data-testid={`text-original-price-${product.id}`}>
                ₪{price}
              </span>
            </>
          ) : (
            <span className="font-bold text-sm sm:text-base" data-testid={`text-price-${product.id}`}>
              ₪{price}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
