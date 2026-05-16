import { DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { r2 } from "@/lib/r2";
import { getMediaKeyFromUrl } from "@/lib/media";

type DeleteOptions = {
  throwOnError?: boolean;
};

export function getKeyFromUrl(url: string | null) {
  return getMediaKeyFromUrl(url);
}

export async function deleteR2File(url: string | null, options: DeleteOptions = {}) {
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
    if (options.throwOnError) throw err;
  }
}

export async function deleteR2Folder(prefix: string, options: DeleteOptions = {}) {
  try {
    let continuationToken: string | undefined;
    let deletedCount = 0;

    do {
      const listedObjects = await r2.send(
        new ListObjectsV2Command({
          Bucket: process.env.R2_BUCKET_NAME,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        })
      );

      const objects = listedObjects.Contents?.filter((obj) => obj.Key).map((obj) => ({ Key: obj.Key })) || [];
      if (objects.length > 0) {
        await r2.send(
          new DeleteObjectsCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Delete: { Objects: objects },
          })
        );
        deletedCount += objects.length;
      }

      continuationToken = listedObjects.IsTruncated ? listedObjects.NextContinuationToken : undefined;
    } while (continuationToken);

    if (deletedCount > 0) console.log(`[R2] Deleted folder: ${prefix} (${deletedCount} objects)`);
  } catch (err) {
    console.error(`[R2] Folder delete failed for ${prefix}:`, err);
    if (options.throwOnError) throw err;
  }
}
