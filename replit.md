# Lucerne Boutique

## Overview
A full-stack e-commerce website for women's fashion (clothes, shoes) targeting Palestinian customers. Built with Express + React + PostgreSQL.

## Architecture
- **Backend**: Express.js + Passport session auth + drizzle-orm (PostgreSQL)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **State**: Zustand (cart, language), TanStack Query (server state)
- **Currency**: ILS (₪)
- **Payment**: Cash on Delivery + Stripe Card Payment
- **Email**: Nodemailer (Gmail app password) with console.log fallback

## Key Features
- Arabic/English bilingual support (Arabic default, custom i18n via zustand)
- RTL/LTR layout switching
- Product catalog with categories, per-color variants, images
- Shopping cart with persistent state
- Checkout with delivery details + COD/Card payment toggle
- User authentication (register/login) with email verification (6-digit code)
- User profile with order history + order details dialog
- Admin dashboard (products CRUD, order management, stats)
- Discount codes
- Wishlist & Reviews
- Stripe card payment via Stripe checkout sessions
- Order notification emails to mohammad.adeela@gmail.com
- Social media links (Instagram/Facebook) in footer
- "موقعنا" (Our Location) page with video embed + store info

## Color Variant System
- Products support **multiple color variants** via `colorVariants` JSONB column on the products table
- Each `ColorVariant` has: `name`, `colorCode` (hex), `mainImage`, `images[]`, `sizes[]`, `sizeInventory: Record<string, number>`
- **Admin**: "Add Color" button creates variant cards; each card has its own image uploads, size builder, stock per size
- **Customer**: Product page shows clickable color swatches (circles); clicking a color switches the gallery, sizes, and stock
- **Backward compat**: Products with empty colorVariants fall back to flat `mainImage`/`sizes`/`sizeInventory` fields
- Product-level `mainImage`, `colors`, `sizes`, `sizeInventory`, `stockQuantity` are auto-computed from variants on save
- Stock validation and deduction during orders is color-variant-aware

## Shipping Regions
- West Bank (الضفة الغربية) = ₪20
- Jerusalem (القدس) = ₪30
- Interior/48 (الداخل) = ₪75
- Server-side validation of shipping costs (SHIPPING_RATES map in routes.ts)
- Shipping cost added to totalAmount; stored in orders.shippingCost and orders.shippingRegion

## Order Statuses
- Pending (بالانتظار)
- OnTheWay (بالطريق إلك)
- Delivered (تم التسليم)
- Cancelled (تم إلغاء الطلب)

## Email System
- **Service**: `server/email.ts` with Nodemailer (Gmail transport)
- **Secrets needed**: EMAIL_USER, EMAIL_PASS (Gmail app password)
- **Fallback**: console.log if EMAIL_USER/EMAIL_PASS not set
- **Email verification on signup**: 6-digit code sent via email; user must verify before logging in
- **Forgot password**: Backend sends 6-digit reset code; user enters code + new password; codes expire in 15 minutes
- **Social login**: Google and Facebook via Firebase SDK (popup); backend verifies Firebase ID token via REST; creates/finds user in DB
- **Firebase config**: `VITE_FIREBASE_*` env vars for frontend; `FIREBASE_API_KEY` for backend token verification
- **Unverified users cannot log in**: Passport strategy rejects `isVerified: false` users; login redirects them to verification step
- **Order notifications**: Sent to mohammad.adeela@gmail.com on every order
- **Customer confirmation**: Arabic RTL email sent to customer with order #, items, shipping cost breakdown

## Card Payment: Lahza
- **Provider**: Lahza payment gateway (Palestinian, supports ILS)
- **Secret**: `LAHZA_SECRET_KEY` (stored in Replit Secrets)
- **File**: `server/lahza.ts` — wraps Lahza REST API (initialize + verify)
- **Routes**: `POST /api/lahza/create-checkout` → calls Lahza API, returns `authorization_url`; `GET /api/lahza/verify?reference=...` → verifies payment + saves order
- **Flow**: Client POSTs cart → server verifies prices + calls Lahza → user redirected to Lahza hosted checkout (new tab) → Lahza redirects to `/checkout/success?reference=...` → server verifies via `GET /transaction/verify/{ref}` → order saved
- **Amounts**: Lahza requires amounts in agorot (1 ILS = 100 agorot), conversion done in `lahza.ts`
- **Pending orders**: Stored in-memory Map (`pendingLahzaOrders`) keyed by `LUC-{timestamp}-{userId}`
- **Success page**: `/checkout/success?reference=...` → `CheckoutSuccess.tsx`

