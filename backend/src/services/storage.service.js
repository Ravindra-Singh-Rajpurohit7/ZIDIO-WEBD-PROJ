const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

/**
 * Upload a multer file buffer to Cloudinary.
 * @param {Express.Multer.File} file
 * @param {string} folder  - Cloudinary folder name
 * @returns {Promise<cloudinary.UploadApiResponse>}
 */
exports.uploadToCloudinary = (file, folder = "general") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        // Limit transformations on upload
        transformation: file.mimetype.startsWith("image")
          ? [{ quality: "auto", fetch_format: "auto" }]
          : [],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(file.buffer).pipe(uploadStream);
  });
};

/**
 * Delete a resource from Cloudinary by public_id.
 */
exports.deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
  }
};