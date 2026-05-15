-- Migration: Initial schema for carton tracking

CREATE TYPE "finished_goods_status" AS ENUM ('available', 'packed', 'dispatched');
CREATE TYPE "carton_status" AS ENUM ('open', 'sealed', 'dispatched');

CREATE TABLE IF NOT EXISTS "cartons" (
  "id" text PRIMARY KEY NOT NULL,
  "carton_number" text NOT NULL UNIQUE,
  "status" "carton_status" DEFAULT 'open' NOT NULL,
  "notes" text,
  "total_pieces" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "sku" text NOT NULL UNIQUE,
  "design_number" text,
  "color_category" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "finished_goods" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL REFERENCES "products"("id"),
  "tracking_type" text NOT NULL,
  "quantity" integer NOT NULL,
  "status" "finished_goods_status" DEFAULT 'available' NOT NULL,
  "carton_id" text REFERENCES "cartons"("id"),
  "label" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
