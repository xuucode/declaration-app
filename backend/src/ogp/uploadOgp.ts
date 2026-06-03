import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_CONFIG } from '../config/s3.js';
import { generateOgpImage, OgpType } from './generateOgp.js';

interface UploadOgpOptions {
  declarationId: string;
  type: OgpType;
  title: string;
  displayName: string;
  streakCount?: number;
}

export const uploadOgpImage = async (options: UploadOgpOptions): Promise<string> => {
  const { declarationId, type, title, displayName, streakCount } = options;

  const imageBuffer = await generateOgpImage({ type, title, displayName, streakCount });

  const key = `ogp/${declarationId}/${type}.png`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: S3_CONFIG.BUCKET_NAME,
      Key: key,
      Body: imageBuffer,
      ContentType: 'image/png',
    })
  );

  const imageUrl = `https://${S3_CONFIG.BUCKET_NAME}.s3.ap-northeast-1.amazonaws.com/${key}`;
  return imageUrl;
};