/**
 * @file src/routes/admin.routes.js
 */
import { Router } from "express";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { verifyVehicleSchema } from "../validators/vehicle.validators.js";
import {
  getSystemOverview,
  getUsers,
  updateUserStatus,
  getFareConfigs,
  updateFareConfig,
  getRevenueByCity,
  getRevenueByMethod,
  getDriverEarningsReport,
  getLowRatedDriversReport,
  getTripCountReport,
  getPromoUsageReport,
  getRevenueByDay,
  getFullTripReport
} from "../controllers/admin.controller.js";

const router = Router();

// Admins only
router.use(verifyJWT, authorizeRoles("Admin"));

// Management
router.get("/overview", getSystemOverview);
router.get("/users", getUsers);
router.patch("/users/:userId/status", updateUserStatus);

// Fare Config
router.get("/fare-config", getFareConfigs);
router.patch("/fare-config/:vehicleType", updateFareConfig);

// Reports
router.get("/reports/revenue/by-city", getRevenueByCity);
router.get("/reports/revenue/by-day", getRevenueByDay);
router.get("/reports/revenue/by-method", getRevenueByMethod);
(lines 43-46)
router.get("/reports/drivers/earnings", getDriverEarningsReport);
router.get("/reports/drivers/low-rated", getLowRatedDriversReport);
router.get("/reports/drivers/trip-count", getTripCountReport);
router.get("/reports/promos/usage", getPromoUsageReport);
router.get("/reports/trips/full", getFullTripReport);

export default router;

