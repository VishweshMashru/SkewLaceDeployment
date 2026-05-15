import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

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

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  designNumber: text("design_number"),
  colorCategory: text("color_category"),
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
