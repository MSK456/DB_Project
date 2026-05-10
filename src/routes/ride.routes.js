/**
 * @file src/routes/ride.routes.js
 */
import { Router } from "express";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { requestRideSchema, completeRideSchema } from "../validators/ride.validators.js";
import {
  requestNewRide,
  getActiveRide,
  handleStartRide,
  handleCompleteRide,
  handleCancelRide,
  handleGetFareEstimate,
  fetchRiderHistory
} from "../controllers/ride.controller.js";

const router = Router();

router.use(verifyJWT);

// Rider only
router.post("/request", authorizeRoles("Rider"), validateBody(requestRideSchema), requestNewRide);
router.post("/estimate", authorizeRoles("Rider"), handleGetFareEstimate);
router.get("/history", authorizeRoles("Rider"), fetchRiderHistory);

// Driver only
router.patch("/:rideId/start", authorizeRoles("Driver"), handleStartRide);
router.patch("/:rideId/complete", authorizeRoles("Driver"), validateBody(completeRideSchema), handleCompleteRide);

// Shared
router.get("/active", authorizeRoles("Rider", "Driver"), getActiveRide);
router.patch("/:rideId/cancel", authorizeRoles("Rider", "Driver"), handleCancelRide);

export default router;
