/**
 * @file src/middlewares/multer.middleware.js
 * @description Multer configuration for handling multipart/form-data file uploads.
 *              Files are temporarily stored in public/temp before being uploaded
 *              to Cloudinary and then deleted.
 */

import multer from "multer";

const storage = multer.diskStorage({
  /**
   * Sets the destination directory for uploaded files.
   * @param {object} req - Express request object.
   * @param {object} file - Multer file object.
   * @param {Function} cb - Callback to set destination.
   */
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },

  /**
   * Preserves the original filename of the uploaded file.
   * In production you would add a unique suffix to prevent name collisions.
   * @param {object} req
   * @param {object} file
   * @param {Function} cb
   */
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage });