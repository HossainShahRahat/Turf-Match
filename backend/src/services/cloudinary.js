import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

function ensureConfigured() {
  if (isConfigured) return true;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) return false;

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });
  isConfigured = true;
  return true;
}

export function cloudinaryConfigured() {
  return ensureConfigured();
}

export async function uploadTournamentImageBuffer(fileBuffer, fileName = "tournament-image") {
  if (!ensureConfigured()) {
    throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.");
  }

  const dataUri = `data:image/*;base64,${fileBuffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "turf-match/tournaments",
    resource_type: "image",
    public_id: `tournament-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    use_filename: true,
    unique_filename: false,
    overwrite: false,
    filename_override: fileName
  });

  return result.secure_url;
}

export async function uploadMatchPosterBuffer(fileBuffer, fileName = "match-poster") {
  if (!ensureConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  const dataUri = `data:image/*;base64,${fileBuffer.toString("base64")}`;
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "turf-match/matches",
    resource_type: "image",
    public_id: `match-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    use_filename: true,
    unique_filename: false,
    overwrite: false,
    filename_override: fileName,
  });

  return result.secure_url;
}
