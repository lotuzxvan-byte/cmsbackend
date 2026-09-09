import AdminUsers from './admin-users';
('use client');
import { useState } from 'react';
import {
  Search,
  Download,
  ChevronRight,
  Plus,
  FileText,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Users,
  Landmark,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { money, downloadCSV, type BankData, type Payment } from '@/lib/banking';
export function Choice({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <Select value={value} onValueChange={(v) => onChange(String(v))}>
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue>
            {options
              .map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
              .find((o) => o.value === value)?.label || 'Choose…'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options
            .map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
            .map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export function Status({ status }: { status: string }) {
  return (
    <span
      className={
        'status ' +
        (status === 'Completed' || status === 'Reconciled'
          ? 'success'
          : status === 'Rejected'
            ? 'rejected'
            : 'pending')
      }
    >
      {status}
    </span>
  );
}
export function exportPayments(items: Payment[], name = 'transactions.csv') {
  downloadCSV(name, [
    [
      'Reference',
      'Beneficiary',
      'Bank',
      'Account',
      'Amount',
      'Currency',
      'Direction',
      'Method',
      'Date',
      'Status',
      'Maker',
      'Approver',
    ],
    ...items.map((p) => [
      p.reference,
      p.beneficiary,
      p.bank,
      p.number,
      p.currency === 'USD' ? p.amount / 100 : p.amount,
      p.currency,
      p.direction,
      p.rail,
      p.date,
      p.status,
      p.maker,
      p.approver || '',
    ]),
  ]);
}
export function PaymentTable({
  items,
  onDetail,
}: {
  items: Payment[];
  onDetail: (p: Payment) => void;
}) {
  return items.length ? (
    <Table>
      <TableHeader>
        <TableRow>
          {[
            'Beneficiary / reference',
            'Method',
            'Execution date',
            'Status',
            'Amount',
            '',
          ].map((t, i) => (
            <TableHead key={i}>{t}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <b>{p.beneficiary}</b>
              <small className="cell-sub">{p.reference}</small>
            </TableCell>
            <TableCell>{p.rail}</TableCell>
            <TableCell>{p.date}</TableCell>
            <TableCell>
              <Status status={p.status} />
            </TableCell>
            <TableCell className={p.direction === 'in' ? 'trend' : ''}>
              {p.direction === 'in' ? '+ ' : ''}
              {money(p.amount, p.currency)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                aria-label={'Review ' + p.beneficiary}
                onClick={() => onDetail(p)}
              >
                Details <ChevronRight size={14} />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ) : (
    <div className="empty-state">
      <FileText />
      <h3>No transactions found</h3>
      <p>Try another filter or create a payment.</p>
    </div>
  );
}
export function Dashboard({
  data,
  go,
  open,
  detail,
  hidden,
  toggleHidden,
}: {
  data: BankData;
  go: (v: string) => void;
  open: (v: string) => void;
  detail: (p: Payment) => void;
  hidden: boolean;
  toggleHidden: () => void;
}) {
  const total = data.accounts
    .filter((a) => a.currency === 'IDR')
    .reduce((s, a) => s + a.balance, 0);
  const incoming = data.payments
    .filter(
      (p) =>
        p.status === 'Completed' &&
        p.direction === 'in' &&
        p.currency === 'IDR',
    )
    .reduce((s, p) => s + p.amount, 0);
  const outgoing = data.payments
    .filter(
      (p) =>
        p.status === 'Completed' &&
        p.direction === 'out' &&
        p.currency === 'IDR',
    )
    .reduce((s, p) => s + p.amount, 0);
  const pending = data.payments.filter((p) => p.status === 'Pending');
  const recent = data.payments
    .filter((p) => p.status === 'Completed')
    .slice(0, 4);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const key = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
    const rows = data.payments.filter(
      (p) => p.date === key && p.status === 'Completed' && p.currency === 'IDR',
    );
    return {
      label: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
      in: rows
        .filter((p) => p.direction === 'in')
        .reduce((s, p) => s + p.amount, 0),
      out: rows
        .filter((p) => p.direction === 'out')
        .reduce((s, p) => s + p.amount, 0),
    };
  });
  const max = Math.max(1, ...days.flatMap((d) => [d.in, d.out]));
  return (
    <>
      <div className="stats">
        <div className="balance-card">
          <div className="stat-label">
            Total available balance{' '}
            <button
              onClick={toggleHidden}
              aria-label={hidden ? 'Show balances' : 'Hide balances'}
              className="balance-eye"
            >
              {hidden ? 'Show' : 'Hide'}
            </button>
          </div>
          <h2>
            {hidden ? (
              '••••••••••'
            ) : (
              <>
                <small>IDR</small>{' '}
                {new Intl.NumberFormat('en-US').format(total)}
              </>
            )}
          </h2>
          <div className="balance-bottom">
            <span>
              Across {data.accounts.filter((a) => a.currency === 'IDR').length}{' '}
              IDR business accounts
            </span>
            <button onClick={() => go('Accounts')}>
              View accounts <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon green">
            <ArrowDownLeft size={20} />
          </span>
          <span className="stat-label">Money in · sample activity</span>
          <h2>
            {hidden ? (
              '••••'
            ) : (
              <>
                <small>IDR</small> {(incoming / 1e9).toFixed(2)}B
              </>
            )}
          </h2>
          <small className="trend">Reconciled incoming transactions</small>
        </div>
        <div className="stat-card">
          <span className="stat-icon red">
            <ArrowUpRight size={20} />
          </span>
          <span className="stat-label">Money out · sample activity</span>
          <h2>
            {hidden ? (
              '••••'
            ) : (
              <>
                <small>IDR</small> {(outgoing / 1e9).toFixed(2)}B
              </>
            )}
          </h2>
          <small className="muted">Completed sandbox payments</small>
        </div>
      </div>
      <div className="quick-actions">
        {[
          ['Transfer funds', ArrowLeftRight, 'payment'],
          ['Upload payroll', Users, 'batch'],
          ['Pay a bill', FileText, 'bill'],
          ['Create virtual account', Landmark, 'virtual'],
        ].map(([label, Icon, target]: any) => (
          <button key={label} onClick={() => open(target)}>
            <span>
              <Icon size={20} />
            </span>
            {label}
            <ChevronRight size={16} />
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Cash flow</h3>
              <p>Completed IDR transactions · last 7 days</p>
            </div>
            <span className="period">Daily activity</span>
          </div>
          <div className="chart-legend">
            <span>
              <i className="green-dot" />
              Money in
            </span>
            <span>
              <i className="red-dot" />
              Money out
            </span>
            <small>Peak {hidden ? '••••' : money(max)}</small>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={
              hidden
                ? 'Cash flow balances hidden'
                : days
                    .map(
                      (d) =>
                        `${d.label}: in ${money(d.in)}, out ${money(d.out)}`,
                    )
                    .join('; ')
            }
          >
            {days.map((d) => (
              <div
                className="bar-pair"
                key={d.label}
                title={
                  hidden
                    ? 'Balances hidden'
                    : `${d.label}: in ${money(d.in)}, out ${money(d.out)}`
                }
              >
                <div
                  style={{
                    height: hidden
                      ? '5%'
                      : Math.max(2, (d.in / max) * 100) + '%',
                  }}
                />
                <div
                  style={{
                    height: hidden
                      ? '5%'
                      : Math.max(2, (d.out / max) * 100) + '%',
                  }}
                />
                <small>{d.label}</small>
              </div>
            ))}
          </div>
          <div className="chart-footer">
            <span>Net activity</span>
            <strong>{hidden ? '••••' : money(incoming - outgoing)}</strong>
            <button className="text-button" onClick={() => go('Reports')}>
              Explore reports <ArrowUpRight size={14} />
            </button>
          </div>
        </section>
        <section className="panel approval-panel">
          <div className="panel-heading">
            <h3>
              Needs your attention{' '}
              <span className="count">{pending.length}</span>
            </h3>
            <button aria-label="Open approvals" onClick={() => go('Approvals')}>
              <ArrowUpRight size={18} />
            </button>
          </div>
          <p className="muted">Review and keep business moving.</p>
          {pending.length ? (
            pending.slice(0, 3).map((p) => (
              <button
                className="approval-preview full-row"
                key={p.id}
                onClick={() => detail(p)}
              >
                <span className="approval-icon">
                  <FileText size={19} />
                </span>
                <div>
                  <b>{p.beneficiary}</b>
                  <small>{p.reference}</small>
                  <strong>
                    {hidden ? '••••' : money(p.amount, p.currency)}
                  </strong>
                </div>
                <ChevronRight size={16} />
              </button>
            ))
          ) : (
            <div className="empty-state compact">
              <ShieldCheck />
              <p>You’re all caught up.</p>
            </div>
          )}
          <Button
            variant="outline"
            className="full"
            onClick={() => go('Approvals')}
          >
            View all approvals <ChevronRight size={15} />
          </Button>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <h3>Recent transactions</h3>
          <button className="text-button" onClick={() => go('Payments')}>
            View all transactions <ArrowUpRight size={16} />
          </button>
        </div>
        {recent.map((p) => (
          <button
            className="recent-row full-row"
            key={p.id}
            onClick={() => detail(p)}
          >
            <span
              className={
                'stat-icon ' + (p.direction === 'in' ? 'green' : 'red')
              }
            >
              {p.direction === 'in' ? (
                <ArrowDownLeft size={18} />
              ) : (
                <ArrowUpRight size={18} />
              )}
            </span>
            <div>
              <b>{p.beneficiary}</b>
              <small>
                {p.reference} · {p.rail}
              </small>
            </div>
            <span>{p.date}</span>
            <Status status={p.status} />
            <strong className={p.direction === 'in' ? 'trend' : ''}>
              {hidden
                ? '••••'
                : (p.direction === 'in' ? '+ ' : '− ') +
                  money(p.amount, p.currency)}
            </strong>
          </button>
        ))}
      </section>
    </>
  );
}
export function Workspace({
  view,
  data,
  open,
  detail,
  act,
  role,
  go,
}: {
  view: string;
  data: BankData;
  open: (v: string) => void;
  detail: (p: Payment) => void;
  act: (body: any) => Promise<any>;
  role: string;
  go: (v: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [account, setAccount] = useState('All accounts');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [tab, setTab] = useState('history');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const filtered = data.payments.filter(
    (p) =>
      (status === 'All statuses' || p.status === status) &&
      (account === 'All accounts' || p.account_id === account) &&
      (!from || p.date >= from) &&
      (!to || p.date <= to) &&
      `${p.beneficiary} ${p.reference} ${p.bank}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const recordRows = data.records.filter(
    (r) =>
      r.kind ===
      (view === 'Collections'
        ? 'virtual'
        : view === 'Liquidity'
          ? 'sweep'
          : 'service'),
  );
  const filters = (
    <div className="filter-row">
      <div className="search-input">
        <Search size={17} />
        <Input
          aria-label="Search transactions"
          placeholder="Search beneficiary or reference"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Choice
        label="Status"
        value={status}
        onChange={setStatus}
        options={['All statuses', 'Pending', 'Completed', 'Rejected']}
      />
      <Button variant="outline" onClick={() => exportPayments(filtered)}>
        <Download size={16} /> Export CSV
      </Button>
    </div>
  );
  if (view === 'Accounts')
    return (
      <>
        <div className="sub-heading">
          <p>Database-backed demo accounts for your company.</p>
          {role === 'Administrator' && (
            <Button onClick={() => open('account')}>
              <Plus size={16} /> Add demo account
            </Button>
          )}
        </div>
        <div className="account-grid">
          {data.accounts.map((a) => (
            <button
              className="panel account-tile"
              key={a.id}
              onClick={() => {
                setAccount(a.id);
                setTab('history');
              }}
            >
              <div className="panel-heading">
                <span className="stat-icon red">
                  <Wallet size={21} />
                </span>
                <span className="currency-tag">{a.currency}</span>
              </div>
              <h3>{a.name}</h3>
              <p>{a.number}</p>
              <h2>{money(a.balance, a.currency)}</h2>
              <small>
                {a.type} · View statement <ChevronRight size={13} />
              </small>
            </button>
          ))}
        </div>
        <section className="panel section-space">
          <h3>Account statements</h3>
          <div className="filter-row">
            <Choice
              label="Account"
              value={account}
              onChange={setAccount}
              options={[
                'All accounts',
                ...data.accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
            <label className="field">
              From
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="field">
              To
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <Button
              variant="outline"
              onClick={() =>
                exportPayments(
                  filtered.filter((p) => p.status === 'Completed'),
                  'account-statement.csv',
                )
              }
            >
              <Download size={16} /> Download statement
            </Button>
          </div>
          <p className="muted">
            Showing completed sample movements. Live Sampoerna movement/history
            availability follows the bank’s retention rules.
          </p>
          <PaymentTable
            items={filtered.filter((p) => p.status === 'Completed')}
            onDetail={detail}
          />
        </section>
      </>
    );
  if (view === 'Payments' || view === 'Approvals' || view === 'Payroll & batch')
    return (
      <section className="panel">
        <div className="panel-heading">
          <h3>
            {view === 'Approvals'
              ? 'Payment approval queue'
              : view === 'Payroll & batch'
                ? 'Payroll & batch instructions'
                : 'Payment activity'}
          </h3>
          <Button
            onClick={() =>
              open(view === 'Payroll & batch' ? 'batch' : 'payment')
            }
          >
            <Plus size={16} />
            {view === 'Payroll & batch' ? 'Upload batch' : 'New payment'}
          </Button>
        </div>
        {view === 'Approvals' && (
          <div className="info-box">
            You are signed in with the <b>{role}</b> role. Select Approver in
            the header to approve or reject. Approval simulates a debit; real
            transactions are never sent.
          </div>
        )}
        {view === 'Payroll & batch' && (
          <p className="muted">
            Upload up to 100 recipients, check each payment, then send the batch
            for individual approval.
          </p>
        )}
        {filters}
        <PaymentTable
          items={filtered.filter((p) =>
            view === 'Approvals'
              ? p.status === 'Pending'
              : view === 'Payroll & batch'
                ? !!p.batch || p.beneficiary === 'September payroll'
                : true,
          )}
          onDetail={detail}
        />
      </section>
    );
  if (view === 'Collections' || view === 'Liquidity')
    return (
      <>
        <div className="sub-heading">
          <p>
            {view === 'Collections'
              ? 'Identify incoming payments and reconcile them to your business accounts.'
              : 'Set up same-currency, end-of-day balance sweeps.'}
          </p>
          <Button
            onClick={() => open(view === 'Collections' ? 'virtual' : 'sweep')}
          >
            <Plus size={16} />
            {view === 'Collections'
              ? 'Create virtual account'
              : 'New sweep rule'}
          </Button>
        </div>
        {error && (
          <p role="alert" className="error-box">
            {error}
          </p>
        )}
        <div className="record-grid">
          {recordRows.map((r) => (
            <section className="panel" key={r.id}>
              <div className="panel-heading">
                <h3>{r.data.name}</h3>
                <Status status={r.data.status} />
              </div>
              {view === 'Collections' ? (
                <>
                  <p className="reference-number">{r.data.number}</p>
                  <div className="detail-line">
                    <span>Expected amount</span>
                    <b>{money(r.data.amount)}</b>
                  </div>
                  <div className="detail-line">
                    <span>Credit account</span>
                    <span>
                      {
                        data.accounts.find((a) => a.id === r.data.account_id)
                          ?.name
                      }
                    </span>
                  </div>
                  <div className="detail-line">
                    <span>Reference</span>
                    <span>{r.data.reference || '—'}</span>
                  </div>
                  <div className="actions inline-actions">
                    <Button
                      variant="outline"
                      onClick={() =>
                        downloadCSV('virtual-account.csv', [
                          [
                            'Name',
                            'Virtual account',
                            'Amount',
                            'Reference',
                            'Status',
                          ],
                          [
                            r.data.name,
                            r.data.number,
                            r.data.amount,
                            r.data.reference,
                            r.data.status,
                          ],
                        ])
                      }
                    >
                      <Download size={15} /> Export
                    </Button>
                    <Button
                      disabled={
                        busy ||
                        r.data.status !== 'Awaiting payment' ||
                        role !== 'Maker'
                      }
                      onClick={async () => {
                        setBusy(true);
                        setError('');
                        try {
                          await act({ action: 'collect', id: r.id });
                        } catch (e: any) {
                          setError(e.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {r.data.status === 'Reconciled'
                        ? 'Reconciled'
                        : 'Simulate receipt'}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="sweep-flow">
                    <Wallet />
                    <span>
                      {data.accounts.find((a) => a.id === r.data.source)?.name}
                    </span>
                    <ArrowRightIcon />
                    <span>
                      {data.accounts.find((a) => a.id === r.data.target)?.name}
                    </span>
                  </div>
                  <div className="detail-line">
                    <span>Retained source balance</span>
                    <b>
                      {money(
                        r.data.threshold,
                        data.accounts.find((a) => a.id === r.data.source)
                          ?.currency,
                      )}
                    </b>
                  </div>
                  <div className="detail-line">
                    <span>Schedule</span>
                    <span>{r.data.schedule}</span>
                  </div>
                  <p className="muted">
                    Configuration saved. Automatic sweeping requires the bank’s
                    scheduler and ledger connection.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadCSV('sweep-rule.csv', [
                        ['Name', 'Source', 'Target', 'Retain', 'Schedule'],
                        [
                          r.data.name,
                          r.data.source,
                          r.data.target,
                          r.data.threshold,
                          r.data.schedule,
                        ],
                      ])
                    }
                  >
                    <Download size={15} /> Export rule
                  </Button>
                </>
              )}
            </section>
          ))}
        </div>
        {!recordRows.length && (
          <div className="panel empty-state">
            <Landmark />
            <h3>
              {view === 'Liquidity'
                ? 'No sweep rules yet'
                : 'No virtual accounts yet'}
            </h3>
            <p>
              Create your first{' '}
              {view === 'Liquidity'
                ? 'rule to manage liquidity'
                : 'virtual account to track collections'}
              .
            </p>
          </div>
        )}
        <div className="info-box">
          {view === 'Collections'
            ? 'DEMO-VA identifiers are not bank-issued account numbers. Simulated receipts update your sandbox balance once.'
            : 'Sweeping is part of Sampoerna’s published corporate services. Notional pooling and interest optimization are proposed workflows from the reference document.'}
        </div>
        {view === 'Liquidity' && (
          <Button variant="outline" onClick={() => open('service')}>
            Request pooling or interest optimization <ArrowUpRight size={15} />
          </Button>
        )}
      </>
    );
  if (view === 'Reports')
    return (
      <section className="panel">
        <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
          <TabsList>
            <TabsTrigger value="history">Transaction history</TabsTrigger>
            <TabsTrigger value="audit">Audit trail</TabsTrigger>
          </TabsList>
          <TabsContent value="history">
            {filters}
            <div className="filter-row">
              <Choice
                label="Account"
                value={account}
                onChange={setAccount}
                options={[
                  'All accounts',
                  ...data.accounts.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
              <label className="field">
                From
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label className="field">
                To
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
            <PaymentTable items={filtered} onDetail={detail} />
          </TabsContent>
          <TabsContent value="audit">
            <div className="sub-heading">
              <p>Latest 200 sandbox events</p>
              <Button
                variant="outline"
                onClick={() =>
                  downloadCSV('audit-trail.csv', [
                    ['Time', 'Actor', 'Action', 'Detail'],
                    ...data.audit.map((a) => [
                      a.created,
                      a.actor,
                      a.action,
                      a.detail,
                    ]),
                  ])
                }
              >
                <Download size={16} /> Export audit
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  {['Time', 'Actor', 'Action', 'Detail'].map((s) => (
                    <TableHead key={s}>{s}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.audit.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {new Date(a.created).toLocaleString('en-GB', {
                        timeZone: 'Asia/Jakarta',
                      })}{' '}
                      WIB
                    </TableCell>
                    <TableCell>{a.actor}</TableCell>
                    <TableCell>{a.action}</TableCell>
                    <TableCell>{a.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </section>
    );
  if (view === 'Administration')
    return (
      <>
        <AdminUsers role={role} />
        <section className="panel section-space">
          <div className="panel-heading">
            <div>
              <h3>Additional banking services</h3>
              <p>Prepare a request for your relationship manager.</p>
            </div>
            <Button onClick={() => open('service')}>
              <Plus size={16} /> New service request
            </Button>
          </div>
          <div className="service-list">
            {data.records
              .filter((r) => r.kind === 'service')
              .map((r) => (
                <div className="service-item" key={r.id}>
                  <div>
                    <b>
                      {r.data.service} · {r.data.name}
                    </b>
                    <p>{r.data.notes}</p>
                    <Status status={r.data.status} />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      downloadCSV('service-request.csv', [
                        ['Service', 'Company / project', 'Notes', 'Status'],
                        [
                          r.data.service,
                          r.data.name,
                          r.data.notes,
                          r.data.status,
                        ],
                      ])
                    }
                  >
                    Download draft
                  </Button>
                </div>
              ))}
          </div>
          {!data.records.some((r) => r.kind === 'service') && (
            <p className="muted">
              No service requests. Escrow, Account Bank, cash logistics, digital
              collections and API/H2H onboarding can be captured here as draft
              requests.
            </p>
          )}
          <Button variant="outline" onClick={() => go('Reports')}>
            View reports <ChevronRight size={15} />
          </Button>
        </section>
      </>
    );
  return null;
}
function ArrowRightIcon() {
  return <ChevronRight size={18} />;
}
