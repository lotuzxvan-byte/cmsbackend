'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  UserPlus,
  Users,
  Search,
  Copy,
  RefreshCw,
  Pencil,
  ShieldCheck,
} from 'lucide-react';

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
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';

import { Choice } from './workspace';

type User = {
  id: string;

  email: string;

  name: string;

  role: string;

  status: string;

  revision: number;

  activated: boolean;

  created: string;
};

const blank = {
  password: '',
  name: '',
  email: '',
  role: 'Maker',
  status: 'Active',
};

export default function AdminUsers({ role }: { role: string }) {
  const [users, setUsers] = useState<User[]>([]);

  const [current, setCurrent] = useState('');

  const [loading, setLoading] = useState(true);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState('');

  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');

  const [open, setOpen] = useState(false);

  const [edit, setEdit] = useState<User | null>(null);

  const [form, setForm] = useState(blank);

  const [reset, setReset] = useState<User | null>(null);

  const [temporary, setTemporary] = useState('');

  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    setError('');

    try {
      const r = await fetch('/api/users');

      const d: any = await r.json();

      if (!r.ok) throw Error(d.error);

      setUsers(d.users);

      setCurrent(d.currentUser.id);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'Administrator') void load();
    else setLoading(false);
  }, [role, load]);

  if (role !== 'Administrator')
    return (
      <section className="panel">
        <h3>User administration</h3>
        <p className="muted">
          Your role is {role}. Only administrators can view or change user
          access.
        </p>
      </section>
    );

  return (
    <section className="panel user-admin">
      <div className="panel-heading">
        <div>
          <h3>
            <Users size={19} /> User administration
          </h3>
          <p>Create user access and manage your corporate team.</p>
        </div>
        <Button
          onClick={() => {
            setEdit(null);

            setForm(blank);

            setFormError('');

            setOpen(true);
          }}
        >
          <UserPlus size={16} /> Create user
        </Button>
      </div>
      <div className="user-metrics">
        <div>
          <b>{users.length}</b>
          <span>Total users</span>
        </div>
        <div>
          <b>{users.filter((u) => u.status === 'Active').length}</b>
          <span>Active users</span>
        </div>
        <div>
          <b>
            {users.filter((u) => !u.activated && u.status === 'Active').length}
          </b>
          <span>Awaiting first sign-in</span>
        </div>
      </div>
      {error && (
        <div role="alert" className="error-box">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="notice-box">
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}
      <div className="filter-row">
        <div className="search-input">
          <Search size={17} />
          <Input
            aria-label="Search users"

            value={search}

            onChange={(e) => setSearch(e.target.value)}

            placeholder="Search name, email or role"
          />
        </div>
        <Button
          variant="outline"

          onClick={async () => {
            try {
              await navigator.clipboard.writeText(location.origin + '/login');

              setNotice(
                'Login link copied. Share it with the user you created.',
              );
            } catch {
              setNotice('Login link: ' + location.origin + '/login');
            }
          }}
        >
          <Copy size={16} /> Copy login link
        </Button>
        <Button
          variant="outline"

          onClick={() => void load()}

          aria-label="Refresh users"
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      {loading ? (
        <p role="status" className="muted">
          Loading users…
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {['User', 'Role', 'Access', 'Activation', ''].map((s, i) => (
                <TableHead key={i}>{s}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users

              .filter((u) =>
                `${u.name} ${u.email} ${u.role}`

                  .toLowerCase()

                  .includes(search.toLowerCase()),
              )

              .map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <b>
                      {u.name}
                      {u.id === current ? ' (you)' : ''}
                    </b>
                    <small className="cell-sub">{u.email}</small>
                  </TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    <span
                      className={
                        'status ' +
                        (u.status === 'Active' ? 'success' : 'rejected')
                      }
                    >
                      {u.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {u.activated ? 'Signed in before' : 'Awaiting sign-in'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"

                      size="sm"

                      onClick={() => {
                        setEdit(u);

                        setForm({
                          password: '',

                          name: u.name,

                          email: u.email,

                          role: u.role,

                          status: u.status,
                        });

                        setFormError('');

                        setOpen(true);
                      }}
                    >
                      <Pencil size={14} /> Manage
                    </Button>
                    {u.id !== current && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTemporary('');
                          setFormError('');
                          setReset(u);
                        }}
                      >
                        Reset password
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
      <div className="info-box">
        <ShieldCheck size={17} /> Users sign in with their email and
        administrator-provided password. Suspension blocks subsequent requests.
        Administrators cannot remove their own access. No invitation emails are
        sent automatically.
      </div>
      <Dialog
        open={open}

        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
      >
        <DialogContent className="bank-dialog">
          <DialogHeader>
            <DialogTitle>{edit ? 'Manage user' : 'Create user'}</DialogTitle>
            <DialogDescription>
              {edit
                ? 'Changes apply to the user’s next request.'
                : 'Register an email and assign the permissions this person needs.'}
            </DialogDescription>
          </DialogHeader>
          <form
            className="bank-form"

            onSubmit={async (e) => {
              e.preventDefault();

              setBusy(true);

              setFormError('');

              try {
                const r = await fetch('/api/users', {
                  method: 'POST',

                  headers: { 'Content-Type': 'application/json' },

                  body: JSON.stringify(
                    edit
                      ? {
                          action: 'update',

                          id: edit.id,

                          revision: edit.revision,

                          ...form,
                        }
                      : { action: 'create', ...form },
                  ),
                });

                const d: any = await r.json();

                if (!r.ok) throw Error(d.error);

                setNotice(d.message);

                setOpen(false);

                await load();
              } catch (e: any) {
                setFormError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              <span>Full name</span>
              <Input
                required

                maxLength={100}

                value={form.name}

                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Email address</span>
              <Input
                type="email"

                required

                disabled={!!edit}

                maxLength={254}

                value={form.email}

                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            {!edit && (
              <label className="field">
                <span>Temporary password (12–128 characters)</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </label>
            )}
            {edit && edit.id === current ? (
              <div className="info-box">
                You can update your display name. Your own Administrator role
                and Active status are protected.
              </div>
            ) : (
              <>
                <Choice
                  label="Role"

                  value={form.role}

                  onChange={(v) => setForm({ ...form, role: v })}

                  options={['Maker', 'Approver', 'Administrator']}
                />
                {edit && (
                  <Choice
                    label="Access status"

                    value={form.status}

                    onChange={(v) => setForm({ ...form, status: v })}

                    options={['Active', 'Suspended']}
                  />
                )}
              </>
            )}
            <div className="role-description">
              {form.role === 'Maker'
                ? 'Maker: enters payments, payroll, collections and service requests.'
                : form.role === 'Approver'
                  ? 'Approver: reviews instructions from another user and approves or rejects.'
                  : 'Administrator: manages user access, demo accounts, liquidity and service requests. Administrators cannot approve payments.'}
            </div>
            {formError && (
              <div className="error-box" role="alert">
                {formError}
              </div>
            )}
            <div className="form-footer">
              <Button
                type="button"

                variant="outline"

                disabled={busy}

                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy
                  ? 'Saving…'
                  : edit
                    ? 'Save changes'
                    : 'Create user access'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!reset}
        onOpenChange={(v) => {
          if (!v && !busy) {
            setReset(null);
            setTemporary('');
          }
        }}
      >
        <DialogContent className="bank-dialog">
          <DialogHeader>
            <DialogTitle>Reset user password</DialogTitle>
            <DialogDescription>
              Set a temporary password for {reset?.email}. They must change it
              at next sign-in.
            </DialogDescription>
          </DialogHeader>
          <form
            className="bank-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setFormError('');
              try {
                const r = await fetch('/api/users', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'reset-password',
                    id: reset?.id,
                    password: temporary,
                  }),
                });
                const d: any = await r.json();
                if (!r.ok) throw Error(d.error);
                setNotice(d.message);
                setReset(null);
                setTemporary('');
              } catch (e) {
                setFormError(
                  e instanceof Error ? e.message : 'Unable to reset password.',
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              <span>Temporary password</span>
              <Input
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={temporary}
                onChange={(e) => setTemporary(e.target.value)}
              />
            </label>
            {formError && (
              <p className="error-box" role="alert">
                {formError}
              </p>
            )}
            <Button disabled={busy}>Set temporary password</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
