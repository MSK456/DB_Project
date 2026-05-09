/**
 * @file src/routes/index.js
 * @description Master router — mounts all sub-routers under versioned API prefixes.
 *              All future route modules (rides, payments, etc.) will be added here.
 */

import { Router } from "express";
import authRouter from "./auth.routes.js";

const masterRouter = Router();

// ── Auth routes ──────────────────────────────────────────────────────────────
masterRouter.use("/auth", authRouter);

// ── Future routes (Phase 2+) ─────────────────────────────────────────────────
// masterRouter.use("/rides",    rideRouter);
// masterRouter.use("/payments", paymentRouter);
// masterRouter.use("/admin",    adminRouter);
// masterRouter.use("/drivers",  driverRouter);

export default masterRouter;
