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
  reportRiderCompleted,
  reportDriversByCity,
  reportRevenue,
  reportLowRatedDrivers,
  reportDriverTripCounts
} from "../controllers/admin.controller.js";

const router = Router();

// Admins only
router.use(verifyJWT, authorizeRoles("Admin"));

router.get("/vehicles/pending", fetchPendingVehicles);
router.patch("/vehicles/:vehicleId/verify", validateBody(verifyVehicleSchema), verifyVehicle);
router.get("/rides", fetchAllRides);

// Reports
router.get("/reports/rides/completed", reportRiderCompleted);
router.get("/reports/drivers/by-city", reportDriversByCity);
router.get("/reports/revenue", reportRevenue);
router.get("/reports/drivers/low-rated", reportLowRatedDrivers);
router.get("/reports/drivers/trip-count", reportDriverTripCounts);

export default router;