## Stripe Integration (legacy, unused)
- **Files**: `server/stripeClient.ts`, `server/webhookHandlers.ts` (kept but not actively used)
- Stripe was replaced by Lahza. Routes still exist at `/api/stripe/*` for backward compat.

## i18n System
- **Store**: `client/src/i18n/index.ts` - zustand store with `useLanguage()` hook
- **Translations**: `client/src/i18n/ar.ts` (Arabic), `client/src/i18n/en.ts` (English)
- **Default language**: Arabic (RTL)
- **Switching**: Globe icon in Navbar toggles between Arabic and English
- **RTL**: Handled via `document.documentElement.dir` and CSS `[dir="rtl"]` selectors
- **Arabic font**: Noto Sans Arabic (loaded from Google Fonts)
- Uses logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`) for RTL support

## Categories & Pages
- Dresses (فساتين) → /dresses — category ID 1
- Tops & Blouses + Pants & Skirts (ملابس) → /clothes — category IDs 2,3
- Shoes (شوزات) → /shoes — category ID 4
- Bags → category ID 5
- Accessories → category ID 6
- All categories also available in /shop with sidebar filters
- Sale page → /sale (products with discountPrice)
- New Arrivals → /new-arrivals
- Our Location → /our-location

## Database Schema
Tables: users, categories, products, orders, order_items, wishlist, reviews, discount_codes
- users: email, password, fullName, role, isVerified, verificationCode
- products.colorVariants: JSONB array of ColorVariant objects
- order_items has `size` and `color` columns for tracking per-item selections
- 50 seeded products with color variants across 6 categories

## Important Files
- `shared/schema.ts` - Database schema, types, and ColorVariant interface
- `shared/routes.ts` - API contracts with Zod schemas
- `server/routes.ts` - API routes
- `server/storage.ts` - Storage interface with color-variant-aware stock deduction
- `server/email.ts` - Email service (verification + order notifications)
- `server/stripeClient.ts` - Stripe client with credential fetching
- `server/webhookHandlers.ts` - Stripe webhook processing
- `client/src/i18n/` - Translation system
- `client/src/store/use-cart.ts` - Cart state
- `client/src/pages/admin/Products.tsx` - Admin product form with color variant cards
- `client/src/pages/ProductDetails.tsx` - Product page with color swatches
- `client/src/pages/Shop.tsx` - Shop with color-variant-aware filtering
- `client/src/pages/Auth.tsx` - Login/Register with email verification step
- `client/src/pages/Checkout.tsx` - Checkout with COD/Card payment toggle
- `client/src/pages/CheckoutSuccess.tsx` - Stripe payment success handler
- `client/src/pages/OrderConfirmation.tsx` - Order confirmation page after COD checkout
- `client/src/pages/OurLocation.tsx` - Store location page

## Image Uploads
- **Backend**: `POST /api/upload` with multer (admin-only, max 10MB per file)
- **Storage**: Files saved to `uploads/` directory with UUID filenames
- **Serving**: Static files served from `/uploads/` path
- **Supported formats**: JPG, PNG, GIF, WebP, AVIF
- **Admin UI**: Each color variant card has its own main image and extra images upload

## Admin
- Login: admin@lucerne.com / admin123
- Routes: /admin, /admin/products, /admin/orders

## Mobile Responsiveness
- All product grids use `grid-cols-2` on mobile (2 products side by side)
- Navbar shows shortened logo "Lucerne" on small screens, full "Lucerne Boutique" on sm+
- ProductCard has smaller fonts, badges, and swatches on mobile
- Cart page has separate mobile layout (flex) vs desktop layout (grid)
- Section padding reduced on mobile (py-12 vs py-24)
- Hero section height reduced on mobile (h-[80vh] vs h-screen)
- All headings use responsive text sizes (text-3xl sm:text-4xl md:text-5xl etc.)
- Touch targets maintained for buttons, swatches, and interactive elements

## Running
- `npm run dev` starts Express backend + Vite frontend on port 5000
