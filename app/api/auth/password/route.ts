import {
  getPasswordSession,
  verifyPassword,
  passwordHash,
  validPassword,
  issueSession,
  sessionCookie,
  consumeLimit,
} from "@/lib/password-auth";
import { database } from "@/lib/db";
import { checkWrite, authError, AccessError } from "@/lib/access";
export async function POST(r: Request) {
  try {
    checkWrite(r);
    const s = await getPasswordSession();
    if (!s) throw new AccessError("Please sign in.", 401);
    if (!(await consumeLimit("password:" + s.member.id, 10)))
      throw new AccessError("Too many attempts. Try again in 15 minutes.", 429);
    const raw = await r.text();
    if (raw.length > 2048) throw new AccessError("Request too large.", 413);
    const b = JSON.parse(raw);
    if (
      !validPassword(b.password) ||
      typeof b.currentPassword !== "string" ||
      b.currentPassword.length > 128
    )
      throw new AccessError("Use a password of 12–128 characters.", 400);
    const db = database();
    const c = await db
      .prepare("SELECT password_hash FROM auth_credentials WHERE member_id=? AND revision=?")
      .bind(s.member.id, s.revision)
      .first<{ password_hash: string }>();
    if (!c || !(await verifyPassword(b.currentPassword, c.password_hash)))
      throw new AccessError("Current password is incorrect.", 400);
    if (b.currentPassword === b.password)
      throw new AccessError("Choose a different password.", 400);
    const hash = await passwordHash(b.password);
    const changes = await db.batch([
      db
        .prepare(
          "UPDATE auth_credentials SET password_hash=?,must_change=0,revision=revision+1 WHERE member_id=? AND revision=?",
        )
        .bind(hash, s.member.id, s.revision),
      db
        .prepare("DELETE FROM auth_sessions WHERE member_id=? AND revision<=?")
        .bind(s.member.id, s.revision),
    ]);
    if (!changes[0].meta.changes) throw new AccessError("Credentials changed. Sign in again.", 409);
    const token = await issueSession(s.member.id, s.revision + 1);
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return authError(e);
  }
}
