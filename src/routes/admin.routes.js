/**
 * @file src/routes/admin.routes.js
 */
import { Router } from "express";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { verifyVehicleSchema } from "../validators/vehicle.validators.js";
import {
  verifyVehicle,
  fetchPendingVehicles,
  fetchAllRides,
  reportRevenueByCity,
  reportRevenueByMethod,
  reportDriverEarnings,
  reportLowRatedDriversFull,
  reportTripCountsFull,
  reportAllRiders,
  reportPromoUsage
} from "../controllers/admin.controller.js";

const router = Router();

// Admins only
router.use(verifyJWT, authorizeRoles("Admin"));

router.get("/vehicles/pending", fetchPendingVehicles);
router.patch("/vehicles/:vehicleId/verify", validateBody(verifyVehicleSchema), verifyVehicle);
router.get("/rides", fetchAllRides);

// Reports
router.get("/reports/revenue/by-city", reportRevenueByCity);
router.get("/reports/revenue/by-method", reportRevenueByMethod);
router.get("/reports/drivers/earnings", reportDriverEarnings);
router.get("/reports/drivers/low-rated", reportLowRatedDriversFull);
router.get("/reports/drivers/trip-count", reportTripCountsFull);
router.get("/reports/riders/all", reportAllRiders);
router.get("/reports/promos/usage", reportPromoUsage);

export default router;
