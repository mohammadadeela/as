import { Link, useLocation } from "wouter";
import { ShoppingBag, User, Menu, X, LogOut, LayoutDashboard, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { useCart } from "@/store/use-cart";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const cartItems = useCart((state) => state.items);
  const { data: user } = useAuth();
  const logout = useLogout();
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const itemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const toggleLanguage = () => {
    setLanguage(language === "ar" ? "en" : "ar");
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled || location !== "/" ? "bg-background/95 backdrop-blur-md border-b" : "bg-transparent text-white"
      }`}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="font-display text-sm sm:text-2xl tracking-widest font-semibold uppercase" data-testid="link-logo">
            Lucerne Boutique
          </Link>

          <nav className="hidden md:flex gap-6">
            <Link href="/" className="text-sm uppercase tracking-widest hover:opacity-70 transition-opacity" data-testid="link-home">{t.nav.home}</Link>
            <Link href="/shop" className="text-sm uppercase tracking-widest hover:opacity-70 transition-opacity" data-testid="link-shop">{t.nav.shop}</Link>
            <Link href="/dresses" className="text-sm uppercase tracking-widest hover:opacity-70 transition-opacity" data-testid="link-dresses">{t.nav.dresses}</Link>
            <Link href="/clothes" className="text-sm uppercase tracking-widest hover:opacity-70 transition-opacity" data-testid="link-clothes">{t.nav.clothes}</Link>
            <Link href="/shoes" className="text-sm uppercase tracking-widest hover:opacity-70 transition-opacity" data-testid="link-shoes">{t.nav.shoes}</Link>
            <Link href="/sales" className="text-sm uppercase tracking-widest hover:opacity-70 transition-opacity text-destructive" data-testid="link-sales">{t.nav.sales}</Link>
            <Link href="/our-location" className="text-sm uppercase tracking-widest hover:opacity-70 transition-opacity" data-testid="link-our-location">{t.nav.ourLocation}</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
              data-testid="button-language-toggle"
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">{t.langLabel}</span>
            </button>

            {user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="ghost" size="icon" className="hover:bg-transparent hover:opacity-70" data-testid="link-admin">
                  <LayoutDashboard className="w-5 h-5" />
                </Button>
              </Link>
            )}
            
            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/profile" className="hover:opacity-70 transition-opacity" data-testid="link-profile">
                  <User className="w-5 h-5" />
                </Link>
                <button onClick={() => logout.mutate()} className="hover:opacity-70 transition-opacity" data-testid="button-logout">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link href="/auth" className="hover:opacity-70 transition-opacity" data-testid="link-auth">
                <User className="w-5 h-5" />
              </Link>
            )}
            
            <Link href="/cart" className="relative hover:opacity-70 transition-opacity" data-testid="link-cart">
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-2 -end-2 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center" data-testid="text-cart-count">
                  {itemCount}
                </span>
              )}
            </Link>

            <button
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-20 inset-x-0 w-full bg-background border-b shadow-lg text-foreground">
          <div className="flex flex-col gap-4 p-6">
            <Link href="/" className="text-lg uppercase tracking-widest font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.home}</Link>
            <Link href="/shop" className="text-lg uppercase tracking-widest font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.shop}</Link>
            <Link href="/dresses" className="text-lg uppercase tracking-widest font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.dresses}</Link>
            <Link href="/clothes" className="text-lg uppercase tracking-widest font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.clothes}</Link>
            <Link href="/shoes" className="text-lg uppercase tracking-widest font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.shoes}</Link>
            <Link href="/sales" className="text-lg uppercase tracking-widest font-medium text-destructive" onClick={() => setMobileMenuOpen(false)}>{t.nav.sales}</Link>
            <Link href="/our-location" className="text-lg uppercase tracking-widest font-medium" onClick={() => setMobileMenuOpen(false)}>{t.nav.ourLocation}</Link>
            {user?.role === "admin" && (
              <Link href="/admin" className="text-lg uppercase tracking-widest font-medium text-primary" onClick={() => setMobileMenuOpen(false)}>{t.nav.adminDashboard}</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
