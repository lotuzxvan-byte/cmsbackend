import { getPasswordSession, sessionCookie } from "@/lib/password-auth";
import { database } from "@/lib/db";
import { checkWrite, authError } from "@/lib/access";
export async function POST(r: Request) {
  try {
    checkWrite(r);
    const s = await getPasswordSession();
    if (s)
      await database()
        .prepare("DELETE FROM auth_sessions WHERE token_hash=?")
        .bind(s.tokenHash)
        .run();
    return Response.json(
      { ok: true },
      { headers: { "Set-Cookie": sessionCookie("", true), "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return authError(e);
  }
}
