import "server-only";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

let client: S3Client | null = null;
const s3 = () => (client ??= new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" }));

// The raw email SES stored (the shop's AWS key may read raw/* in this bucket only).
export async function getRawEmail(bucket: string, key: string): Promise<Uint8Array> {
  const res = await s3().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`empty S3 object ${bucket}/${key}`);
  return res.Body.transformToByteArray();
}
