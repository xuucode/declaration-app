import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: 'ap-northeast-1',
});

export const S3_CONFIG = {
  BUCKET_NAME: process.env.OGP_BUCKET_NAME ?? 'declaration-app-ogp-images',
};
