import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AWS S3 Client
const s3Region = process.env.AWS_REGION || 'ap-south-1';
const bucketName = process.env.AWS_BUCKET_NAME || 'krishna-valley-erp-documents';

let s3Client = null;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: s3Region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
  console.log(`[AWS S3] Configured for region: ${s3Region}, bucket: ${bucketName}`);
} else {
  console.log('[AWS S3] Notice: AWS S3 credentials not set in .env. Falling back to local persistent uploads directory.');
}

/**
 * Uploads a file buffer to AWS S3 (or local fallback)
 * @param {Buffer} fileBuffer - The binary buffer of the file
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type (e.g. application/pdf)
 * @param {string} folder - Destination folder (e.g. agreements)
 * @returns {Promise<{ documentUrl: string, documentName: string, storage: string }>}
 */
export const uploadFileToS3 = async (fileBuffer, originalName, mimeType, folder = 'agreements') => {
  const timestamp = Date.now();
  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileKey = `${folder}/${timestamp}_${sanitizedName}`;

  if (s3Client && process.env.AWS_BUCKET_NAME) {
    try {
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType
      });

      await s3Client.send(command);

      const s3Url = `https://${bucketName}.s3.${s3Region}.amazonaws.com/${fileKey}`;
      console.log(`[AWS S3] Successfully uploaded to S3: ${s3Url}`);
      return {
        documentUrl: s3Url,
        documentName: originalName,
        fileKey: fileKey,
        storage: 'aws-s3'
      };
    } catch (error) {
      console.error('[AWS S3 Error] Failed to upload to S3:', error.message);
      console.log('[AWS S3] Falling back to local storage.');
    }
  }

  // Local fallback storage
  const uploadDir = path.resolve(__dirname, `../uploads/${folder}`);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const localFilePath = path.join(uploadDir, `${timestamp}_${sanitizedName}`);
  fs.writeFileSync(localFilePath, fileBuffer);

  const localUrl = `/uploads/${folder}/${timestamp}_${sanitizedName}`;
  console.log(`[Local Upload] Saved agreement file to: ${localUrl}`);

  return {
    documentUrl: localUrl,
    documentName: originalName,
    fileKey: fileKey,
    storage: 'local'
  };
};
