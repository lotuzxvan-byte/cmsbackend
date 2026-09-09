import { cookies } from 'next/headers';
import { database } from './db';
import type { Member } from './access';
export const SESSION_COOKIE = '__Host-banking_session';
export const SESSION_SECONDS = 8 * 60 * 60;
export const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) =>
    x.toString(16).padStart(2, '0'),
  ).join('');
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)),
    ),
    (x) => x.toString(16).padStart(2, '0'),
  ).join('');
}
export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}
export async function passwordHash(password: string, salt = randomToken()) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(salt),
      iterations: 100000,
    },
    key,
    256,
  );
  return `pbkdf2-sha256:100000:${salt}:${Array.from(new Uint8Array(bits), (x) => x.toString(16).padStart(2, '0')).join('')}`;
}
export async function verifyPassword(password: string, encoded: string) {
  const parts = encoded.split(':');
  if (
    parts.length !== 4 ||
    parts[0] !== 'pbkdf2-sha256' ||
    parts[1] !== '100000' ||
    !/^[a-f0-9]{64}$/.test(parts[2]) ||
    !/^[a-f0-9]{64}$/.test(parts[3])
  )
    return false;
  const actual = await passwordHash(password, parts[2]);
  let mismatch = actual.length ^ encoded.length;
  for (let i = 0; i < actual.length; i++)
    mismatch |= actual.charCodeAt(i) ^ encoded.charCodeAt(i);
  return mismatch === 0;
}
export async function getPasswordSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await database()
    .prepare(
      `SELECT m.*,c.must_change,c.revision AS credential_revision FROM auth_sessions s JOIN members m ON m.id=s.member_id JOIN auth_credentials c ON c.member_id=m.id WHERE s.token_hash=? AND s.expires>? AND s.revision=c.revision AND m.status='Active'`,
    )
    .bind(await digest(token), Date.now())
    .first<Member & { must_change: number; credential_revision: number }>();
  return row
    ? {
        member: row,
        mustChange: !!row.must_change,
        tokenHash: await digest(token),
        revision: row.credential_revision,
      }
    : null;
}
export async function issueSession(memberId: string, revision: number) {
  const token = randomToken();
  const result = await database()
    .prepare(
      `INSERT INTO auth_sessions(token_hash,member_id,revision,expires) SELECT ?,member_id,revision,? FROM auth_credentials WHERE member_id=? AND revision=?`,
    )
    .bind(
      await digest(token),
      Date.now() + SESSION_SECONDS * 1000,
      memberId,
      revision,
    )
    .run();
  if (!result.meta.changes) throw Error('Credentials changed. Sign in again.');
  return token;
}
export function sessionCookie(token: string, clear = false) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${clear ? 0 : SESSION_SECONDS}`;
}
export async function consumeLimit(key: string, maximum: number) {
  const now = Date.now(),
    until = now + 15 * 60 * 1000;
  const row = await database()
    .prepare(
      `INSERT INTO auth_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<=? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING count`,
    )
    .bind(await digest(key), until, now, now)
    .first<{ count: number }>();
  return !!row && row.count <= maximum;
}
