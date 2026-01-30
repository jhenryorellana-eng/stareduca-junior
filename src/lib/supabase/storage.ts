import { createServerClient } from './server';

const BUCKET_NAME = 'community-posts';

/**
 * Upload an image file for a community post
 * Uses service role key to bypass RLS (auth is validated at API route level)
 * @param studentId - The ID of the student uploading the image
 * @param file - The image file to upload
 * @returns The public URL of the uploaded image, or null if upload failed
 */
export async function uploadPostImage(
  studentId: string,
  file: File
): Promise<string | null> {
  try {
    const supabase = createServerClient();

    // Generate unique path: posts/{studentId}/{timestamp}.{extension}
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const path = `posts/${studentId}/${timestamp}.${ext}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      return null;
    }

    // Get public URL
    const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error('Error in uploadPostImage:', error);
    return null;
  }
}

/**
 * Delete an image from storage by its URL
 * @param url - The public URL of the image to delete
 * @returns true if deletion was successful, false otherwise
 */
export async function deletePostImage(url: string): Promise<boolean> {
  try {
    const supabase = createServerClient();

    const path = extractStoragePath(url);
    if (!path) {
      console.error('Could not extract storage path from URL:', url);
      return false;
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.error('Error deleting image:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePostImage:', error);
    return false;
  }
}

/**
 * Extract the storage path from a Supabase Storage public URL
 */
function extractStoragePath(url: string): string | null {
  try {
    // URL format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Check if a URL is from our Supabase Storage
 */
export function isStorageUrl(url: string): boolean {
  return url.includes('supabase.co/storage/v1/object/public/');
}
