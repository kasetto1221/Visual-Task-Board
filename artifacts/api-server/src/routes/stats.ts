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

router.get("/stats/velocity", async (req, res, next) => {
  try {
    const weeksRaw = Number(req.query.weeks ?? 8);
    const weeks = Number.isFinite(weeksRaw)
      ? Math.min(Math.max(1, Math.trunc(weeksRaw)), 26)
      : 8;
    const tasks = await db.select().from(tasksTable);

    const now = new Date();
    const startOfThisWeek = new Date(now);
    const day = startOfThisWeek.getDay();
    const diffToMonday = (day + 6) % 7;
    startOfThisWeek.setDate(startOfThisWeek.getDate() - diffToMonday);
    startOfThisWeek.setHours(0, 0, 0, 0);

    const buckets: {
      weekStart: string;
      label: string;
      completed: number;
      created: number;
      start: Date;
      end: Date;
    }[] = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(startOfThisWeek);
      start.setDate(start.getDate() - i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      const month = start.getMonth() + 1;
      const date = start.getDate();
      buckets.push({
        weekStart: fmt(start),
        label: `${month}/${date}`,
        completed: 0,
        created: 0,
        start,
        end,
      });
    }

    let totalCycleDays = 0;
    let cycleCount = 0;

    for (const t of tasks) {
      const created = t.createdAt;
      for (const b of buckets) {
        if (created >= b.start && created < b.end) {
          b.created += 1;
          break;
        }
      }
      if (t.status === "done") {
        const completedAt = t.updatedAt;
        for (const b of buckets) {
          if (completedAt >= b.start && completedAt < b.end) {
            b.completed += 1;
            break;
          }
        }
        const ms = completedAt.getTime() - created.getTime();
        if (ms >= 0) {
          totalCycleDays += ms / (1000 * 60 * 60 * 24);
          cycleCount += 1;
        }
      }
    }

    const totalCompleted = buckets.reduce((s, b) => s + b.completed, 0);
    const totalCreated = buckets.reduce((s, b) => s + b.created, 0);
    const averageCompletedPerWeek =
      buckets.length > 0
        ? Math.round((totalCompleted / buckets.length) * 10) / 10
        : 0;
    const completionRate =
      totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) / 100 : 0;
    const averageCycleTimeDays =
      cycleCount > 0 ? Math.round((totalCycleDays / cycleCount) * 10) / 10 : 0;

    res.json({
      weeks: buckets.map(({ weekStart, label, completed, created }) => ({
        weekStart,
        label,
        completed,
        created,
      })),
      averageCompletedPerWeek,
      totalCompleted,
      totalCreated,
      completionRate,
      averageCycleTimeDays,
    });
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
