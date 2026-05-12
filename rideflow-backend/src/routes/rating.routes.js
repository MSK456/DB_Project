import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import * as ratingController from '../controllers/rating.controller.js';

const router = Router();

// All rating routes are protected
router.use(verifyJWT);

router.post('/', ratingController.submitRating);
router.get('/my', ratingController.getMyRatings);
router.get('/ride/:rideId/status', ratingController.getRideRatingStatus);

export default router;
