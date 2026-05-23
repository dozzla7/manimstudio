import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'fs/promises';
import path from 'path';
import mime from 'mime-types'; // Note: we might need to install this or just hardcode video/mp4

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'wrapped-case-cmd2nhckkwkb';
const ENDPOINT = process.env.S3_ENDPOINT || 'https://t3.storageapi.dev';

// Ensure the S3 Client is only initialized if credentials exist
let s3Client: S3Client | null = null;

try {
  s3Client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'tid_BHAgfigSQuqdEvgnECvaOtVxOdFOPc_umjWojMBZXevNnOrpZE',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
    },
    // Required for some S3-compatible APIs like Tigris/MinIO
    forcePathStyle: true,
  });
} catch (error) {
  console.warn('⚠️ S3 Client failed to initialize. Check credentials.', error);
}

export async function uploadToS3(filePath: string, objectKey: string): Promise<string | null> {
  if (!s3Client) {
    console.error('❌ S3 Client not initialized.');
    return null;
  }
  
  if (!process.env.S3_SECRET_ACCESS_KEY) {
    console.error('❌ S3_SECRET_ACCESS_KEY is missing in environment variables.');
    return null;
  }

  try {
    const fileBuffer = await readFile(filePath);
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: 'video/mp4',
    });

    console.log(`[S3] Uploading ${objectKey} to bucket ${BUCKET_NAME}...`);
    await s3Client.send(command);
    console.log(`[S3] Successfully uploaded ${objectKey}`);
    
    // For Tigris and most S3 compatible storages with virtual-hosted-style URLs:
    // If endpoint is https://t3.storageapi.dev and bucket is my-bucket
    // URL is usually https://my-bucket.t3.storageapi.dev/key OR https://t3.storageapi.dev/my-bucket/key
    // The user specified: "Use virtual-hosted-style URLs"
    const publicUrl = `https://${BUCKET_NAME}.t3.storageapi.dev/${objectKey}`;
    return publicUrl;
  } catch (error) {
    console.error(`[S3] Error uploading file:`, error);
    return null;
  }
}
