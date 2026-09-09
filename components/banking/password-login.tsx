'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export default function PasswordLogin({
  change = false,
}: {
  change?: boolean;
}) {
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [current, setCurrent] = useState(''),
    [confirm, setConfirm] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <main className="login-page">
      <section className="login-story">
        <a href="/" className="login-brand">
          <img
            src="/sampoerna-logo.png"
            alt="Bank Sahabat Sampoerna"
            width={215}
            height={64}
          />
        </a>
        <div>
          <p className="eyebrow">CORPORATE BANKING</p>
          <h1>
            Your business.
            <br />
            One connected workspace.
          </h1>
          <p>Accounts, payments and team access.</p>
        </div>
        <small>Unofficial sandbox · No real money moves.</small>
      </section>
      <section className="login-main">
        <div className="login-card">
          <p className="eyebrow">SAMPOERNA CORPORATE</p>
          <h2>
            {change ? 'Set your own password' : 'Sign in to your workspace'}
          </h2>
          <p>
            {change
              ? 'Enter your current or temporary password, then choose a new password.'
              : 'Use the email and password provided by your administrator.'}
          </p>
          <form
            className="bank-form"
            style={{ marginTop: 24 }}
            onSubmit={async (e) => {
              e.preventDefault();
              setError('');
              if (change && password !== confirm) {
                setError('Passwords do not match.');
                return;
              }
              setBusy(true);
              try {
                const r = await fetch(
                  change ? '/api/auth/password' : '/api/auth/login',
                  {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(
                      change
                        ? { currentPassword: current, password }
                        : { email, password },
                    ),
                  },
                );
                const d: any = await r.json();
                if (!r.ok) throw Error(d.error);
                location.replace('/');
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Unable to sign in.');
              } finally {
                setBusy(false);
              }
            }}
          >
            {!change ? (
              <label className="field">
                <span>Email address</span>
                <Input
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            ) : (
              <label className="field">
                <span>Current or temporary password</span>
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              <span>{change ? 'New password' : 'Password'}</span>
              <Input
                type="password"
                autoComplete={change ? 'new-password' : 'current-password'}
                required
                minLength={change ? 12 : 1}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {change && (
              <label className="field">
                <span>Confirm new password</span>
                <Input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
            )}
            {error && (
              <p className="error-box" role="alert">
                {error}
              </p>
            )}
            <Button style={{ minHeight: 52 }} disabled={busy}>
              {busy ? 'Please wait…' : change ? 'Save password' : 'Sign in'}
            </Button>
          </form>
          <div className="login-help" style={{ marginTop: 24 }}>
            <b>{change ? 'At least 12 characters' : 'Forgot your password?'}</b>
            <p>
              {change
                ? 'Use a unique password that you do not use for your real bank.'
                : 'Ask your corporate administrator to reset it. There is no public registration.'}
            </p>
          </div>
          {change && (
            <button
              className="text-button"
              onClick={async () => {
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: '{}',
                });
                location.replace('/');
              }}
            >
              Sign out
            </button>
          )}
          <p className="login-disclaimer">
            Unofficial banking sandbox. Use fictional banking data.
          </p>
        </div>
      </section>
    </main>
  );
}
