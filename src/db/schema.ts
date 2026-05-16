import { pgTable, text, integer, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

export const finishedGoodsStatusEnum = pgEnum("finished_goods_status", [
  "available",
  "packed",
  "dispatched",
]);

export const cartonStatusEnum = pgEnum("carton_status", [
  "open",
  "sealed",
  "dispatched",
]);

export const userRoleEnum = pgEnum("user_role", ["admin", "staff", "viewer"]);

// Better Auth tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRoleEnum("role").default("viewer").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  designNumber: text("design_number"),
  colorCategory: text("color_category"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const finishedGoods = pgTable("finished_goods", {
  id: text("id").primaryKey(),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  trackingType: text("tracking_type").notNull(), // "piece" | "dozen" | "manual"
  quantity: integer("quantity").notNull(),
  status: finishedGoodsStatusEnum("status").default("available").notNull(),
  cartonId: text("carton_id").references(() => cartons.id),
  label: text("label"), // display label e.g. "Kaftan Design 142 - 12 pcs"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cartons = pgTable("cartons", {
  id: text("id").primaryKey(),
  cartonNumber: text("carton_number").notNull().unique(),
  status: cartonStatusEnum("status").default("open").notNull(),
  notes: text("notes"),
  totalPieces: integer("total_pieces").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type FinishedGoods = typeof finishedGoods.$inferSelect;
export type NewFinishedGoods = typeof finishedGoods.$inferInsert;
export type Carton = typeof cartons.$inferSelect;
export type NewCarton = typeof cartons.$inferInsert;
