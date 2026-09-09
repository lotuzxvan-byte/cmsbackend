import {
  requireMember,
  publicMember,
  checkWrite,
  AccessError,
  authError,
} from '@/lib/access';
import { database } from '@/lib/db';
import { validatePayment, amountMinor, type Account } from '@/lib/banking';
export const dynamic = 'force-dynamic';
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const today = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
function json(data: unknown, status = 200, cookie?: string) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    },
  });
}
async function seed(tenant: string) {
  const db = database();
  if (
    await db
      .prepare('SELECT id FROM accounts WHERE tenant=? LIMIT 1')
      .bind(tenant)
      .first()
  )
    return;
  const as = [
    [
      'operating',
      'Operating account',
      '900 102 3811',
      'IDR',
      'Current',
      8345750000,
    ],
    [
      'payroll',
      'Payroll account',
      '900 102 3822',
      'IDR',
      'Current',
      2000000000,
    ],
    [
      'collections',
      'Collections account',
      '900 102 3833',
      'IDR',
      'Current',
      1500000000,
    ],
    [
      'reserve',
      'Business reserve',
      '900 102 3844',
      'IDR',
      'Savings',
      1000000000,
    ],
    [
      'usd',
      'USD trade account',
      '900 102 3855',
      'USD',
      'Proposed currency account',
      15000000,
    ],
  ];
  const statements = as.map((a) =>
    db
      .prepare(
        'INSERT OR IGNORE INTO accounts (id,tenant,name,number,currency,type,balance) VALUES (?,?,?,?,?,?,?)',
      )
      .bind(tenant + '-' + a[0], tenant, ...a.slice(1)),
  );
  const sample = [
    [
      'PT Cipta Karya',
      125000000,
      'Pending',
      'RTGS',
      'Supplier payment',
      'out',
      'Rina',
    ],
    [
      'September payroll',
      284500000,
      'Pending',
      'Internal',
      '32 employees · September',
      'out',
      'Rina',
    ],
    [
      'PLN Electricity',
      8750000,
      'Pending',
      'Bill payment',
      'Office utilities',
      'out',
      'Rina',
    ],
    [
      'PT Mitra Abadi',
      185000000,
      'Completed',
      'BI-FAST',
      'INV-2026-0921',
      'in',
      'System',
    ],
    [
      'PT Sumber Makmur',
      320000000,
      'Completed',
      'RTGS',
      'Supplier settlement',
      'out',
      'Rina',
    ],
    [
      'PT Aruna Logistik',
      75000000,
      'Completed',
      'BI-FAST',
      'INV-2026-0908',
      'in',
      'System',
    ],
  ];
  sample.forEach((p, i) =>
    statements.push(
      db
        .prepare(
          'INSERT OR IGNORE INTO payments (id,tenant,account_id,beneficiary,bank,number,amount,currency,rail,reference,date,status,maker,direction,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        )
        .bind(
          tenant + '-seed-' + i,
          tenant,
          tenant + (i === 1 ? '-payroll' : '-operating'),
          p[0],
          'Bank Sampoerna',
          '9001023999',
          p[1],
          'IDR',
          p[3],
          p[4],
          today(),
          p[2],
          p[6],
          p[5],
          now(),
        ),
    ),
  );
  statements.push(
    db
      .prepare(
        'INSERT OR IGNORE INTO records(id,tenant,kind,data,created) VALUES(?,?,?,?,?)',
      )
      .bind(
        tenant + '-va',
        tenant,
        'virtual',
        JSON.stringify({
          name: 'PT Mitra Abadi',
          number: 'DEMO-VA-0001',
          account_id: tenant + '-collections',
          amount: 185000000,
          status: 'Awaiting payment',
          reference: 'INV-2026-0922',
        }),
        now(),
      ),
  );
  statements.push(
    db
      .prepare(
        'INSERT OR IGNORE INTO audit(id,tenant,actor,action,detail,created) VALUES(?,?,?,?,?,?)',
      )
      .bind(
        tenant + '-init',
        tenant,
        'System',
        'Workspace initialized',
        'Fictional banking data created',
        now(),
      ),
  );
  await db.batch(statements);
}
export async function GET(r: Request) {
  try {
    const member = await requireMember();
    const tenant = member.tenant;
    await seed(tenant);
    const db = database();
    const [a, p, rec, au] = await db.batch([
      db
        .prepare('SELECT * FROM accounts WHERE tenant=? ORDER BY currency,name')
        .bind(tenant),
      db
        .prepare('SELECT * FROM payments WHERE tenant=? ORDER BY created DESC')
        .bind(tenant),
      db
        .prepare('SELECT * FROM records WHERE tenant=? ORDER BY created DESC')
        .bind(tenant),
      db
        .prepare(
          'SELECT * FROM audit WHERE tenant=? ORDER BY created DESC LIMIT 200',
        )
        .bind(tenant),
    ]);
    const names = (
      await db
        .prepare('SELECT id,name FROM members WHERE tenant=?')
        .bind(tenant)
        .all<{ id: string; name: string }>()
    ).results;
    const display = (id: unknown) => names.find((x) => x.id === id)?.name || id;
    return json(
      {
        currentUser: publicMember(member),
        accounts: a.results,
        payments: p.results.map((row: any) => ({
          ...row,
          maker: display(row.maker),
          approver: row.approver ? display(row.approver) : null,
        })),
        records: rec.results.map((x: any) => ({
          ...x,
          data: JSON.parse(x.data),
        })),
        audit: au.results.map((row: any) => ({
          ...row,
          actor: display(row.actor),
        })),
      },
      200,
    );
  } catch (e) {
    if (e instanceof AccessError) return authError(e);
    console.error(e);
    return json(
      {
        error:
          'The banking workspace is temporarily unavailable. Please retry.',
      },
      503,
    );
  }
}
export async function POST(r: Request) {
  try {
    checkWrite(r);
    const member = await requireMember();
    const tenant = member.tenant;
    const raw = await r.text();
    if (raw.length > 150000)
      return json({ error: 'Request is too large.' }, 413);
    const b = JSON.parse(raw);
    const role = member.role;
    const actor = member.id;
    const db = database();
    const accounts = (
      await db
        .prepare('SELECT * FROM accounts WHERE tenant=?')
        .bind(tenant)
        .all()
    ).results as unknown as Account[];
    const log = (action: string, detail: string) =>
      db
        .prepare(
          'INSERT INTO audit(id,tenant,actor,action,detail,created) VALUES(?,?,?,?,?,?)',
        )
        .bind(uid(), tenant, actor, action, detail, now());
    if (b.action === 'account') {
      if (role !== 'Administrator')
        throw new AccessError('Administrator access is required.', 403);
      const a = b.account;
      const name = String(a?.name || '').trim(),
        number = String(a?.number || '').trim();
      if (
        !name ||
        name.length > 100 ||
        !/^DEMO-[A-Za-z0-9-]{3,24}$/.test(number) ||
        !['IDR', 'USD'].includes(a.currency) ||
        !['Current', 'Savings'].includes(a.type)
      )
        throw new AccessError(
          'Enter a name, a DEMO- prefixed identifier, currency and account type.',
          400,
        );
      const balance =
        Number(a.balance) === 0 ? 0 : amountMinor(a.balance, a.currency);
      if (!Number.isSafeInteger(balance) || balance < 0 || balance > 1e13)
        throw new AccessError('Enter a valid opening balance.', 400);
      if (accounts.some((x) => x.number === number))
        throw new AccessError('This account identifier is already used.', 409);
      const id = uid();
      await db.batch([
        db
          .prepare(
            'INSERT INTO accounts(id,tenant,name,number,currency,type,balance) VALUES(?,?,?,?,?,?,?)',
          )
          .bind(id, tenant, name, number, a.currency, a.type, balance),
        log('Demo account created', name + ' · ' + number),
      ]);
      return json({ id });
    }
    if (b.action === 'payment' || b.action === 'batch') {
      if (role !== 'Maker')
        return json(
          { error: 'Maker access is required to create instructions.' },
          403,
        );
      const input = b.action === 'batch' ? b.payments : [b.payment];
      if (!Array.isArray(input) || input.length < 1 || input.length > 100)
        throw Error('Submit 1–100 payment instructions.');
      const items = input.map((p) => validatePayment(p, accounts));
      const totals = new Map<string, number>();
      for (const p of items)
        totals.set(p.account_id, (totals.get(p.account_id) || 0) + p.amount);
      for (const [id, total] of totals)
        if (total > accounts.find((a) => a.id === id)!.balance)
          throw Error('The batch total exceeds available funds.');
      const batch = b.action === 'batch' ? uid() : null;
      const ids = items.map(() => uid());
      await db.batch([
        ...items.map((p, i) =>
          db
            .prepare(
              'INSERT INTO payments(id,tenant,account_id,beneficiary,bank,number,amount,currency,rail,reference,date,status,maker,direction,batch,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            )
            .bind(
              ids[i],
              tenant,
              p.account_id,
              p.beneficiary,
              p.bank,
              p.number,
              p.amount,
              p.currency,
              p.rail,
              p.reference,
              p.date,
              'Pending',
              actor,
              'out',
              batch,
              now(),
            ),
        ),
        log(
          'Instructions submitted',
          items.length + ' payment(s) awaiting approval',
        ),
      ]);
      return json({ ids, batch, status: 'Pending' });
    }
    if (b.action === 'approve' || b.action === 'reject') {
      if (role !== 'Approver')
        return json(
          { error: 'Approver access is required to review instructions.' },
          403,
        );
      const p = await db
        .prepare('SELECT * FROM payments WHERE id=? AND tenant=?')
        .bind(b.id, tenant)
        .first<any>();
      if (!p) throw Error('Payment not found.');
      if (p.status !== 'Pending')
        return json({ error: 'This payment has already been reviewed.' }, 409);
      if (p.maker === actor)
        throw Error('A maker cannot approve their own payment.');
      const op = uid();
      const approved = b.action === 'approve';
      if (!approved && (!b.reason || String(b.reason).trim().length < 3))
        throw Error('Provide a rejection reason.');
      if (approved && p.date > today())
        throw Error(
          'This instruction is future dated. Approve on its execution date; automatic scheduling is not connected.',
        );
      const results = await db.batch([
        db
          .prepare(
            `UPDATE payments SET status=?,approver=?,op=? WHERE id=? AND tenant=? AND status='Pending' AND maker!=? ${approved ? 'AND amount <= (SELECT balance FROM accounts WHERE id=payments.account_id AND tenant=payments.tenant)' : ''}`,
          )
          .bind(
            approved ? 'Completed' : 'Rejected',
            actor,
            op,
            b.id,
            tenant,
            actor,
          ),
        ...(approved
          ? [
              db
                .prepare(
                  'UPDATE accounts SET balance=balance-? WHERE id=? AND tenant=? AND EXISTS(SELECT 1 FROM payments WHERE id=? AND tenant=? AND op=?)',
                )
                .bind(p.amount, p.account_id, tenant, b.id, tenant, op),
            ]
          : []),
        db
          .prepare(
            'INSERT INTO audit(id,tenant,actor,action,detail,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM payments WHERE id=? AND tenant=? AND op=?)',
          )
          .bind(
            uid(),
            tenant,
            actor,
            approved ? 'Simulated payment completed' : 'Payment rejected',
            String(p.reference) +
              (approved ? '' : ': ' + String(b.reason).slice(0, 200)),
            now(),
            b.id,
            tenant,
            op,
          ),
      ]);
      if (!results[0].meta.changes)
        return json(
          {
            error:
              'Insufficient balance or payment already processed. Refresh and retry.',
          },
          409,
        );
      return json({ status: approved ? 'Completed' : 'Rejected' });
    }
    if (b.action === 'record') {
      if (role !== 'Maker' && role !== 'Administrator')
        throw Error('Use Maker or Administrator to create a request.');
      if (!['virtual', 'sweep', 'service'].includes(b.kind))
        throw Error('Unknown request type.');
      const d = b.data;
      if (
        !d ||
        typeof d.name !== 'string' ||
        !d.name.trim() ||
        d.name.length > 120
      )
        throw Error('Enter a name (maximum 120 characters).');
      let data: any;
      if (b.kind === 'virtual') {
        const a = accounts.find(
          (a) => a.id === d.account_id && a.currency === 'IDR',
        );
        if (!a) throw Error('Choose an IDR collection account.');
        const amount = Number(d.amount);
        if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1e12)
          throw Error('Enter a valid whole-rupiah amount.');
        data = {
          name: d.name,
          account_id: a.id,
          amount,
          reference: String(d.reference || '').slice(0, 120),
          number: 'DEMO-VA-' + uid().slice(0, 8).toUpperCase(),
          status: 'Awaiting payment',
        };
      } else if (b.kind === 'sweep') {
        const source = accounts.find((a) => a.id === d.source),
          target = accounts.find((a) => a.id === d.target);
        if (
          !source ||
          !target ||
          source.id === target.id ||
          source.currency !== target.currency
        )
          throw Error('Choose different accounts in the same currency.');
        const threshold = Number(d.threshold);
        if (
          !Number.isSafeInteger(threshold) ||
          threshold < 0 ||
          threshold > 1e12
        )
          throw Error('Enter a valid target balance.');
        data = {
          name: d.name,
          source: d.source,
          target: d.target,
          threshold,
          status: 'Configured · simulation',
          schedule: 'End of day · 17:00 WIB',
        };
      } else {
        if (
          ![
            'Escrow',
            'Account Bank',
            'Cash pickup',
            'Cash delivery',
            'Cash deposit machine',
            'Digital collections',
            'Notional pooling',
            'Interest optimization',
            'API / Host-to-host',
            'Loan information',
          ].includes(d.service)
        )
          throw Error('Choose a valid service.');
        data = {
          name: d.name,
          service: d.service,
          notes: String(d.notes || '').slice(0, 2000),
          status: 'Draft request · not sent to bank',
        };
      }
      const id = uid();
      await db.batch([
        db
          .prepare(
            'INSERT INTO records(id,tenant,kind,data,created) VALUES(?,?,?,?,?)',
          )
          .bind(id, tenant, b.kind, JSON.stringify(data), now()),
        log('Created ' + b.kind, d.name),
      ]);
      return json({ id, data });
    }
    if (b.action === 'collect') {
      if (role !== 'Maker') throw Error('Use Maker to simulate a receipt.');
      const rec = await db
        .prepare(
          "SELECT * FROM records WHERE id=? AND tenant=? AND kind='virtual'",
        )
        .bind(b.id, tenant)
        .first<any>();
      if (!rec) throw Error('Virtual account not found.');
      const d = JSON.parse(rec.data);
      if (d.status !== 'Awaiting payment')
        return json({ error: 'Already reconciled.' }, 409);
      const op = uid();
      const updated = JSON.stringify({ ...d, status: 'Reconciled', op });
      const paymentId = uid();
      const res = await db.batch([
        db
          .prepare(
            'UPDATE records SET data=? WHERE id=? AND tenant=? AND data=?',
          )
          .bind(updated, b.id, tenant, rec.data),
        db
          .prepare(
            'UPDATE accounts SET balance=balance+? WHERE id=? AND tenant=? AND EXISTS(SELECT 1 FROM records WHERE id=? AND tenant=? AND data=?)',
          )
          .bind(d.amount, d.account_id, tenant, b.id, tenant, updated),
        db
          .prepare(
            'INSERT INTO payments(id,tenant,account_id,beneficiary,bank,number,amount,currency,rail,reference,date,status,maker,direction,created) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND tenant=? AND data=?)',
          )
          .bind(
            paymentId,
            tenant,
            d.account_id,
            d.name,
            'Virtual account',
            d.number,
            d.amount,
            'IDR',
            'Virtual account',
            d.reference || d.name,
            today(),
            'Completed',
            actor,
            'in',
            now(),
            b.id,
            tenant,
            updated,
          ),
        db
          .prepare(
            'INSERT INTO audit(id,tenant,actor,action,detail,created) SELECT ?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM records WHERE id=? AND tenant=? AND data=?)',
          )
          .bind(
            uid(),
            tenant,
            actor,
            'Receipt reconciled',
            d.number,
            now(),
            b.id,
            tenant,
            updated,
          ),
      ]);
      if (!res[0].meta.changes)
        return json({ error: 'Receipt already processed.' }, 409);
      return json({ status: 'Reconciled' });
    }
    throw Error('Unsupported action.');
  } catch (e) {
    if (e instanceof AccessError) return authError(e);
    return json(
      { error: e instanceof Error ? e.message : 'Unable to process request.' },
      400,
    );
  }
}
