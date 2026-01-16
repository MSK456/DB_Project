import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLAUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Uploading
    const UploadOnCloudinary = async (localFilePath) => {
        try {
            if(!localFilePath) {
                console.log("Local file path not found !!!");
                return null 
            }
            
            // upload the file on claudinary
            const response = await cloudinary.uploader.upload(localFilePath, {
                resource_type: "auto"
            })
            // file has been uploaded successfully
            console.log("File is uploaded on claodinary. ", response.url);
            return response;

        } catch (error) {
            fs.unlink(localFilePath); // Unlinking files from local 
            // storage.
            console.log("Error: ", error);
            return null
        }
    }

export { UploadOnCloudinary }