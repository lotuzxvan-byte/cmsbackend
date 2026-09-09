import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
export function GET() {
  const fingerprint = (
    env as unknown as { ANDROID_CERT_SHA256?: string }
  ).ANDROID_CERT_SHA256?.trim().toUpperCase();
  if (!fingerprint || !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(fingerprint)) {
    return Response.json([], { headers: { 'Cache-Control': 'no-store' } });
  }
  return Response.json(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.lotuzxvan.sampoerna.sandbox',
          sha256_cert_fingerprints: [fingerprint],
        },
      },
    ],
    { headers: { 'Cache-Control': 'public, max-age=300' } },
  );
}
