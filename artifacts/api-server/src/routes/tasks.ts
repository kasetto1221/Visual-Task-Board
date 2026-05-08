import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, tasksTable, membersTable } from "@workspace/db";
import { schemas } from "@workspace/api-zod";
import { cacheDeleteStats } from "../lib/cache";

const router: IRouter = Router();

async function loadTaskWithAssignee(id: string) {
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
  if (!task) return null;
  let assignee = null;
  if (task.assigneeId) {
    const [m] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.id, task.assigneeId));
    assignee = m ?? null;
  }
  return serializeTask(task, assignee);
}

function serializeTask(
  task: typeof tasksTable.$inferSelect,
  assignee: typeof membersTable.$inferSelect | null,
) {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ?? null,
    assigneeId: task.assigneeId ?? null,
    assignee: assignee ?? null,
    tags: task.tags ?? [],
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

router.get("/tasks", async (req, res, next) => {
  try {
    const params = schemas.ListTasksQueryParams.parse(req.query);
    const rows = await db.select().from(tasksTable);
    const members = await db.select().from(membersTable);
    const memberMap = new Map(members.map((m) => [m.id, m]));
    let result = rows.map((r) =>
      serializeTask(r, r.assigneeId ? memberMap.get(r.assigneeId) ?? null : null),
    );
    if (params.status) result = result.filter((t) => t.status === params.status);
    if (params.assigneeId) result = result.filter((t) => t.assigneeId === params.assigneeId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/tasks", async (req, res, next) => {
  try {
    const body = schemas.CreateTaskBody.parse(req.body);
    const id = randomUUID();
    await db.insert(tasksTable).values({
      id,
      title: body.title,
      description: body.description ?? null,
      status: body.status ?? "todo",
      priority: body.priority ?? "medium",
      dueDate: body.dueDate ? toDateString(body.dueDate) : null,
      assigneeId: body.assigneeId ?? null,
      tags: body.tags ?? [],
    });
    const result = await loadTaskWithAssignee(id);
    await cacheDeleteStats();
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/tasks/:id", async (req, res, next) => {
  try {
    const result = await loadTaskWithAssignee(req.params.id);
    if (!result) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.patch("/tasks/:id", async (req, res, next) => {
  try {
    const body = schemas.UpdateTaskBody.parse(req.body);
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description ?? null;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.dueDate !== undefined)
      updates.dueDate = body.dueDate ? toDateString(body.dueDate) : null;
    if (body.assigneeId !== undefined) updates.assigneeId = body.assigneeId ?? null;
    if (body.tags !== undefined) updates.tags = body.tags;

    if (Object.keys(updates).length > 0) {
      await db.update(tasksTable).set(updates).where(eq(tasksTable.id, req.params.id));
    }
    const result = await loadTaskWithAssignee(req.params.id);
    if (!result) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    await cacheDeleteStats();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.delete("/tasks/:id", async (req, res, next) => {
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, req.params.id));
    await cacheDeleteStats();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

function toDateString(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default router;
