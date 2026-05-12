/**
 * @file src/utils/cloudinary.js
 * @description Cloudinary integration for uploading user profile photos.
 *              Automatically deletes the local temp file after upload (success or failure).
 *              Renamed from the original 'claudinary.js' to fix the typo.
 */

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure Cloudinary with credentials from environment variables.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a local file to Cloudinary and removes the temp file afterward.
 * @param {string} localFilePath - Absolute or relative path to the temp file on disk.
 * @returns {Promise<object|null>} Cloudinary upload response object, or null on failure.
 */
const uploadOnCloudinary = async (localFilePath, options = {}) => {
  try {
    if (!localFilePath) {
      console.warn("uploadOnCloudinary: No local file path provided.");
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      ...options
    });


    // Remove the temp file after successful upload.
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // Remove the temp file even on failure to keep the public/temp directory clean.
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Cloudinary upload error:", error.message);
    return null;
  }
};

export { uploadOnCloudinary };
