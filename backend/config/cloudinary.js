const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload image to Cloudinary
const uploadToCloudinary = async (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || 'kids',
      public_id: options.public_id,
      resource_type: 'image',
      // Let Cloudinary handle optimization - don't resize on upload
      quality: 'auto',
      fetch_format: 'auto',
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(buffer);
  });
};

// Delete image from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Generate optimized thumbnail URL (80x80, cropped)
const getThumbnailUrl = (imageUrl) => {
  if (!imageUrl) return null;
  // Insert transformation before /upload/
  return imageUrl.replace('/upload/', '/upload/c_fill,w_80,h_80,f_auto,q_auto/');
};

// Generate optimized full image URL
const getOptimizedUrl = (imageUrl) => {
  if (!imageUrl) return null;
  // Insert transformation before /upload/
  return imageUrl.replace('/upload/', '/upload/f_auto,q_auto/');
};

module.exports = {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  getThumbnailUrl,
  getOptimizedUrl,
};
