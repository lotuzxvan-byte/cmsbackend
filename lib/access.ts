import { env } from 'cloudflare:workers';
import { getChatGPTUser, type ChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/lib/db';
export type Member = {
  id: string;
  tenant: string;
  user_id: string | null;
  email: string;
  name: string;
  role: 'Maker' | 'Approver' | 'Administrator';
  status: 'Active' | 'Suspended';
  revision: number;
  created: string;
  updated: string;
  last_login: string | null;
};
export class AccessError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export const CORPORATE_TENANT = 'sampoerna-corporate-v2';
export async function resolveMember(user: ChatGPTUser): Promise<Member | null> {
  const db = database();
  const email = user.email.trim().toLowerCase();
  const bootstrap = (
    env as unknown as { BANK_ADMIN_EMAIL?: string }
  ).BANK_ADMIN_EMAIL?.trim().toLowerCase();
  if (bootstrap && email === bootstrap) {
    const now = new Date().toISOString();
    await db
      .prepare(
        "INSERT OR IGNORE INTO members(id,tenant,user_id,email,name,role,status,revision,created,updated,last_login) SELECT ?,?,?,?,?, 'Administrator','Active',1,?,?,? WHERE NOT EXISTS(SELECT 1 FROM members WHERE tenant=?)",
      )
      .bind(
        'primary-administrator',
        CORPORATE_TENANT,
        user.userId,
        email,
        user.displayName.slice(0, 100),
        now,
        now,
        now,
        CORPORATE_TENANT,
      )
      .run();
  }
  let member = await db
    .prepare('SELECT * FROM members WHERE email=? AND tenant=?')
    .bind(email, CORPORATE_TENANT)
    .first<Member>();
  if (!member || member.status !== 'Active') return null;
  if (member.user_id && member.user_id !== user.userId) return null;
  if (!member.user_id) {
    const now = new Date().toISOString();
    await db.batch([
      db
        .prepare(
          "UPDATE members SET user_id=?,last_login=?,updated=? WHERE id=? AND user_id IS NULL AND status='Active'",
        )
        .bind(user.userId, now, now, member.id),
      db
        .prepare(
          'INSERT INTO audit(id,tenant,actor,action,detail,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM members WHERE id=? AND user_id=?)',
        )
        .bind(
          crypto.randomUUID(),
          member.tenant,
          member.id,
          'User activated',
          member.email,
          now,
          member.id,
          user.userId,
        ),
    ]);
    member = await db
      .prepare('SELECT * FROM members WHERE id=? AND user_id=?')
      .bind(member.id, user.userId)
      .first<Member>();
  }
  return member;
}
export async function requireMember() {
  const user = await getChatGPTUser();
  if (!user)
    throw new AccessError('Please sign in to access corporate banking.', 401);
  const member = await resolveMember(user);
  if (!member)
    throw new AccessError(
      'Your account is not enabled. Contact your administrator.',
      403,
    );
  return member;
}
export async function requireAdmin() {
  const m = await requireMember();
  if (m.role !== 'Administrator')
    throw new AccessError('Administrator access is required.', 403);
  return m;
}
export function checkWrite(r: Request) {
  if (r.headers.get('origin') !== new URL(r.url).origin)
    throw new AccessError('Invalid request origin.', 403);
  if (!r.headers.get('content-type')?.includes('application/json'))
    throw new AccessError('JSON content is required.', 415);
}
export function authError(e: unknown) {
  if (e instanceof SyntaxError) e = new AccessError("Invalid JSON request.", 400);
  if (e instanceof AccessError)
    return Response.json(
      { error: e.message },
      { status: e.status, headers: { 'Cache-Control': 'no-store' } },
    );
  console.error(e);
  return Response.json(
    { error: 'Unable to complete this request. Please retry.' },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}
export function publicMember(m: Member) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    role: m.role,
    status: m.status,
    revision: m.revision,
    activated: !!m.user_id,
    created: m.created,
    updated: m.updated,
  };
}
