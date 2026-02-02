import { DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";

export function getKeyFromUrl(url: string | null) {
  if (!url) return null;
  try {
    // Handles https://pub-xxx.r2.dev/covers/img.jpg -> covers/img.jpg
    const parts = url.split('.dev/');
    if (parts.length > 1) {
      return decodeURIComponent(parts[1]);
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function deleteR2File(url: string | null) {
  const key = getKeyFromUrl(url);
  if (!key) return;

  try {
    await r2.send(new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }));
    console.log(`[R2] Deleted file: ${key}`);
  } catch (err) {
    console.error(`[R2] Delete failed for ${key}:`, err);
  }
}

export async function deleteR2Folder(prefix: string) {
  try {
    // List all files in the folder (HLS segments)
    const listParams = { Bucket: process.env.R2_BUCKET_NAME, Prefix: prefix };
    const listedObjects = await r2.send(new ListObjectsV2Command(listParams));

    if (listedObjects.Contents && listedObjects.Contents.length > 0) {
      const deleteParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Delete: { Objects: listedObjects.Contents.map((obj) => ({ Key: obj.Key })) }
      };
      await r2.send(new DeleteObjectsCommand(deleteParams));
      console.log(`[R2] Deleted folder: ${prefix}`);
    }
  } catch (err) {
    console.error(`[R2] Folder delete failed for ${prefix}:`, err);
  }
}