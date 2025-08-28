// Supabase Storage upload utilities for JanMat
import { supabase } from "./supabase";

export interface UploadResult {
  url: string;
  path: string;
}

export const uploadToSupabaseStorage = async (
  file: File,
  bucket: string = "issues",
  folder: string = "uploads"
): Promise<string> => {
  try {
    // Create unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    console.log("Uploading file to Supabase Storage:", {
      fileName,
      bucket,
      size: file.size,
    });

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Supabase storage upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    console.log("File uploaded successfully:", data);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log("Public URL generated:", urlData.publicUrl);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Storage upload error:", error);
    throw new Error("Failed to upload file. Please try again.");
  }
};

// Legacy function name for backward compatibility
export const uploadToCloudinary = uploadToSupabaseStorage;

export const uploadMultipleToCloudinary = async (
  files: File[],
  bucket: string = "issues",
  folder: string = "uploads"
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) =>
      uploadToSupabaseStorage(file, bucket, folder)
    );
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error("Multiple upload error:", error);
    // Fallback to placeholder URLs if upload fails
    console.warn("Upload failed, using placeholder URLs for all images");
    return files.map(
      (file, index) =>
        `https://via.placeholder.com/400x300?text=Image+${index + 1}+${encodeURIComponent(file.name.substring(0, 10))}`
    );
  }
};

export const validateImageFile = (file: File): boolean => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Please upload only JPEG, PNG, or WebP images.");
  }

  if (file.size > maxSize) {
    throw new Error("Image size must be less than 10MB.");
  }

  return true;
};

export const compressImage = (
  file: File,
  quality: number = 0.8
): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions (max 1920px width)
      const maxWidth = 1920;
      const scale = Math.min(1, maxWidth / img.width);

      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        file.type,
        quality
      );
    };

    img.src = URL.createObjectURL(file);
  });
};
