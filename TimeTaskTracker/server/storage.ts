import { tasks, type Task, type InsertTask } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createTask(task: InsertTask): Promise<Task>;
  getTasks(): Promise<Task[]>;
  updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;
  getTaskById(id: number): Promise<Task | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values({
        title: insertTask.title,
        scheduledDate: insertTask.scheduledDate,
        priority: insertTask.priority || "medium",
        category: insertTask.category || "personal",
      })
      .returning();
    return task;
  }

  async getTasks(): Promise<Task[]> {
    const tasksList = await db.select().from(tasks);
    return tasksList.sort((a, b) => 
      new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );
  }

  async updateTask(id: number, updates: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(eq(tasks.id, id))
      .returning();
    return result.length > 0;
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }
}

export const storage = new DatabaseStorage();
