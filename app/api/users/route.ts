import { passwordHash, validPassword } from '@/lib/password-auth';

import { database } from '@/lib/db';

import {
  requireAdmin,
  checkWrite,
  authError,
  AccessError,
  publicMember,
  type Member,
} from '@/lib/access';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = await requireAdmin();

    const data = await database()
      .prepare('SELECT * FROM members WHERE tenant=? ORDER BY created DESC')

      .bind(admin.tenant)

      .all<Member>();

    return Response.json(
      {
        users: data.results.map(publicMember),

        currentUser: publicMember(admin),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    return authError(e);
  }
}

export async function POST(r: Request) {
  try {
    checkWrite(r);

    const admin = await requireAdmin();

    const raw = await r.text();

    if (raw.length > 10000) throw new AccessError('Request too large.', 413);

    const b = JSON.parse(raw);

    const db = database();

    const now = new Date().toISOString();

    const log = (action: string, detail: string) =>
      db

        .prepare(
          'INSERT INTO audit(id,tenant,actor,action,detail,created) VALUES(?,?,?,?,?,?)',
        )

        .bind(crypto.randomUUID(), admin.tenant, admin.id, action, detail, now);

    if (b.action === 'reset-password') {
      const target = await db
        .prepare('SELECT * FROM members WHERE id=? AND tenant=?')
        .bind(String(b.id), admin.tenant)
        .first<Member>();

      if (!target) throw new AccessError('User not found.', 404);

      if (target.id === admin.id)
        throw new AccessError('Use Change password for your own account.', 400);

      if (!validPassword(b.password))
        throw new AccessError(
          'Temporary password must have 12–128 characters.',
          400,
        );

      const hash = await passwordHash(b.password);

      await db.batch([
        db
          .prepare(
            'INSERT INTO auth_credentials(member_id,password_hash,must_change,revision) VALUES(?,?,1,1) ON CONFLICT(member_id) DO UPDATE SET password_hash=excluded.password_hash,must_change=1,revision=revision+1',
          )
          .bind(target.id, hash),

        db
          .prepare('DELETE FROM auth_sessions WHERE member_id=?')
          .bind(target.id),

        log('Password reset', target.email),
      ]);

      return Response.json(
        {
          message:
            'Temporary password set. Share it privately. Existing sessions were revoked.',
        },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }

    if (b.action === 'create') {
      const email = String(b.email || '')
          .trim()

          .toLowerCase(),
        name = String(b.name || '').trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
        throw new AccessError('Enter a valid email address.', 400);

      if (!name || name.length > 100)
        throw new AccessError('Enter a name up to 100 characters.', 400);

      if (!['Maker', 'Approver', 'Administrator'].includes(b.role))
        throw new AccessError('Choose a valid role.', 400);

      if (
        await db

          .prepare('SELECT id FROM members WHERE email=?')

          .bind(email)

          .first()
      )
        throw new AccessError('A user with this email already exists.', 409);

      if (!validPassword(b.password))
        throw new AccessError(
          'Temporary password must have 12–128 characters.',
          400,
        );

      const hash = await passwordHash(b.password);

      const id = crypto.randomUUID();

      try {
        await db.batch([
          db

            .prepare(
              "INSERT INTO members(id,tenant,email,name,role,status,revision,created,updated) VALUES(?,?,?,?,?,'Active',1,?,?)",
            )

            .bind(id, admin.tenant, email, name, b.role, now, now),

          db
            .prepare(
              'INSERT INTO auth_credentials(member_id,password_hash,must_change,revision) VALUES(?,?,1,1)',
            )
            .bind(id, hash),
          log('User access created', email + ' · ' + b.role),
        ]);
      } catch (e) {
        if (String(e).includes('UNIQUE'))
          throw new AccessError('A user with this email already exists.', 409);

        throw e;
      }

      return Response.json(
        {
          id,

          message:
            'User created. Share the temporary password privately; it must be changed at first sign-in.',
        },
        { status: 201 },
      );
    }

    if (b.action === 'update') {
      const target = await db

        .prepare('SELECT * FROM members WHERE id=? AND tenant=?')

        .bind(String(b.id), admin.tenant)

        .first<Member>();

      if (!target) throw new AccessError('User not found.', 404);

      const name = String(b.name || '').trim();

      if (
        !name ||
        name.length > 100 ||
        !['Maker', 'Approver', 'Administrator'].includes(b.role) ||
        !['Active', 'Suspended'].includes(b.status)
      )
        throw new AccessError('Check the user name, role and status.', 400);

      if (
        target.id === admin.id &&
        (b.role !== 'Administrator' || b.status !== 'Active')
      )
        throw new AccessError(
          'You cannot remove your own administrator access.',
          400,
        );

      if (!Number.isInteger(b.revision) || b.revision !== target.revision)
        throw new AccessError(
          'This user was updated elsewhere. Refresh and retry.',
          409,
        );

      const result = await db.batch([
        db

          .prepare(
            'UPDATE members SET name=?,role=?,status=?,revision=revision+1,updated=? WHERE id=? AND tenant=? AND revision=?',
          )

          .bind(
            name,
            b.role,
            b.status,
            now,
            target.id,
            admin.tenant,
            b.revision,
          ),

        db

          .prepare(
            'INSERT INTO audit(id,tenant,actor,action,detail,created) SELECT ?,?,?,?,?,? WHERE changes()=1',
          )

          .bind(
            crypto.randomUUID(),
            admin.tenant,
            admin.id,
            'User access updated',
            target.email + ' · ' + b.role + ' · ' + b.status,
            now,
          ),
      ]);

      if (!result[0].meta.changes)
        throw new AccessError(
          'This user was updated elsewhere. Refresh and retry.',
          409,
        );

      if (b.status === 'Suspended')
        await db
          .prepare('DELETE FROM auth_sessions WHERE member_id=?')
          .bind(target.id)
          .run();

      return Response.json({
        message: 'User updated. Permissions apply to subsequent requests.',
      });
    }

    throw new AccessError('Unknown user-management action.', 400);
  } catch (e) {
    return authError(e);
  }
}
