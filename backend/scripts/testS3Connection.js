import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
dotenv.config();

async function testS3() {
  console.log('--- Testing AWS S3 Connection ---');
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'ap-south-1';
  const bucketName = process.env.AWS_BUCKET_NAME || 'krishna-valley-erp-documents';

  console.log(`Region:      ${region}`);
  console.log(`Bucket:      ${bucketName}`);
  console.log(`Access Key:  ${accessKeyId ? accessKeyId.slice(0, 4) + '...' + accessKeyId.slice(-4) : 'MISSING (Empty in .env)'}`);
  console.log(`Secret Key:  ${secretAccessKey ? '*** Configured ***' : 'MISSING (Empty in .env)'}`);

  if (!accessKeyId || !secretAccessKey) {
    console.error('\n❌ ERROR: AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY is missing in backend/.env');
    console.log('Please add your AWS credentials into backend/.env to connect S3.\n');
    process.exit(1);
  }

  const s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });

  const testKey = `test_connection/s3_ping_${Date.now()}.txt`;
  const testContent = `Krishna Valley ERP S3 Connection Verified at ${new Date().toISOString()}`;

  try {
    console.log('\n1. Testing Upload (PutObject)...');
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: Buffer.from(testContent),
      ContentType: 'text/plain'
    }));
    console.log(`✓ PutObject succeeded! Test file written to s3://${bucketName}/${testKey}`);

    console.log('\n2. Testing List Bucket (ListObjectsV2)...');
    const listRes = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'test_connection/',
      MaxKeys: 5
    }));
    console.log(`✓ ListObjects succeeded! Found ${listRes.KeyCount || 0} test objects.`);

    console.log('\n3. Cleaning up test file (DeleteObject)...');
    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey
    }));
    console.log('✓ DeleteObject succeeded! Test file removed.');

    console.log('\n🎉 SUCCESS: AWS S3 is fully connected and read/write operational for Krishna Valley ERP!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ S3 Connection Failed:', err.message);
    if (err.Code) console.error(`Error Code: ${err.Code}`);
    process.exit(1);
  }
}

testS3();
