import { useParams } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useProduct, useProducts } from "@/hooks/use-products";
import { useCart } from "@/store/use-cart";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Minus, Plus, ShoppingBag, Check, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import { useLanguage } from "@/i18n";
import type { ColorVariant } from "@shared/schema";
import { ProductCard } from "@/components/ui/ProductCard";


export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(Number(id));
  const { data: allProducts } = useProducts();
  const { addToCart, items: cartItems } = useCart();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const scrollThumbs = (dir: "up" | "down") => {
    if (!thumbsRef.current) return;
    thumbsRef.current.scrollBy({ top: dir === "up" ? -120 : 120, behavior: "smooth" });
  };

  const variants: ColorVariant[] = useMemo(() => {
    if (!product) return [];
    const cv = (product as any).colorVariants as ColorVariant[] | undefined;
    if (cv && cv.length > 0) return cv;
    const inv = (product as any).sizeInventory || {};
    return [{
      name: "Default",
      colorCode: "#000000",
      mainImage: product.mainImage,
      images: product.images || [],
      sizes: product.sizes || [],
      sizeInventory: Object.keys(inv).length > 0 ? inv : {},
    }];
  }, [product]);

  const hasMultipleColors = variants.length > 1 || (variants.length === 1 && variants[0].name !== "Default");
  const activeVariant = variants[selectedColorIdx] || variants[0];

  const allImages = useMemo(() => {
    if (!activeVariant) return [];
    return [activeVariant.mainImage, ...(activeVariant.images || [])].filter(Boolean);
  }, [activeVariant]);

  // One thumbnail per color variant (mainImage only)
  const colorThumbnails = useMemo(() => {
    return variants.map((v, idx) => ({ image: v.mainImage, idx })).filter(t => t.image);
  }, [variants]);

  const sizes = activeVariant?.sizes || [];
  const sizeInv = activeVariant?.sizeInventory || {};
  const hasSizes = sizes.length > 0;

  const selectedSizeStock = selectedSize && sizeInv[selectedSize] !== undefined ? sizeInv[selectedSize] : null;
  const colorName = hasMultipleColors ? activeVariant?.name : undefined;
  const cartQtyForThis = cartItems.reduce((sum, ci) => {
    if (
      ci.product.id === Number(id) &&
      ci.color === colorName &&
      ci.size === (selectedSize || undefined)
    ) {
      return sum + ci.quantity;
    }
    return sum;
  }, 0);
  const availableStock = hasSizes
    ? (selectedSize ? Math.max(0, (selectedSizeStock ?? 0) - cartQtyForThis) : 0)
    : Math.max(0, (product?.stockQuantity ?? 0) - cartQtyForThis);
  const canAdd = hasSizes ? (!!selectedSize && availableStock > 0) : availableStock > 0;

  useEffect(() => {
    setSelectedSize("");
    setQuantity(1);
    setSelectedImageIdx(0);
  }, [selectedColorIdx]);

  useEffect(() => {
    setSelectedSize("");
    setQuantity(1);
    setSelectedColorIdx(0);
    setSelectedImageIdx(0);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  const relatedProducts = useMemo(() => {
    if (!product || !allProducts) return [];
    return allProducts
      .filter((p) => p.id !== product.id && p.categoryId === product.categoryId)
      .slice(0, 12);
  }, [product, allProducts]);

  const scrollRelated = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 300;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (isLoading) return <div className="min-h-screen pt-20 flex items-center justify-center"><Navbar /><div className="w-8 h-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" /></div>;
  if (!product) return <div className="min-h-screen pt-20 flex items-center justify-center"><Navbar /><div data-testid="text-product-not-found">{t.product.notFound}</div></div>;

  const price = parseFloat(product.price.toString()).toFixed(2);
  const discountPrice = product.discountPrice ? parseFloat(product.discountPrice.toString()).toFixed(2) : null;

  const handleAddToCart = () => {
    if (hasSizes && !selectedSize) {
      toast({ title: t.product.selectSize, variant: "destructive" });
      return;
    }
    if (hasMultipleColors && !activeVariant) {
      toast({ title: t.product.selectColor, variant: "destructive" });
      return;
    }
    addToCart(product as any, quantity, selectedSize, colorName);
    toast({
      title: t.product.addedToCart,
      description: `${quantity}x ${product.name}${colorName ? ` (${colorName})` : ""} ${t.product.addedToCartDesc}`
    });
  };

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[48%_52%] gap-6 sm:gap-10 lg:gap-14">

          <div className="flex gap-2 sm:gap-3">
            {colorThumbnails.length > 1 && (
              <div className="flex flex-col items-center gap-1.5 w-[72px] sm:w-[88px] flex-shrink-0">
                <button
                  onClick={() => scrollThumbs("up")}
                  className="w-full flex items-center justify-center py-1 border border-border hover:border-foreground transition-colors flex-shrink-0"
                  data-testid="button-thumbs-up"
                  aria-label="Scroll up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <div
                  ref={thumbsRef}
                  className="flex flex-col gap-2 overflow-hidden flex-1"
                  style={{ scrollbarWidth: "none" }}
                >
                  {colorThumbnails.map((t) => (
                    <button
                      key={t.idx}
                      onClick={() => setSelectedColorIdx(t.idx)}
                      className={`w-full aspect-[3/4] bg-secondary overflow-hidden flex-shrink-0 transition-all ${
                        selectedColorIdx === t.idx
                          ? "ring-2 ring-offset-0 ring-primary"
                          : "opacity-55 hover:opacity-100"
                      }`}
                      data-testid={`button-gallery-image-${t.idx}`}
                    >
                      <img src={t.image} alt={variants[t.idx]?.name || `Color ${t.idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => scrollThumbs("down")}
                  className="w-full flex items-center justify-center py-1 border border-border hover:border-foreground transition-colors flex-shrink-0"
                  data-testid="button-thumbs-down"
                  aria-label="Scroll down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex-1 bg-secondary overflow-hidden" style={{ aspectRatio: "3/4", maxHeight: "580px" }}>
              <img
                src={allImages[selectedImageIdx] || allImages[0] || product.mainImage}
                alt={product.name}
                className="w-full h-full object-cover"
                data-testid="img-product-main"
              />
            </div>
          </div>

          <div className="flex flex-col pt-4 sm:pt-8 lg:pt-0 lg:sticky lg:top-28 h-fit">
            <div className="text-sm text-muted-foreground uppercase tracking-widest mb-2">{product.brand || "Lucerne Boutique"}</div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 text-balance" data-testid="text-product-name">{product.name}</h1>

            <div className="flex items-center gap-4 mb-6 sm:mb-8 text-lg sm:text-xl">
              {discountPrice ? (
                <>
                  <span className="font-semibold text-destructive" data-testid="text-discount-price">₪{discountPrice}</span>
                  <span className="text-muted-foreground line-through" data-testid="text-original-price">₪{price}</span>
                  <span className="text-xs uppercase tracking-widest bg-destructive text-destructive-foreground px-2 py-1">
                    Save {Math.round((1 - parseFloat(discountPrice) / parseFloat(price)) * 100)}%
                  </span>
                </>
              ) : (
                <span className="font-medium" data-testid="text-price">₪{price}</span>
              )}
            </div>

            <div className="prose prose-sm md:prose-base text-muted-foreground mb-6 sm:mb-10 leading-relaxed max-w-none" data-testid="text-product-description">
              {product.description}
            </div>

            {hasMultipleColors && (
              <div className="mb-8">
                <span className="block text-sm font-semibold uppercase tracking-widest mb-3">
                  {t.product.color}: <span className="text-muted-foreground font-normal ms-2">{activeVariant.name}</span>
                </span>
                <div className="flex flex-wrap gap-3">
                  {variants.map((v, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedColorIdx(idx)}
                      className={`relative w-10 h-10 rounded-full border-2 transition-all ${selectedColorIdx === idx ? "border-primary scale-110 shadow-md" : "border-border hover:border-primary/60"}`}
                      style={{ backgroundColor: v.colorCode }}
                      title={v.name}
                      data-testid={`button-color-swatch-${idx}`}
                    >
                      {selectedColorIdx === idx && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <Check className={`w-4 h-4 ${isLightColor(v.colorCode) ? "text-gray-800" : "text-white"}`} />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasSizes && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold uppercase tracking-widest">{t.product.size}</span>
                  <button className="text-xs text-muted-foreground underline">{t.product.sizeGuide}</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {sizes.map(size => {
                    const sizeQty = sizeInv[size] !== undefined ? sizeInv[size] : null;
                    const isOutOfStock = sizeQty !== null && sizeQty <= 0;
                    return (
                      <button
                        key={size}
                        onClick={() => { if (!isOutOfStock) { setSelectedSize(size); setQuantity(1); } }}
                        disabled={isOutOfStock}
                        className={`min-w-12 h-12 px-3 flex items-center justify-center border transition-all ${
                          isOutOfStock
                            ? "border-border text-muted-foreground/40 line-through cursor-not-allowed"
                            : selectedSize === size
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary text-foreground"
                        }`}
                        data-testid={`button-size-${size}`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {hasSizes && !selectedSize && (
              <p className="text-sm text-muted-foreground mb-4 border border-dashed border-border p-3" data-testid="text-select-size-prompt">
                {t.product.selectSizePrompt}
              </p>
            )}

            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="flex items-center border border-border h-11 sm:h-12">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={!canAdd}
                  className="px-3 sm:px-4 h-full hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-qty-minus"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-medium" data-testid="text-quantity">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
                  disabled={!canAdd || quantity >= availableStock}
                  className="px-3 sm:px-4 h-full hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="button-qty-plus"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <Button
                onClick={handleAddToCart}
                className="flex-1 h-11 sm:h-12 rounded-none uppercase tracking-widest text-xs sm:text-sm font-semibold"
                disabled={!canAdd}
                data-testid="button-add-to-cart"
              >
                {canAdd ? (
                  <>
                    <ShoppingBag className="w-4 h-4 me-2" /> {t.product.addToCart}
                  </>
                ) : hasSizes && !selectedSize ? t.product.selectSize : t.product.outOfStock}
              </Button>
            </div>

            {selectedSize && availableStock > 0 && (
              <p className="text-xs text-muted-foreground mb-4" data-testid="text-size-stock">
                {t.product.availableInSize} {selectedSize}: {availableStock} {t.product.pieces}
              </p>
            )}

            <div className="border-t border-border pt-6 space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.product.availability}</span>
                <span className={availableStock > 0 ? "text-green-600" : "text-destructive"} data-testid="text-availability">
                  {hasSizes && !selectedSize ? t.product.selectSizeFirst : availableStock > 0 ? t.product.inStock : t.product.outOfStock}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t.product.shipping}</span>
                <span>{t.product.freeDelivery}</span>
              </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <section className="mt-16 sm:mt-24" data-testid="section-related-products">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-semibold">{t.filter.youMayAlsoLike}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => scrollRelated("left")}
                  className="w-9 h-9 border border-border flex items-center justify-center hover:border-foreground transition-colors"
                  data-testid="button-related-scroll-left"
                  aria-label="Scroll left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollRelated("right")}
                  className="w-9 h-9 border border-border flex items-center justify-center hover:border-foreground transition-colors"
                  data-testid="button-related-scroll-right"
                  aria-label="Scroll right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              ref={scrollRef}
              className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-hide pb-4"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {relatedProducts.map((p) => (
                <div key={p.id} className="flex-shrink-0 w-44 sm:w-56 md:w-64" data-testid={`related-product-${p.id}`}>
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length !== 6) return false;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
