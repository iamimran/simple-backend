import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileOnCloudinary = async (localFilePath) => {
  if (!localFilePath) return null;

  try {
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: auto,
    });
  } catch (error) {
    //remove locally saved temporary file as the upload operation got failed
    fs.unlinkSync(localFilePath);
    return null;
  }

  console.log("CLOUDINARY: File uploaded", response.url);
  return response;
};

export { uploadFileOnCloudinary };
