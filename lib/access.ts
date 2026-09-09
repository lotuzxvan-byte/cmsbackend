import { getPasswordSession } from './password-auth';
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
export async function requireMember() {
  const session = await getPasswordSession();
  if (!session)
    throw new AccessError('Please sign in to access corporate banking.', 401);
  if (session.mustChange)
    throw new AccessError(
      'Change your temporary password before continuing.',
      403,
    );
  return session.member;
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
  if (e instanceof SyntaxError)
    e = new AccessError('Invalid JSON request.', 400);
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
    activated: !!m.last_login,
    created: m.created,
    updated: m.updated,
  };
}
