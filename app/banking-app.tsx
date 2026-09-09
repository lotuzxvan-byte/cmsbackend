'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Users,
  CheckCheck,
  Landmark,
  ChartNoAxesCombined,
  FileText,
  Settings,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Bell,
  ShieldCheck,
  CircleHelp,
  Download,
  Building2,
  RefreshCw,
  Menu,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Dashboard,
  Workspace,
  Choice,
  Status,
  exportPayments,
} from '@/components/banking/workspace';
import { Forms } from '@/components/banking/forms';
import {
  emptyData,
  money,
  downloadCSV,
  type BankData,
  type Payment,
} from '@/lib/banking';
const navigation = [
  ['Overview', LayoutDashboard],
  ['Accounts', Wallet],
  ['Payments', ArrowLeftRight],
  ['Payroll & batch', Users],
  ['Approvals', CheckCheck],
  ['Collections', Landmark],
  ['Liquidity', ChartNoAxesCombined],
  ['Reports', FileText],
  ['Administration', Settings],
] as const;
const titles: Record<string, string> = {
  account: 'Add demo account',
  payment: 'New payment',
  bill: 'Pay a bill',
  batch: 'Upload payroll & batch',
  virtual: 'Create virtual account',
  sweep: 'Configure a sweep',
  service: 'New service request',
  detail: 'Payment details',
  help: 'Your corporate banking workspace',
  notifications: 'Notifications',
  menus: 'All services',
};
export default function BankingApp({
  member,
}: {
  member: { id: string; name: string; email: string; role: string };
}) {
  const [view, setView] = useState('Overview');
  const [data, setData] = useState<BankData>(emptyData);
  const [identity, setIdentity] = useState(member);
  const role = identity.role;
  const [modal, setModal] = useState('');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const refresh = useCallback(async () => {
    setError('');
    try {
      const r = await fetch('/api/banking');
      const d: any = await r.json();
      if (!r.ok) {
        if (r.status === 401 || r.status === 403) {
          setData(emptyData);
          window.location.assign('/');
        }
        throw Error(d.error);
      }
      setData(d);
      if (d.currentUser) setIdentity(d.currentUser);
      return d;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh().catch(() => {});
    const sync = () => {
      let s = 'Overview';
      try {
        s = decodeURIComponent(location.hash.slice(1)) || 'Overview';
      } catch {
        return;
      }
      if (navigation.some(([n]) => n === s)) setView(s);
    };
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [refresh]);
  const go = useCallback((v: string) => {
    setView(v);
    location.hash = encodeURIComponent(v);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const ctrl = new AbortController();
    const tools = [
      {
        name: 'read_banking_sandbox',
        description:
          'Read the current fictional balances, payments and pending approvals. Does not move money.',
        inputSchema: {
          type: 'object',
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute: () => ({
          accounts: dataRef.current.accounts,
          payments: dataRef.current.payments,
        }),
      },
      {
        name: 'navigate_banking_workspace',
        description:
          'Open a banking workspace menu without creating or approving a transaction.',
        inputSchema: {
          type: 'object',
          properties: {
            menu: { type: 'string', enum: navigation.map(([n]) => n) },
          },
          required: ['menu'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute: (input: any) => {
          if (!input || !navigation.some(([n]) => n === input.menu))
            throw Error('Unknown workspace menu');
          go(input.menu);
          return { menu: input.menu };
        },
      },
    ];
    for (const tool of tools) {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: ctrl.signal }),
        ).catch(() => {});
      } catch {}
    }
    return () => ctrl.abort();
  }, [go]);
  const act = async (body: any) => {
    const r = await fetch('/api/banking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d: any = await r.json();
    if (!r.ok) throw Error(d.error || 'Unable to complete action.');
    try {
      await refresh();
    } catch {
      setNotice(
        'Saved, but the updated workspace could not be loaded. Refresh before taking another action.',
      );
      return d;
    }
    setNotice(
      body.action === 'approve'
        ? 'Payment completed in the sandbox.'
        : body.action === 'collect'
          ? 'Receipt reconciled and balance updated.'
          : body.action === 'reject'
            ? 'Payment rejected.'
            : 'Saved successfully.',
    );
    return d;
  };
  const open = (s: string) => {
    setModal(s);
    setModalError('');
    setReason('');
  };
  const detail = (p: Payment) => {
    setSelected(p);
    open('detail');
  };
  const pending = data.payments.filter((p) => p.status === 'Pending');
  const current = selected
    ? data.payments.find((p) => p.id === selected.id) || selected
    : null;
  const isOverview = view === 'Overview';
  const user = identity.name;
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '244px' } as React.CSSProperties}
    >
      <Sidebar className="bank-sidebar">
        <SidebarHeader>
          <button
            className="brand"
            aria-label="Bank Sampoerna overview"
            onClick={() => go('Overview')}
          >
            <img
              src="/sampoerna-logo.png"
              alt="Bank Sahabat Sampoerna"
              width={210}
              height={63}
            />
          </button>
          <div className="workspace">
            <Building2 size={19} />
            <div>
              <b>PT Nusantara Sejahtera</b>
              <small>Corporate banking</small>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <div className="nav-label">WORKSPACE</div>
          {navigation.map(([name, Icon]) => (
            <button
              key={name}
              aria-current={view === name ? 'page' : undefined}
              className={'nav-item ' + (view === name ? 'active' : '')}
              onClick={() => go(name)}
            >
              <Icon size={19} />
              {name}
              {name === 'Approvals' && pending.length > 0 && (
                <span className="nav-count">{pending.length}</span>
              )}
            </button>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <div className="support-card">
            <ShieldCheck size={22} />
            <b>Here for your business</b>
            <small>Explore the sandbox or contact the bank.</small>
            <button className="text-button" onClick={() => open('help')}>
              Help & bank information <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="profile">
            <span className="avatar">
              {role === 'Maker' ? 'AP' : role === 'Approver' ? 'DL' : 'AD'}
            </span>
            <div>
              <b>{user}</b>
              <small>{role} · Signed in</small>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>Corporate banking</span>
            <ChevronRight size={14} />
            <b>{view}</b>
          </div>
          <div className="top-actions">
            <span className="demo-pill">SANDBOX</span>
            <span className="identity-role">{role}</span>
            <a
              className="logout-link"
              href="/signout-with-chatgpt?return_to=%2F"
              target="_top"
            >
              Sign out
            </a>
            <button
              className="icon-button"
              aria-label="Refresh workspace"
              onClick={() => {
                setLoading(true);
                void refresh().catch(() => {});
              }}
            >
              <RefreshCw size={18} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => open('notifications')}
            >
              <Bell size={19} />
              {pending.length > 0 && <i />}
            </button>
            <button
              className="icon-button"
              aria-label="Help"
              onClick={() => open('help')}
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        <div className="page">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {new Date()
                  .toLocaleDateString('en-US', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'Asia/Jakarta',
                  })
                  .toUpperCase()}{' '}
                · WIB
              </p>
              <h1>
                {isOverview ? `Welcome back, ${user.split(' ')[0]}` : view}
                <span>.</span>
              </h1>
              <p>
                {isOverview
                  ? 'Here’s where your business stands today.'
                  : (
                      {
                        Accounts: 'Your business accounts, in one place.',
                        Payments: 'Create, track and manage outgoing payments.',
                        'Payroll & batch': 'Make payday simpler for your team.',
                        Approvals: 'A second pair of eyes on every payment.',
                        Collections:
                          'Turn incoming payments into clear records.',
                        Liquidity: 'Put your business balances to work.',
                        Reports: 'A clear record of your business activity.',
                        Administration:
                          'Manage your corporate banking workspace.',
                      } as any
                    )[view]}
              </p>
            </div>
            <div className="actions">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => {
                  exportPayments(data.payments);
                  setNotice('Transaction report downloaded.');
                }}
              >
                <Download size={16} /> Export report
              </Button>
              <Button disabled={loading} onClick={() => open('payment')}>
                <Plus size={17} /> New payment
              </Button>
            </div>
          </div>
          <div className="sandbox-note">
            <ShieldCheck size={16} />
            <span>
              Demonstration workspace · Fictional accounts and simulated
              transactions. No real money moves.
            </span>
          </div>
          {notice && (
            <div className="notice-box" role="status">
              <span>{notice}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice('')}
              >
                ×
              </button>
            </div>
          )}
          {error && (
            <div className="error-box" role="alert">
              {error}{' '}
              <Button
                variant="outline"
                onClick={() => void refresh().catch(() => {})}
              >
                Retry
              </Button>
            </div>
          )}
          {loading && data.accounts.length === 0 ? (
            <div className="panel empty-state" role="status">
              <RefreshCw className="animate-spin" />
              <h3>Loading your banking workspace</h3>
              <p>Your fictional accounts are being prepared.</p>
            </div>
          ) : data.accounts.length > 0 ? (
            isOverview ? (
              <Dashboard
                data={data}
                go={go}
                open={open}
                detail={detail}
                hidden={hidden}
                toggleHidden={() => setHidden(!hidden)}
              />
            ) : (
              <Workspace
                key={view}
                view={view}
                data={data}
                open={open}
                detail={detail}
                act={act}
                role={role}
                go={go}
              />
            )
          ) : null}
          <footer className="page-footer">
            <span>
              Bank Sahabat Sampoerna · Unofficial corporate banking concept
            </span>
            <span>
              <ShieldCheck size={14} /> Sandbox environment
            </span>
          </footer>
        </div>
      </main>
      <nav className="mobile-navigation" aria-label="Main navigation">
        {navigation.slice(0, 3).map(([name, Icon]) => (
          <button
            key={name}
            aria-current={view === name ? 'page' : undefined}
            onClick={() => go(name)}
          >
            <Icon size={23} />
            <span>{name === 'Overview' ? 'Home' : name}</span>
          </button>
        ))}
        <button
          aria-current={view === 'Approvals' ? 'page' : undefined}
          onClick={() => go('Approvals')}
        >
          <CheckCheck size={23} />
          <span>
            Approvals{pending.length > 0 ? ` (${pending.length})` : ''}
          </span>
        </button>
        <button
          aria-label="All services"
          aria-haspopup="dialog"
          onClick={() => open('menus')}
        >
          <Menu size={23} />
          <span>More</span>
        </button>
      </nav>
      <Dialog
        open={!!modal}
        onOpenChange={(v) => {
          if (!v && !busy) setModal('');
        }}
      >
        <DialogContent className="bank-dialog">
          <DialogHeader>
            <DialogTitle>{titles[modal] || 'Banking workspace'}</DialogTitle>
            <DialogDescription>
              {modal === 'help'
                ? 'Product reference and support'
                : modal === 'notifications'
                  ? 'Pending actions in your sandbox'
                  : 'PT Nusantara Sejahtera · Sandbox only'}
            </DialogDescription>
          </DialogHeader>
          {[
            'payment',
            'bill',
            'batch',
            'virtual',
            'sweep',
            'service',
            'account',
          ].includes(modal) && (
            <Forms
              key={modal}
              kind={modal}
              data={data}
              role={role}
              act={act}
              done={() => {
                setModal('');
                go(
                  modal === 'account'
                    ? 'Accounts'
                    : modal === 'virtual'
                      ? 'Collections'
                      : modal === 'sweep'
                        ? 'Liquidity'
                        : modal === 'service'
                          ? 'Administration'
                          : 'Approvals',
                );
              }}
            />
          )}
          {modal === 'detail' && current && (
            <div className="bank-form">
              <div className="detail-line">
                <b>{current.beneficiary}</b>
                <Status status={current.status} />
              </div>
              <h2 className="payment-amount">
                {money(current.amount, current.currency)}
              </h2>
              {[
                ['Reference', current.reference],
                [
                  'Debit / credit account',
                  data.accounts.find((a) => a.id === current.account_id)?.name,
                ],
                ['Bank', current.bank],
                ['Beneficiary account / billing ID', current.number],
                ['Method', current.rail],
                ['Execution date', current.date],
                ['Created by', current.maker],
                ['Reviewed by', current.approver || 'Awaiting review'],
              ].map(([k, v]) => (
                <div className="detail-line" key={k}>
                  <span>{k}</span>
                  <b>{v}</b>
                </div>
              ))}
              {current.status === 'Pending' && (
                <>
                  <div className="info-box">
                    Approval completes this payment in the sandbox and debits
                    its fictional account. An Approver must review this
                    instruction. Future-dated instructions remain pending until
                    their execution date.
                  </div>
                  <label className="field">
                    <span>Reason (required only for rejection)</span>
                    <Input
                      value={reason}
                      maxLength={200}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Describe why this payment should be returned"
                    />
                  </label>
                  {modalError && (
                    <p className="error-box" role="alert">
                      {modalError}
                    </p>
                  )}
                  <div className="form-footer">
                    <Button
                      variant="outline"
                      disabled={busy || role !== 'Approver'}
                      onClick={async () => {
                        setBusy(true);
                        setModalError('');
                        try {
                          await act({
                            action: 'reject',
                            id: current.id,
                            reason,
                          });
                        } catch (e: any) {
                          setModalError(e.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Reject payment
                    </Button>
                    <Button
                      disabled={busy || role !== 'Approver'}
                      onClick={async () => {
                        setBusy(true);
                        setModalError('');
                        try {
                          await act({ action: 'approve', id: current.id });
                        } catch (e: any) {
                          setModalError(e.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {busy ? 'Processing…' : 'Approve simulated payment'}
                    </Button>
                  </div>
                </>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  downloadCSV('sandbox-payment-record.csv', [
                    ['SANDBOX ONLY — not proof of a real payment'],
                    [
                      'Beneficiary',
                      'Reference',
                      'Amount',
                      'Currency',
                      'Date',
                      'Status',
                    ],
                    [
                      current.beneficiary,
                      current.reference,
                      current.currency === 'USD'
                        ? current.amount / 100
                        : current.amount,
                      current.currency,
                      current.date,
                      current.status,
                    ],
                  ])
                }
              >
                <Download size={16} /> Download sandbox record
              </Button>
            </div>
          )}
          {modal === 'notifications' && (
            <div>
              {pending.length ? (
                pending.map((p) => (
                  <button
                    key={p.id}
                    className="approval-preview full-row"
                    onClick={() => detail(p)}
                  >
                    <FileText size={19} />
                    <div>
                      <b>{p.beneficiary}</b>
                      <small>
                        Awaiting approval · {money(p.amount, p.currency)}
                      </small>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                ))
              ) : (
                <div className="empty-state compact">
                  <ShieldCheck />
                  <h3>All caught up</h3>
                  <p>No payments need approval.</p>
                </div>
              )}
              <Button
                className="full"
                variant="outline"
                onClick={() => {
                  setModal('');
                  go('Reports');
                }}
              >
                View activity reports
              </Button>
            </div>
          )}
          {modal === 'menus' && (
            <div className="mobile-service-grid">
              {navigation.map(([name, Icon]) => (
                <button
                  key={name}
                  onClick={() => {
                    setModal('');
                    go(name);
                  }}
                >
                  <Icon size={24} />
                  <span>{name}</span>
                </button>
              ))}
              <button onClick={() => open('help')}>
                <CircleHelp size={24} />
                <span>Help</span>
              </button>
            </div>
          )}
          {modal === 'help' && (
            <div className="help-content">
              <h3>Try the complete payment journey</h3>
              <ol>
                <li>
                  A user assigned <b>Maker</b> can create a payment or upload a
                  payroll CSV.
                </li>
                <li>Review the details and submit for approval.</li>
                <li>
                  A different user assigned <b>Approver</b> reviews and approves
                  or rejects the instruction.
                </li>
                <li>Check the balance, transaction record and audit trail.</li>
              </ol>
              <p>
                This concept uses the supplied Standard Chartered RIPLAY as a
                workflow reference, adapted to Sampoerna branding. It does not
                imply bank endorsement or availability of proposed products.
              </p>
              <p>
                SWIFT, foreign currency accounts, government payments, escrow,
                pooling and cash-logistics requests are proposed reference
                workflows. Bank-issued fees, limits, product eligibility and
                integration contracts must be confirmed before live use.
              </p>
              <div className="help-links">
                <a
                  href="https://www.banksampoerna.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Official Bank Sampoerna website <ArrowUpRight size={15} />
                </a>
                <a
                  href="https://statics.banksampoerna.com/uploads/img/upload/files/Informasi-Internet-Banking-Korporasi-en.pdf"
                  target="_blank"
                  rel="noreferrer"
                >
                  Corporate banking product information{' '}
                  <ArrowUpRight size={15} />
                </a>
              </div>
              <p className="muted">
                Use fictional data only. Access is restricted to users enabled
                by your administrator. No bank credentials, real token codes or
                live account information are needed.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
