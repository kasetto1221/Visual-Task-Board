import { Router, type IRouter } from "express";
import { db, membersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/members", async (_req, res, next) => {
  try {
    const rows = await db.select().from(membersTable);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
