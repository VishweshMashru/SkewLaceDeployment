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

export const userRoleEnum = pgEnum("user_role", ["admin", "staff", "viewer"]);

export const appUsers = pgTable("app_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").default("viewer").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const batchStatusEnum = pgEnum("batch_status", [
  "preparing",
  "sealed",
  "dispatched",
]);

export const batches = pgTable("batches", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  destination: text("destination"),
  notes: text("notes"),
  status: batchStatusEnum("status").default("preparing").notNull(),
  totalPieces: integer("total_pieces").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Batch = typeof batches.$inferSelect;
export type NewBatch = typeof batches.$inferInsert;

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
  trackingType: text("tracking_type").notNull(),
  quantity: integer("quantity").notNull(),
  status: finishedGoodsStatusEnum("status").default("available").notNull(),
  cartonId: text("carton_id").references(() => cartons.id),
  orderLineId: text("order_line_id"), // links label to an order line
  label: text("label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cartonPurposeEnum = pgEnum("carton_purpose", ["dispatch", "storage"]);

export const cartons = pgTable("cartons", {
  id: text("id").primaryKey(),
  cartonNumber: text("carton_number").notNull().unique(),
  batchId: text("batch_id").references(() => batches.id),
  status: cartonStatusEnum("status").default("open").notNull(),
  purpose: cartonPurposeEnum("purpose").default("dispatch").notNull(),
  storageLocation: text("storage_location"),
  notes: text("notes"),
  totalPieces: integer("total_pieces").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Orders system
export const orderTypeEnum = pgEnum("order_type", ["production", "purchase"]);
export const orderStatusEnum = pgEnum("order_status", ["open", "in_progress", "completed", "cancelled"]);
export const orderLineStatusEnum = pgEnum("order_line_status", ["pending", "in_progress", "completed"]);

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  type: orderTypeEnum("type").default("production").notNull(),
  status: orderStatusEnum("status").default("open").notNull(),
  buyerName: text("buyer_name"),
  title: text("title").notNull(),
  notes: text("notes"),
  batchId: text("batch_id").references(() => batches.id),
  orderDate: timestamp("order_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderLines = pgTable("order_lines", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => products.id),
  productName: text("product_name").notNull(), // denormalized for display
  colorCategory: text("color_category"),
  designNumber: text("design_number"),
  targetQty: integer("target_qty").notNull(),
  actualQty: integer("actual_qty").default(0).notNull(),
  status: orderLineStatusEnum("status").default("pending").notNull(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type FinishedGoods = typeof finishedGoods.$inferSelect;
export type NewFinishedGoods = typeof finishedGoods.$inferInsert;
export type Carton = typeof cartons.$inferSelect;
export type NewCarton = typeof cartons.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type OrderLine = typeof orderLines.$inferSelect;

// Relations for drizzle queries
import { relations } from "drizzle-orm";
export const ordersRelations = relations(orders, ({ many }) => ({
  lines: many(orderLines),
}));
export const orderLinesRelations = relations(orderLines, ({ one }) => ({
  order: one(orders, { fields: [orderLines.orderId], references: [orders.id] }),
}));
