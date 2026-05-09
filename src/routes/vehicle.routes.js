/**
 * @file src/routes/vehicle.routes.js
 */
import { Router } from "express";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { addVehicleSchema } from "../validators/vehicle.validators.js";
import { addVehicle, getMyVehicles } from "../controllers/vehicle.controller.js";

const router = Router();

// Drivers only
router.use(verifyJWT, authorizeRoles("Driver"));

router.post("/", validateBody(addVehicleSchema), addVehicle);
router.get("/my", getMyVehicles);

export default router;
