/**
 * @file src/routes/driver.routes.js
 */
import { Router } from "express";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { updateAvailabilitySchema } from "../validators/driver.validators.js";
import {
  toggleAvailability,
  fetchDriverProfile,
  fetchDriverStats,
  handleUpdateLocation
} from "../controllers/driver.controller.js";

const router = Router();

// All driver routes are protected and require Driver role
router.use(verifyJWT, authorizeRoles("Driver"));

router.patch("/availability", validateBody(updateAvailabilitySchema), toggleAvailability);
router.get("/profile", fetchDriverProfile);
router.get("/stats", fetchDriverStats);
router.get("/earnings", fetchDriverEarnings);
router.patch("/location", handleUpdateLocation);

export default router;
