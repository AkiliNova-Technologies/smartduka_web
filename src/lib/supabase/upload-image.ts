import { supabase } from './client';

interface UploadImageOptions {
  file: File;
  bucket: string;
  folder?: string;
  maxSizeInMB?: number;
}

interface UploadImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

export async function uploadImageToSupabase({
  file,
  bucket,
  folder = 'categories',
  maxSizeInMB = 5,
}: UploadImageOptions): Promise<UploadImageResult> {
  try {
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSizeInMB) {
      return {
        success: false,
        error: `File size must be less than ${maxSizeInMB}MB`,
      };
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'File must be an image (JPEG, PNG, WebP, or GIF)',
      };
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    const fileName = `${folder}/${timestamp}-${randomString}.${extension}`;

    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload image',
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
}