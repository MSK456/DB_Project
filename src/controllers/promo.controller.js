/**
 * @file src/controllers/promo.controller.js
 */
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validatePromoLogic } from "../utils/promoUtils.js";
import {
  findPromoByCode,
  createPromo,
  getAllPromos,
  deactivatePromo
} from "../models/promo.model.js";

/**
 * POST /api/v1/promos
 */
const handleCreatePromo = asyncHandler(async (req, res) => {
  const existing = await findPromoByCode(req.body.code);
  if (existing) {
    throw new ApiError(409, "Promo code already exists");
  }

  const promoId = await createPromo(req.body);
  const promo = await findPromoByCode(req.body.code);

  return res.status(201).json(new ApiResponse(201, promo, "Promo code created successfully"));
});

/**
 * GET /api/v1/promos
 */
const fetchPromos = asyncHandler(async (req, res) => {
  const onlyActive = req.query.active === 'true';
  const promos = await getAllPromos(onlyActive);
  return res.status(200).json(new ApiResponse(200, promos, "Promos fetched"));
});

/**
 * PATCH /api/v1/promos/:code/deactivate
 */
const handleDeactivatePromo = asyncHandler(async (req, res) => {
  const { code } = req.params;
  const promo = await findPromoByCode(code);

  if (!promo) throw new ApiError(404, "Promo not found");
  if (!promo.is_active) throw new ApiError(400, "Promo is already inactive");

  await deactivatePromo(code);
  return res.status(200).json(new ApiResponse(200, { code }, "Promo deactivated"));
});

/**
 * POST /api/v1/promos/validate
 */
const handleValidatePromo = asyncHandler(async (req, res) => {
  const { code, ride_fare } = req.body;
  const promo = await findPromoByCode(code);

  const result = validatePromoLogic(promo, ride_fare);

  return res.status(200).json(new ApiResponse(200, {
    valid: true,
    ...result,
    promo_details: promo
  }, "Promo is valid"));
});

export { handleCreatePromo, fetchPromos, handleDeactivatePromo, handleValidatePromo };
