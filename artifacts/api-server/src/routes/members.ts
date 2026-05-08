import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, membersTable } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { cacheDeleteStats } from "../lib/cache";

const AVATAR_COLORS = [
  "#4f46e5", "#0891b2", "#059669", "#d97706",
  "#dc2626", "#7c3aed", "#db2777", "#16a34a",
  "#ea580c", "#0284c7",
];

const router: IRouter = Router();

router.get("/members", async (_req, res, next) => {
  try {
    const rows = await db.select().from(membersTable).orderBy(membersTable.createdAt);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

router.post("/members", async (req, res, next) => {
  try {
    const parsed = schemas.CreateMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }
    const { name, email, role, avatarColor } = parsed.data;
    const color = avatarColor ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const [row] = await db.insert(membersTable).values({
      id: randomUUID(),
      name,
      email,
      avatarColor: color,
      role,
    }).returning();
    await cacheDeleteStats();
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
});

router.patch("/members/:id", async (req, res, next) => {
  try {
    const parsed = schemas.UpdateMemberBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error.issues });
      return;
    }
    const updates: Partial<typeof membersTable.$inferInsert> = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    if (parsed.data.avatarColor !== undefined) updates.avatarColor = parsed.data.avatarColor;

    const [row] = await db.update(membersTable)
      .set(updates)
      .where(eq(membersTable.id, req.params.id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    await cacheDeleteStats();
    res.json(row);
  } catch (err) {
    next(err);
  }
});

router.delete("/members/:id", async (req, res, next) => {
  try {
    const result = await db.delete(membersTable)
      .where(eq(membersTable.id, req.params.id))
      .returning({ id: membersTable.id });
    if (!result.length) {
      res.status(404).json({ error: "Member not found" });
      return;
    }
    await cacheDeleteStats();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
