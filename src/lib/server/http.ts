import { NextResponse } from 'next/server';
import { ApiError } from './plans';
import { StorageError } from '../storage/types';
export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export async function body(request: Request, maxBytes = 12000): Promise<unknown> {
  const origin = request.headers.get('origin');
  if (origin) {
    const internal = new URL(request.url);
    const host = request.headers.get('host') ?? internal.host;
    const protocol = request.headers.get('x-forwarded-proto') ?? internal.protocol.slice(0, -1);
    // Cloud Run terminates TLS and Next may use 0.0.0.0 internally. Browser Host is
    // the destination authority; never use an arbitrary forwarded-host header.
    if (origin !== `${protocol}://${host}`)
      throw new ApiError(403, 'Cross-origin submission rejected');
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    throw new ApiError(415, 'Use application/json');
  if (Number(request.headers.get('content-length') ?? 0) > maxBytes)
    throw new ApiError(413, 'Payload too large');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'JSON body required');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ApiError(413, 'Payload too large');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new ApiError(400, 'Malformed JSON');
  }
}
export async function handle(operation: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ApiError) return json({ error: error.message }, error.status);
    if (error instanceof StorageError) return json({ error: error.message }, 409);
    // Never log payloads, tokens, URLs, or SDK error objects that may contain credentials.
    console.error('Request failed: data or persistence service unavailable');
    return json(
      { error: 'Persistence unavailable. Check the server Firestore configuration and try again.' },
      503,
    );
  }
}
