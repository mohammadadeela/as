import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/store/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { useCreateOrder } from "@/hooks/use-orders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";
import { CreditCard, Banknote, MapPin, Truck } from "lucide-react";

const SHIPPING_RATES: Record<string, number> = {
  westBank: 20,
  jerusalem: 30,
  interior: 75,
};

export default function Checkout() {
  const { items, cartTotal, clearCart } = useCart();
  const { data: user, isLoading: authLoading } = useAuth();
  const createOrder = useCreateOrder();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "card">("cod");
  const [stripeLoading, setStripeLoading] = useState(false);
  const [shippingRegion, setShippingRegion] = useState<string>("");

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/auth");
    }
  }, [authLoading, user, setLocation]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || user.fullName || "",
        phone: prev.phone || (user as any).phone || "",
        address: prev.address || (user as any).address || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    if (items.length === 0 && user) {
      setLocation("/shop");
    }
  }, [items.length, user, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col pt-20">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user || items.length === 0) return null;

  const shippingCost = shippingRegion ? SHIPPING_RATES[shippingRegion] : 0;
  const subtotal = cartTotal();
  const total = subtotal + shippingCost;

  const regionLabels: Record<string, { name: string; price: string }> = {
    westBank: { name: t.checkout.westBank, price: t.checkout.westBankPrice },
    jerusalem: { name: t.checkout.jerusalem, price: t.checkout.jerusalemPrice },
    interior: { name: t.checkout.interior, price: t.checkout.interiorPrice },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shippingRegion) {
      toast({ title: t.checkout.regionRequired, variant: "destructive" });
      return;
    }

    const orderItems = items.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: (item.product.discountPrice || item.product.price).toString(),
      size: item.size || null,
      color: item.color || null,
    }));

    if (paymentMethod === "card") {
      setStripeLoading(true);
      try {
        const res = await fetch("/api/lahza/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            order: {
              fullName: formData.fullName,
              phone: formData.phone,
              address: formData.address,
              city: formData.city,
              notes: formData.notes,
              shippingRegion,
              shippingCost: shippingCost.toString(),
            },
            items: orderItems,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Failed to create checkout session");
        }
        const { url } = await res.json();
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      } catch (err: any) {
        toast({ title: t.checkout.checkoutFailed, description: err.message, variant: "destructive" });
        setStripeLoading(false);
      }
      setStripeLoading(false);
      return;
    }

    try {
      const order = await createOrder.mutateAsync({
        order: {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          notes: formData.notes,
          status: "Pending",
          paymentMethod: "Cash on delivery",
          shippingRegion,
          shippingCost: shippingCost.toString(),
        },
        items: orderItems,
      });

      clearCart();
      setLocation(`/order-confirmation/${order.id}`);
    } catch (err: any) {
      toast({ title: t.checkout.checkoutFailed, description: err.message, variant: "destructive" });
    }
  };

  const isPending = createOrder.isPending || stripeLoading;

  return (
    <div className="min-h-screen flex flex-col pt-20">
      <Navbar />
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display text-3xl sm:text-4xl mb-8 sm:mb-12" data-testid="text-checkout-title">{t.checkout.title}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-16">
          <div>
            <h2 className="text-xl font-semibold mb-6 uppercase tracking-widest">{t.checkout.shippingRegion}</h2>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {(["westBank", "jerusalem", "interior"] as const).map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => setShippingRegion(region)}
                  className={`flex flex-col items-center gap-2 p-4 border text-sm transition-colors ${
                    shippingRegion === region
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground"
                  }`}
                  data-testid={`button-region-${region}`}
                >
                  <MapPin className="w-5 h-5 shrink-0" />
                  <span className="font-medium text-center leading-tight">{regionLabels[region].name}</span>
                  <span className="text-xs font-semibold text-primary">{regionLabels[region].price}</span>
                </button>
              ))}
            </div>

            <h2 className="text-xl font-semibold mb-6 uppercase tracking-widest">{t.checkout.deliveryDetails}</h2>
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t.checkout.fullName}</Label>
                <Input id="fullName" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="rounded-none border-border focus-visible:ring-primary" data-testid="input-checkout-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t.checkout.phone}</Label>
                <Input id="phone" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="rounded-none border-border focus-visible:ring-primary" data-testid="input-checkout-phone" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t.checkout.city}</Label>
                <Input id="city" required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="rounded-none border-border focus-visible:ring-primary" data-testid="input-checkout-city" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">{t.checkout.address}</Label>
                <Input id="address" required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="rounded-none border-border focus-visible:ring-primary" data-testid="input-checkout-address" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">{t.checkout.notes}</Label>
                <Textarea id="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="rounded-none border-border focus-visible:ring-primary resize-none" rows={4} data-testid="textarea-checkout-notes" />
              </div>
            </form>
          </div>

          <div>
            <div className="bg-secondary p-6 sm:p-8 sticky top-28">
              <h2 className="text-xl font-semibold mb-6 uppercase tracking-widest border-b border-border pb-4">{t.checkout.yourOrder}</h2>

              <div className="space-y-4 mb-6 max-h-64 overflow-y-auto pe-2">
                {items.map((item, idx) => {
                  const price = parseFloat(item.product.discountPrice?.toString() || item.product.price.toString());
                  return (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-16 bg-muted relative">
                          <img src={item.product.mainImage} alt="" className="w-full h-full object-cover" />
                          <span className="absolute -top-2 -end-2 bg-primary text-primary-foreground text-[10px] w-4 h-4 flex justify-center items-center rounded-full">{item.quantity}</span>
                        </div>
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-muted-foreground text-xs">{item.size} {item.color}</p>
                        </div>
                      </div>
                      <span className="font-medium">₪{(price * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-4 mb-6 space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>{t.checkout.subtotal}</span>
                  <span>₪{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" />
                    {t.checkout.shipping}
                    {shippingRegion && <span className="text-xs">({regionLabels[shippingRegion]?.name})</span>}
                  </span>
                  <span className={shippingRegion ? "font-medium text-foreground" : ""}>
                    {shippingRegion ? `₪${shippingCost.toFixed(2)}` : t.checkout.selectRegion}
                  </span>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <h3 className="text-sm font-semibold uppercase tracking-widest mb-3">{t.checkout.paymentMethod}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`flex items-center gap-2 p-3 border text-sm transition-colors ${
                      paymentMethod === "cod"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                    data-testid="button-payment-cod"
                  >
                    <Banknote className="w-4 h-4 shrink-0" />
                    <span>{t.checkout.cod}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex items-center gap-2 p-3 border text-sm transition-colors ${
                      paymentMethod === "card"
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground"
                    }`}
                    data-testid="button-payment-card"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span>{t.checkout.card}</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-4 mb-8 flex justify-between items-center text-xl font-semibold">
                <span>{t.checkout.total}</span>
                <span data-testid="text-checkout-total">₪{total.toFixed(2)}</span>
              </div>

              <Button
                type="submit"
                form="checkout-form"
                disabled={isPending || !shippingRegion}
                className="w-full rounded-none py-6 uppercase tracking-widest text-sm font-semibold"
                data-testid="button-place-order"
              >
                {isPending
                  ? t.checkout.processing
                  : paymentMethod === "card"
                    ? t.checkout.payWithCard
                    : t.checkout.placeOrder}
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
