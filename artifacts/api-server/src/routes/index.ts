import { Router, type IRouter } from "express";
import healthRouter from "./health";
import membersRouter from "./members";
import tasksRouter from "./tasks";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(membersRouter);
router.use(tasksRouter);
router.use(statsRouter);

export default router;
