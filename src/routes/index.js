/**
 * @file src/routes/index.js
 * @description Master router — mounts all sub-routers under versioned API prefixes.
 *              All future route modules (rides, payments, etc.) will be added here.
 */

import { Router } from "express";
import authRouter from "./auth.routes.js";
import driverRouter from "./driver.routes.js";
import vehicleRouter from "./vehicle.routes.js";
import rideRouter from "./ride.routes.js";
import adminRouter from "./admin.routes.js";
import paymentRouter from "./payment.routes.js";
import walletRouter from "./wallet.routes.js";
import promoRouter from "./promo.routes.js";
import ratingRouter from "./rating.routes.js";

const masterRouter = Router();

// ── API routes ──────────────────────────────────────────────────────────────
masterRouter.use("/auth", authRouter);
masterRouter.use("/driver", driverRouter);
masterRouter.use("/vehicles", vehicleRouter);
masterRouter.use("/rides", rideRouter);
masterRouter.use("/admin", adminRouter);
masterRouter.use("/payments", paymentRouter);
masterRouter.use("/wallet", walletRouter);
masterRouter.use("/promos", promoRouter);
masterRouter.use("/ratings", ratingRouter);

export default masterRouter;
