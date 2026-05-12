/**
 * @file src/routes/payment.routes.js
 */
import { Router } from "express";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { processPaymentSchema } from "../validators/payment.validators.js";
import {
  handlePayForRide,
  handleProcessRidePayment,
  fetchMyPayments,
  fetchPaymentDetail,
  fetchAllPaymentsAdmin
} from "../controllers/payment.controller.js";

const router = Router();

router.use(verifyJWT);

// Rider only
router.post("/pay", authorizeRoles("Rider"), validateBody(processPaymentSchema), handlePayForRide);
router.post("/process-ride/:rideId", authorizeRoles("Rider"), handleProcessRidePayment);
router.get("/my", authorizeRoles("Rider"), fetchMyPayments);

// Shared (Rider own or Admin any)
router.get("/:paymentId", authorizeRoles("Rider", "Admin"), fetchPaymentDetail);

// Admin only
router.get("/admin/all", authorizeRoles("Admin"), fetchAllPaymentsAdmin);

export default router;
