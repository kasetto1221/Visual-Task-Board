import { Router, type IRouter } from "express";
import { db, tasksTable, membersTable } from "@workspace/db";

const router: IRouter = Router();

function todayStr(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function fmt(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

router.get("/stats/summary", async (_req, res, next) => {
  try {
    const tasks = await db.select().from(tasksTable);
    const today = todayStr();
    const now = new Date();
    const weekEnd = fmt(addDays(now, 7));
    const weekStart = fmt(addDays(now, -7));

    const total = tasks.length;
    const overdue = tasks.filter(
      (t) => t.dueDate && t.dueDate < today && t.status !== "done",
    ).length;
    const dueToday = tasks.filter((t) => t.dueDate === today && t.status !== "done")
      .length;
    const dueThisWeek = tasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate >= today &&
        t.dueDate <= weekEnd &&
        t.status !== "done",
    ).length;
    const completedThisWeek = tasks.filter(
      (t) => t.status === "done" && fmt(t.updatedAt) >= weekStart,
    ).length;

    const statusKeys = ["todo", "in_progress", "in_review", "done"] as const;
    const byStatus = statusKeys.map((s) => ({
      status: s,
      count: tasks.filter((t) => t.status === s).length,
    }));
    const priorityKeys = ["low", "medium", "high", "urgent"] as const;
    const byPriority = priorityKeys.map((p) => ({
      priority: p,
      count: tasks.filter((t) => t.priority === p).length,
    }));

    res.json({
      total,
      overdue,
      dueToday,
      dueThisWeek,
      completedThisWeek,
      byStatus,
      byPriority,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/stats/upcoming", async (req, res, next) => {
  try {
    const limitRaw = Number(req.query.limit ?? 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, limitRaw), 50) : 10;
    const today = todayStr();
    const tasks = await db.select().from(tasksTable);
    const members = await db.select().from(membersTable);
    const memberMap = new Map(members.map((m) => [m.id, m]));

    const upcoming = tasks
      .filter((t) => t.dueDate && t.dueDate >= today && t.status !== "done")
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
      .slice(0, limit)
      .map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? null,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate ?? null,
        assigneeId: t.assigneeId ?? null,
        assignee: t.assigneeId ? memberMap.get(t.assigneeId) ?? null : null,
        tags: t.tags ?? [],
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));

    res.json(upcoming);
  } catch (err) {
    next(err);
  }
});

router.get("/stats/workload", async (_req, res, next) => {
  try {
    const tasks = await db.select().from(tasksTable);
    const members = await db.select().from(membersTable);
    const today = todayStr();

    const result = members.map((m) => {
      const own = tasks.filter((t) => t.assigneeId === m.id);
      return {
        member: m,
        total: own.length,
        todo: own.filter((t) => t.status === "todo").length,
        inProgress: own.filter((t) => t.status === "in_progress").length,
        inReview: own.filter((t) => t.status === "in_review").length,
        done: own.filter((t) => t.status === "done").length,
        overdue: own.filter(
          (t) => t.dueDate && t.dueDate < today && t.status !== "done",
        ).length,
      };
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
