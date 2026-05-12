/**
 * @file src/routes/wallet.routes.js
 */
import { Router } from "express";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { topupSchema, payoutRequestSchema, processPayoutSchema } from "../validators/payment.validators.js";
import {
  getBalance,
  handleTopup,
  fetchTransactions,
  handlePayoutRequest,
  handleProcessPayout,
  fetchPayoutsAdmin,
  fetchMyPayouts
} from "../controllers/wallet.controller.js";

const router = Router();

router.use(verifyJWT);

// Shared
router.get("/balance", authorizeRoles("Rider", "Driver"), getBalance);
router.get("/transactions", authorizeRoles("Rider", "Driver"), fetchTransactions);

// Rider only
router.post("/topup", authorizeRoles("Rider"), validateBody(topupSchema), handleTopup);

// Driver only
router.get("/payouts", authorizeRoles("Driver"), fetchMyPayouts);
router.post("/payout", authorizeRoles("Driver"), validateBody(payoutRequestSchema), handlePayoutRequest);

// Admin only
router.get("/admin/payouts", authorizeRoles("Admin"), fetchPayoutsAdmin);
router.patch("/admin/payouts/:payoutId/process", authorizeRoles("Admin"), validateBody(processPayoutSchema), handleProcessPayout);

export default router;
