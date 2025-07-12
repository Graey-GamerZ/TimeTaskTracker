import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  scheduledDate: timestamp("scheduled_date", { withTimezone: true }).notNull(),
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high"
  category: text("category").notNull().default("personal"), // "work", "personal", "shopping", "health"
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  scheduledDate: z.string().transform(str => new Date(str)),
  priority: z.string().default("medium"),
  category: z.string().default("personal"),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
