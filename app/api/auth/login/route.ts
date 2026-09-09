import { env } from "cloudflare:workers";
import { database } from "@/lib/db";
import { AccessError, authError, checkWrite, CORPORATE_TENANT, type Member } from "@/lib/access";
import {
  consumeLimit,
  issueSession,
  sessionCookie,
  verifyPassword,
  passwordHash,
} from "@/lib/password-auth";
export const dynamic = "force-dynamic";
export async function POST(r: Request) {
  try {
    checkWrite(r);
    const raw = await r.text();
    if (raw.length > 2048) throw new AccessError("Request too large.", 413);
    const b = JSON.parse(raw),
      email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
    if (!email || email.length > 254 || typeof b.password !== "string" || b.password.length > 128)
      throw new AccessError("Email or password is incorrect.", 401);
    const ip = r.headers.get("cf-connecting-ip") || "local";
    const limited = await Promise.all([
      consumeLimit("login-email:" + email, 10),
      consumeLimit("login-ip:" + ip, 60),
    ]);
    if (limited.some((x) => !x))
      throw new AccessError("Too many attempts. Try again in 15 minutes.", 429);
    const db = database();
    await db.batch([
      db.prepare("DELETE FROM auth_sessions WHERE expires<=?").bind(Date.now()),
      db.prepare("DELETE FROM auth_limits WHERE expires<=?").bind(Date.now()),
    ]);
    let member = await db
      .prepare("SELECT * FROM members WHERE email=? AND tenant=?")
      .bind(email, CORPORATE_TENANT)
      .first<Member>();
    let credential = member
      ? await db
          .prepare("SELECT * FROM auth_credentials WHERE member_id=?")
          .bind(member.id)
          .first<{ password_hash: string; must_change: number; revision: number }>()
      : null;
    const settings = env as unknown as {
      BANK_ADMIN_EMAIL?: string;
      BANK_ADMIN_PASSWORD_HASH?: string;
    };
    // One-time bootstrap never overwrites an existing password or reactivates a user.
    if (
      !credential &&
      email === settings.BANK_ADMIN_EMAIL?.trim().toLowerCase() &&
      settings.BANK_ADMIN_PASSWORD_HASH &&
      (await verifyPassword(b.password, settings.BANK_ADMIN_PASSWORD_HASH))
    ) {
      const now = new Date().toISOString();
      if (!member) {
        await db
          .prepare(
            `INSERT OR IGNORE INTO members(id,tenant,email,name,role,status,revision,created,updated) SELECT 'primary-administrator',?,?,?,'Administrator','Active',1,?,? WHERE NOT EXISTS(SELECT 1 FROM members WHERE tenant=?)`,
          )
          .bind(CORPORATE_TENANT, email, "Administrator", now, now, CORPORATE_TENANT)
          .run();
        member = await db
          .prepare("SELECT * FROM members WHERE email=? AND tenant=?")
          .bind(email, CORPORATE_TENANT)
          .first<Member>();
      }
      if (member?.status === "Active" && member.role === "Administrator") {
        await db
          .prepare(
            "INSERT OR IGNORE INTO auth_credentials(member_id,password_hash,must_change,revision) VALUES(?,?,1,1)",
          )
          .bind(member.id, settings.BANK_ADMIN_PASSWORD_HASH)
          .run();
        credential = await db
          .prepare("SELECT * FROM auth_credentials WHERE member_id=?")
          .bind(member.id)
          .first<{ password_hash: string; must_change: number; revision: number }>();
      }
    }
    if (!credential) {
      await passwordHash(b.password, "0".repeat(64));
      throw new AccessError("Email or password is incorrect.", 401);
    }
    if (
      !(await verifyPassword(b.password, credential.password_hash)) ||
      !member ||
      member.status !== "Active"
    )
      throw new AccessError("Email or password is incorrect.", 401);
    const token = await issueSession(member.id, credential.revision);
    const now = new Date().toISOString();
    await db.batch([
      db.prepare("UPDATE members SET last_login=? WHERE id=?").bind(now, member.id),
      db
        .prepare("INSERT INTO audit(id,tenant,actor,action,detail,created) VALUES(?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), member.tenant, member.id, "Password sign-in", "Signed in", now),
    ]);
    return Response.json(
      { mustChange: !!credential.must_change },
      { headers: { "Set-Cookie": sessionCookie(token), "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return authError(e);
  }
}
