import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useCart, type CartItem } from "@/store/use-cart";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/i18n";
import type { ColorVariant } from "@shared/schema";

function getItemMaxStock(item: CartItem): number {
  const { product, color, size } = item;
  const cv = (product.colorVariants as ColorVariant[] | undefined) || [];
  if (cv.length > 0 && color) {
    const variant = cv.find((v) => v.name === color);
    if (variant && size && variant.sizeInventory && variant.sizeInventory[size] !== undefined) {
      return variant.sizeInventory[size];
    }
  }
  if (size && product.sizeInventory && (product.sizeInventory as Record<string, number>)[size] !== undefined) {
    return (product.sizeInventory as Record<string, number>)[size];
  }
  return product.stockQuantity ?? 0;
}

export default function Cart() {
  const { items, updateQuantity, removeFromCart, cartTotal } = useCart();
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const Arrow = language === "ar" ? ArrowLeft : ArrowRight;

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col pt-20">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <h1 className="font-display text-4xl mb-6" data-testid="text-cart-empty">{t.cart.empty}</h1>
          <p className="text-muted-foreground mb-8">{t.cart.emptyDesc}</p>
          <Link href="/shop">
            <Button className="rounded-none uppercase tracking-widest px-8 py-6" data-testid="button-continue-shopping">{t.cart.continueShopping}</Button>
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display text-3xl sm:text-4xl mb-8 sm:mb-12" data-testid="text-cart-title">{t.cart.title}</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <div className="hidden md:grid grid-cols-6 gap-4 border-b border-border pb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              <div className="col-span-3">{t.cart.productCol}</div>
              <div className="col-span-1 text-center">{t.cart.quantityCol}</div>
              <div className="col-span-1 text-end">{t.cart.totalCol}</div>
              <div className="col-span-1"></div>
            </div>
            
            <div className="space-y-6">
              {items.map((item, idx) => {
                const price = parseFloat(item.product.discountPrice?.toString() || item.product.price.toString());
                const maxStock = getItemMaxStock(item);
                const atMax = item.quantity >= maxStock;
                return (
                  <div key={idx} className="relative border-b border-border pb-6 md:pb-0 md:border-0" data-testid={`cart-item-${idx}`}>
                    <div className="hidden md:grid md:grid-cols-6 gap-4 items-center">
                      <div className="col-span-3 flex items-center gap-6">
                        <div className="w-24 aspect-[3/4] bg-secondary flex-shrink-0">
                          <img src={item.product.mainImage} alt={item.product.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-medium text-lg mb-1"><Link href={`/product/${item.product.id}`} className="hover:underline">{item.product.name}</Link></h3>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>₪{price.toFixed(2)}</p>
                            {item.size && <p>{t.cart.sizeLabel}: {item.size}</p>}
                            {item.color && <p>{t.cart.colorLabel}: {item.color}</p>}
                          </div>
                          {atMax && <p className="text-xs text-orange-500 mt-1" data-testid={`text-max-stock-${idx}`}>{t.product.maxStockReached || `Max: ${maxStock}`}</p>}
                        </div>
                      </div>
                      <div className="col-span-1 flex justify-center">
                        <div className="flex items-center border border-border h-10">
                          <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size, item.color)} className="px-3 hover:bg-secondary" data-testid={`button-qty-minus-${idx}`}><Minus className="w-3 h-3" /></button>
                          <span className="w-8 text-center text-sm" data-testid={`text-qty-${idx}`}>{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, Math.min(item.quantity + 1, maxStock), item.size, item.color)}
                            disabled={atMax}
                            className="px-3 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                            data-testid={`button-qty-plus-${idx}`}
                          ><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                      <div className="col-span-1 text-end font-medium">₪{(price * item.quantity).toFixed(2)}</div>
                      <div className="col-span-1 flex justify-center">
                        <button onClick={() => removeFromCart(item.product.id, item.size, item.color)} className="text-muted-foreground hover:text-destructive transition-colors p-2" data-testid={`button-remove-item-${idx}`}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex md:hidden gap-3">
                      <div className="w-20 aspect-[3/4] bg-secondary flex-shrink-0">
                        <img src={item.product.mainImage} alt={item.product.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm mb-1 truncate"><Link href={`/product/${item.product.id}`} className="hover:underline">{item.product.name}</Link></h3>
                        <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                          <p>₪{price.toFixed(2)}</p>
                          {item.size && <p>{t.cart.sizeLabel}: {item.size}</p>}
                          {item.color && <p>{t.cart.colorLabel}: {item.color}</p>}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col items-start gap-0.5">
                            <div className="flex items-center border border-border h-8">
                              <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.size, item.color)} className="px-2 hover:bg-secondary" data-testid={`button-qty-minus-mobile-${idx}`}><Minus className="w-3 h-3" /></button>
                              <span className="w-6 text-center text-xs" data-testid={`text-qty-mobile-${idx}`}>{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.product.id, Math.min(item.quantity + 1, maxStock), item.size, item.color)}
                                disabled={atMax}
                                className="px-2 hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed"
                                data-testid={`button-qty-plus-mobile-${idx}`}
                              ><Plus className="w-3 h-3" /></button>
                            </div>
                            {atMax && <span className="text-xs text-orange-500" data-testid={`text-max-stock-mobile-${idx}`}>{t.product.maxStockReached || `Max: ${maxStock}`}</span>}
                          </div>
                          <span className="font-medium text-sm">₪{(price * item.quantity).toFixed(2)}</span>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id, item.size, item.color)} className="text-muted-foreground hover:text-destructive transition-colors p-1 self-start" data-testid={`button-remove-item-mobile-${idx}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-secondary p-6 sm:p-8 sticky top-28">
              <h2 className="font-display text-2xl mb-6 border-b border-border pb-4" data-testid="text-order-summary">{t.cart.orderSummary}</h2>
              
              <div className="space-y-4 mb-6 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.cart.subtotal}</span>
                  <span>₪{cartTotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.product.shipping}</span>
                  <span>{t.cart.shippingCalc}</span>
                </div>
              </div>
              
              <div className="border-t border-border pt-4 mb-8 flex justify-between items-center text-lg font-medium">
                <span>{t.cart.total}</span>
                <span data-testid="text-cart-total">₪{cartTotal().toFixed(2)}</span>
              </div>
              
              <Button 
                onClick={() => setLocation("/checkout")}
                className="w-full rounded-none py-6 uppercase tracking-widest text-sm font-semibold"
                data-testid="button-proceed-checkout"
              >
                {t.cart.proceedToCheckout} <Arrow className="w-4 h-4 ms-2" />
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
