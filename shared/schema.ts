import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Box status enum
export enum BoxStatus {
  Packed = "packed",
  Staging = "staging",
  Loaded = "loaded", 
  Out = "out",
  Delivered = "delivered",
  Unpacked = "unpacked"
}

// Box position interface
export interface BoxPosition {
  depth: "front" | "middle" | "back";
  horizontal: "left" | "center" | "right";
  vertical: "low" | "mid" | "high";
}

// Box schema
export const boxes = pgTable("boxes", {
  id: serial("id").primaryKey(),
  boxNumber: integer("box_number").notNull(),
  owner: text("owner").notNull(),
  room: text("room").notNull(),
  contents: text("contents").notNull(),
  status: text("status").notNull().$type<BoxStatus>(),
  position: jsonb("position").$type<BoxPosition | null>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// Activity schema
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  boxId: integer("box_id").references(() => boxes.id, { onDelete: 'cascade' }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});

// Owner schema
export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

// QR code schema
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  boxId: integer("box_id").notNull().references(() => boxes.id, { onDelete: 'cascade' }),
  data: text("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

// Define relations
// Type-safe relations using generics
export const boxesRelations = relations(boxes, ({ many }) => {
  return {
    activities: many(activities),
    qrCodes: many(qrCodes)
  };
});

export const activitiesRelations = relations(activities, ({ one }) => {
  return {
    box: one(boxes, {
      fields: [activities.boxId],
      references: [boxes.id]
    })
  };
});

export const qrCodesRelations = relations(qrCodes, ({ one }) => {
  return {
    box: one(boxes, {
      fields: [qrCodes.boxId],
      references: [boxes.id]
    })
  };
});

// Create insert schemas
export const insertBoxSchema = createInsertSchema(boxes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  position: true
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  timestamp: true
});

export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  createdAt: true
});

export const insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Export types
export type Box = typeof boxes.$inferSelect;
export type InsertBox = z.infer<typeof insertBoxSchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
