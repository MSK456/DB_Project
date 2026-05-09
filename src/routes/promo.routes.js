/**
 * @file src/routes/promo.routes.js
 */
import { Router } from "express";
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { createPromoSchema, validatePromoSchema } from "../validators/promo.validators.js";
import {
  handleCreatePromo,
  fetchPromos,
  handleDeactivatePromo,
  handleValidatePromo
} from "../controllers/promo.controller.js";

const router = Router();

router.use(verifyJWT);

// Rider only
router.post("/validate", authorizeRoles("Rider"), validateBody(validatePromoSchema), handleValidatePromo);

// Admin only
router.use(authorizeRoles("Admin"));
router.post("/", validateBody(createPromoSchema), handleCreatePromo);
router.get("/", fetchPromos);
router.patch("/:code/deactivate", handleDeactivatePromo);

export default router;
