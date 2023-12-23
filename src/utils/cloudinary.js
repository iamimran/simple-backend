import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
    });
    fs.unlink(localFilePath);
    console.log(response.url);
    return response;
  } catch (error) {
    //remove locally saved temporary file as the upload operation got failed
    fs.unlinkSync(localFilePath);
    console.log(error);
    return null;
  }
};

export { uploadFileOnCloudinary };
