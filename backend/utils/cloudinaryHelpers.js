const cloudinary = require("../config/cloudinary");

// https://res.cloudinary.com/<cloud>/image/upload/v123/women_skill_platform/profile_photos/abc.jpg
//   -> women_skill_platform/profile_photos/abc
const publicIdFromUrl = (url) => {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return null;
  return match[1].replace(/\.[^/.]+$/, "");
};

// Best-effort delete: a failed Cloudinary call should not break the user's request.
const destroyImage = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete failed:", publicId, error.message);
  }
};

module.exports = { publicIdFromUrl, destroyImage };
