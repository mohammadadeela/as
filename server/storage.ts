import { users, categories, products, orders, orderItems, wishlist, reviews, discountCodes, siteSettings, type User, type InsertUser, type Category, type InsertCategory, type Product, type InsertProduct, type Order, type InsertOrder, type OrderItem, type InsertOrderItem, type Wishlist, type InsertWishlist, type Review, type InsertReview, type DiscountCode, type InsertDiscountCode, type SiteSetting } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // User
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<(User & { orderCount: number })[]>;
  deleteUser(id: number): Promise<boolean>;

  // Category
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;

  // Product
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;

  // Order
  getOrders(): Promise<Order[]>;
  getUserOrders(userId: number): Promise<Order[]>;
  getOrder(id: number): Promise<{order: Order, items: (OrderItem & {product?: Product})[]} | undefined>;
  createOrder(order: InsertOrder, items: Omit<InsertOrderItem, 'orderId'>[]): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;

  // Stats
  getStats(): Promise<{totalProducts: number, totalUsers: number, totalOrders: number, totalSales: number, lowStockCount: number}>;

  // Wishlist
  getWishlist(userId: number): Promise<Wishlist[]>;
  addToWishlist(userId: number, productId: number): Promise<Wishlist>;
  removeFromWishlist(id: number): Promise<boolean>;
  isInWishlist(userId: number, productId: number): Promise<boolean>;

  // Reviews
  getReviews(productId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Discount Codes
  validateDiscountCode(code: string): Promise<DiscountCode | undefined>;
  useDiscountCode(code: string): Promise<DiscountCode | undefined>;

  // Site Settings
  getSiteSettings(): Promise<SiteSetting[]>;
  getSiteSetting(key: string): Promise<string | undefined>;
  setSiteSetting(key: string, value: string): Promise<SiteSetting>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async getAllUsers(): Promise<(User & { orderCount: number })[]> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        role: users.role,
        fullName: users.fullName,
        phone: users.phone,
        address: users.address,
        isVerified: users.isVerified,
        isBlocked: users.isBlocked,
        verificationCode: users.verificationCode,
        createdAt: users.createdAt,
        orderCount: sql<number>`cast(count(${orders.id}) as int)`,
      })
      .from(users)
      .leftJoin(orders, eq(orders.userId, users.id))
      .groupBy(users.id)
      .orderBy(desc(users.createdAt));
    return result;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(desc(products.createdAt));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, update: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db.update(products).set(update).where(eq(products.id, id)).returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    await db.delete(orderItems).where(eq(orderItems.productId, id));
    const [deleted] = await db.delete(products).where(eq(products.id, id)).returning();
    return !!deleted;
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: number): Promise<{order: Order, items: (OrderItem & {product?: Product})[]} | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;
    
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const itemsWithProducts = await Promise.all(items.map(async (item) => {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      return { ...item, product };
    }));

    return { order, items: itemsWithProducts };
  }

  async createOrder(order: InsertOrder, items: Omit<InsertOrderItem, 'orderId'>[]): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    
    for (const item of items) {
      await db.insert(orderItems).values({ ...item, orderId: newOrder.id });

      const [product] = await db.select().from(products).where(eq(products.id, item.productId));
      if (product) {
        const colorVariants = ((product as any).colorVariants || []) as Array<{name: string; sizeInventory: Record<string, number>; sizes: string[]; mainImage: string; images: string[]; colorCode: string}>;
        const itemColor = (item as any).color;
        const itemSize = (item as any).size;

        if (colorVariants.length > 0 && itemColor) {
          const variantIdx = colorVariants.findIndex(v => v.name === itemColor);
          if (variantIdx >= 0 && itemSize) {
            const vInv = colorVariants[variantIdx].sizeInventory || {};
            if (vInv[itemSize] !== undefined) {
              vInv[itemSize] = Math.max(0, vInv[itemSize] - item.quantity);
              colorVariants[variantIdx].sizeInventory = vInv;
            }
          }
          const mergedInv: Record<string, number> = {};
          colorVariants.forEach(v => {
            Object.entries(v.sizeInventory || {}).forEach(([s, q]) => {
              mergedInv[s] = (mergedInv[s] || 0) + q;
            });
          });
          const totalStock = Object.values(mergedInv).reduce((s, q) => s + q, 0);
          await db.update(products).set({
            colorVariants: colorVariants,
            sizeInventory: mergedInv,
            stockQuantity: totalStock,
          }).where(eq(products.id, item.productId));
        } else {
          const sizeInv = (product.sizeInventory as Record<string, number>) || {};
          if (itemSize && sizeInv[itemSize] !== undefined) {
            sizeInv[itemSize] = Math.max(0, sizeInv[itemSize] - item.quantity);
            const totalStock = Object.values(sizeInv).reduce((s, q) => s + q, 0);
            await db.update(products).set({ sizeInventory: sizeInv, stockQuantity: totalStock }).where(eq(products.id, item.productId));
          } else {
            const newStock = Math.max(0, product.stockQuantity - item.quantity);
            await db.update(products).set({ stockQuantity: newStock }).where(eq(products.id, item.productId));
          }
        }
      }
    }
    
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const [currentOrder] = await db.select().from(orders).where(eq(orders.id, id));
    if (!currentOrder) return undefined;

    const wasCanc = currentOrder.status === "Cancelled";
    const isCanc = status === "Cancelled";

    if (wasCanc !== isCanc) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

      for (const item of items) {
        const [product] = await db.select().from(products).where(eq(products.id, item.productId));
        if (!product) continue;

        const delta = isCanc ? item.quantity : -item.quantity;
        const colorVariants = ((product as any).colorVariants || []) as Array<{
          name: string;
          sizeInventory: Record<string, number>;
          sizes: string[];
          mainImage: string;
          images: string[];
          colorCode: string;
        }>;
        const itemColor = (item as any).color;
        const itemSize = (item as any).size;

        if (colorVariants.length > 0 && itemColor) {
          const variantIdx = colorVariants.findIndex((v) => v.name === itemColor);
          if (variantIdx >= 0 && itemSize) {
            const vInv = colorVariants[variantIdx].sizeInventory || {};
            if (vInv[itemSize] !== undefined) {
              vInv[itemSize] = Math.max(0, vInv[itemSize] + delta);
              colorVariants[variantIdx].sizeInventory = vInv;
            }
          }
          const mergedInv: Record<string, number> = {};
          colorVariants.forEach((v) => {
            Object.entries(v.sizeInventory || {}).forEach(([s, q]) => {
              mergedInv[s] = (mergedInv[s] || 0) + q;
            });
          });
          const totalStock = Object.values(mergedInv).reduce((s, q) => s + q, 0);
          await db
            .update(products)
            .set({ colorVariants, sizeInventory: mergedInv, stockQuantity: totalStock })
            .where(eq(products.id, item.productId));
        } else {
          const sizeInv = (product.sizeInventory as Record<string, number>) || {};
          if (itemSize && sizeInv[itemSize] !== undefined) {
            sizeInv[itemSize] = Math.max(0, sizeInv[itemSize] + delta);
            const totalStock = Object.values(sizeInv).reduce((s, q) => s + q, 0);
            await db
              .update(products)
              .set({ sizeInventory: sizeInv, stockQuantity: totalStock })
              .where(eq(products.id, item.productId));
          } else {
            const newStock = Math.max(0, product.stockQuantity + delta);
            await db
              .update(products)
              .set({ stockQuantity: newStock })
              .where(eq(products.id, item.productId));
          }
        }
      }
    }

    const [updatedOrder] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updatedOrder;
  }

  async getStats(): Promise<{totalProducts: number, totalUsers: number, totalOrders: number, totalSales: number, lowStockCount: number}> {
    const productsList = await db.select().from(products);
    const usersList = await db.select().from(users);
    const ordersList = await db.select().from(orders);
    
    const totalSales = ordersList.filter(o => o.status === "Delivered").reduce((acc, order) => acc + Number(order.totalAmount || 0), 0);
    const lowStockCount = productsList.filter(p => p.stockQuantity < 10).length;

    return {
      totalProducts: productsList.length,
      totalUsers: usersList.length,
      totalOrders: ordersList.length,
      totalSales,
      lowStockCount
    };
  }

  async getWishlist(userId: number): Promise<Wishlist[]> {
    return await db.select().from(wishlist).where(eq(wishlist.userId, userId));
  }

  async addToWishlist(userId: number, productId: number): Promise<Wishlist> {
    const [item] = await db.insert(wishlist).values({ userId, productId }).returning();
    return item;
  }

  async removeFromWishlist(id: number): Promise<boolean> {
    const [deleted] = await db.delete(wishlist).where(eq(wishlist.id, id)).returning();
    return !!deleted;
  }

  async isInWishlist(userId: number, productId: number): Promise<boolean> {
    const [item] = await db.select().from(wishlist).where(and(eq(wishlist.userId, userId), eq(wishlist.productId, productId)));
    return !!item;
  }

  async getReviews(productId: number): Promise<Review[]> {
    return await db.select().from(reviews).where(eq(reviews.productId, productId));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async validateDiscountCode(code: string): Promise<DiscountCode | undefined> {
    const [discount] = await db.select().from(discountCodes).where(eq(discountCodes.code, code));
    if (!discount || !discount.isActive) return undefined;
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) return undefined;
    if (discount.maxUses && discount.usedCount && discount.usedCount >= discount.maxUses) return undefined;
    return discount;
  }

  async useDiscountCode(code: string): Promise<DiscountCode | undefined> {
    const discount = await this.validateDiscountCode(code);
    if (!discount) return undefined;
    const [updated] = await db.update(discountCodes).set({ usedCount: (discount.usedCount || 0) + 1 }).where(eq(discountCodes.id, discount.id)).returning();
    return updated;
  }

  async getSiteSettings(): Promise<SiteSetting[]> {
    return await db.select().from(siteSettings);
  }

  async getSiteSetting(key: string): Promise<string | undefined> {
    const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return row?.value;
  }

  async setSiteSetting(key: string, value: string): Promise<SiteSetting> {
    const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    if (existing.length > 0) {
      const [updated] = await db.update(siteSettings).set({ value }).where(eq(siteSettings.key, key)).returning();
      return updated;
    }
    const [created] = await db.insert(siteSettings).values({ key, value }).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();