'use client';
import { useState } from 'react';
import { Upload, Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Choice, PaymentTable } from './workspace';
import {
  money,
  rails,
  parseCSV,
  validatePayment,
  downloadCSV,
  type BankData,
} from '@/lib/banking';
const day = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
export function Forms({
  kind,
  data,
  act,
  done,
  role,
}: {
  kind: string;
  data: BankData;
  act: (b: any) => Promise<any>;
  done: () => void;
  role: string;
}) {
  const defaultAccount =
    data.accounts.find((a) => a.name === 'Operating account')?.id ||
    data.accounts[0]?.id ||
    '';
  const [p, setP] = useState<any>({
    account_id: defaultAccount,
    beneficiary: '',
    bank: 'Bank Sampoerna',
    number: '',
    amount: '',
    rail: kind === 'bill' ? 'Bill payment' : 'BI-FAST',
    reference: '',
    date: day(),
  });
  const [r, setR] = useState<any>({
    name: '',
    number: '',
    currency: 'IDR',
    type: 'Current',
    balance: '0',
    account_id: defaultAccount,
    source: defaultAccount,
    target: data.accounts.find((a) => a.name === 'Business reserve')?.id || '',
    amount: '',
    reference: '',
    threshold: '100000000',
    service: 'Escrow',
    notes: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [filename, setFilename] = useState('');
  const field = (key: string, label: string, opts: any = {}) => (
    <label className="field">
      <span>{label}</span>
      <Input
        {...opts}
        required
        value={p[key]}
        onChange={(e) => {
          setP({ ...p, [key]: e.target.value });
          setReview(false);
        }}
      />
    </label>
  );
  const rfield = (key: string, label: string, opts: any = {}) => (
    <label className="field">
      <span>{label}</span>
      <Input
        {...opts}
        required
        value={r[key]}
        onChange={(e) => setR({ ...r, [key]: e.target.value })}
      />
    </label>
  );
  const submit = async (body: any) => {
    setBusy(true);
    setError('');
    try {
      await act(body);
      done();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const a = data.accounts.find((a) => a.id === p.account_id);
  const accountOptions = data.accounts.map((a) => ({
    value: a.id,
    label: a.name + ' · ' + a.currency,
  }));
  if (kind === 'account')
    return (
      <form
        className="bank-form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit({ action: 'account', account: r });
        }}
      >
        {rfield('name', 'Account name', { maxLength: 100 })}
        {rfield('number', 'Demo account identifier', {
          placeholder: 'DEMO-OPERATIONS-01',
          maxLength: 29,
        })}
        <Choice
          label="Currency"
          value={r.currency}
          onChange={(v) => setR({ ...r, currency: v })}
          options={['IDR', 'USD']}
        />
        <Choice
          label="Account type"
          value={r.type}
          onChange={(v) => setR({ ...r, type: v })}
          options={['Current', 'Savings']}
        />
        {rfield('balance', 'Fictional opening balance', {
          inputMode: 'decimal',
        })}
        <div className="info-box">
          This creates a saved demo ledger account. It does not open an account
          at the bank.
        </div>
        {error && (
          <div className="error-box" role="alert">
            {error}
          </div>
        )}
        <div className="form-footer">
          <Button disabled={busy || role !== 'Administrator'} type="submit">
            {busy ? 'Saving…' : 'Create demo account'}
          </Button>
        </div>
      </form>
    );
  if (['payment', 'bill'].includes(kind))
    return (
      <form
        className="bank-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError('');
          try {
            validatePayment(p, data.accounts);
            if (!review) setReview(true);
            else void submit({ action: 'payment', payment: p });
          } catch (e: any) {
            setError(e.message);
          }
        }}
      >
        {role !== 'Maker' && (
          <div className="info-box">
            A user with the Maker role must submit new payments.
          </div>
        )}
        {review ? (
          <>
            <div className="review-banner">
              <ShieldCheck />
              Review your payment
            </div>
            {[
              ['From', a?.name],
              ['Beneficiary', p.beneficiary],
              ['Bank', p.bank],
              ['Account / billing ID', p.number],
              ['Method', p.rail],
              ['Execution date', p.date],
              ['Reference', p.reference],
              [
                'Amount',
                money(validatePayment(p, data.accounts).amount, a?.currency),
              ],
            ].map(([k, v]) => (
              <div className="detail-line" key={k}>
                <span>{k}</span>
                <b>{v}</b>
              </div>
            ))}
            <div className="info-box">
              Fees are not charged in this sandbox. Live fees, limits and
              cut-off times require bank confirmation. Submission sends this
              instruction to the demo approval queue.
            </div>
          </>
        ) : (
          <>
            <Choice
              label="Debit account"
              value={p.account_id}
              onChange={(v) => {
                const currency = data.accounts.find(
                  (a) => a.id === v,
                )?.currency;
                setP({
                  ...p,
                  account_id: v,
                  rail: currency === 'USD' ? 'SWIFT (proposed)' : 'BI-FAST',
                });
              }}
              options={accountOptions}
            />
            <p className="available">
              Available: {money(a?.balance || 0, a?.currency)}
            </p>
            <div className="form-grid">
              {field('beneficiary', 'Beneficiary / biller name', {
                maxLength: 120,
              })}
              {field('bank', 'Destination bank / biller', { maxLength: 120 })}
              {field('number', 'Account number / billing ID', {
                maxLength: 34,
              })}
              {field('amount', `Amount (${a?.currency || 'IDR'})`, {
                inputMode: 'decimal',
                placeholder: 'e.g. 12500000',
              })}
              <Choice
                label="Payment method"
                value={p.rail}
                onChange={(v) => setP({ ...p, rail: v })}
                options={rails}
              />
              {field('date', 'Execution date', { type: 'date', min: day() })}
            </div>
            {field('reference', 'Payment reference', { maxLength: 120 })}
            <p className="muted">
              BI-FAST: up to IDR 250M · SKN: up to IDR 1B · RTGS: from IDR 100M.
              These sandbox rules are based on the reference; bank confirmation
              is required. Future-dated instructions can be reviewed on their
              execution date.
            </p>
          </>
        )}
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          {review && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setReview(false)}
            >
              Edit payment
            </Button>
          )}
          <Button disabled={busy || role !== 'Maker'} type="submit">
            {busy
              ? 'Submitting…'
              : review
                ? 'Submit for approval'
                : 'Review payment'}
          </Button>
        </div>
      </form>
    );
  if (kind === 'batch')
    return (
      <div className="bank-form">
        <p className="muted">
          Upload a CSV with up to 100 recipients. Amounts must not contain
          thousands separators. Each payment will be independently reviewed.
        </p>
        <Button
          variant="outline"
          onClick={() =>
            downloadCSV('payroll-template.csv', [
              ['name', 'bank', 'number', 'amount', 'reference'],
              [
                'Sample Employee',
                'Bank Sampoerna',
                '9001023991',
                '8500000',
                'September salary',
              ],
            ])
          }
        >
          <Download size={16} /> Download template
        </Button>
        <div className="form-grid">
          <Choice
            label="Debit account"
            value={p.account_id}
            onChange={(v) => {
              setP({ ...p, account_id: v });
              setReview(false);
            }}
            options={accountOptions.filter(
              (o) =>
                data.accounts.find((a) => a.id === o.value)?.currency === 'IDR',
            )}
          />
          <Choice
            label="Transfer method"
            value={p.rail}
            onChange={(v) => {
              setP({ ...p, rail: v });
              setReview(false);
            }}
            options={['Internal', 'BI-FAST', 'SKN', 'RTGS', 'Online']}
          />
          {field('date', 'Execution date', { type: 'date', min: day() })}
        </div>
        <label className="upload-box">
          <Upload size={28} />
          <b>{filename || 'Choose a payroll CSV'}</b>
          <span>CSV · maximum 100 KB · fictional recipient data only</span>
          <Input
            type="file"
            accept=".csv,text/csv"
            aria-label="Upload payroll CSV"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setReview(false);
              setRows([]);
              setError('');
              if (!file) return;
              try {
                if (file.size > 100000)
                  throw Error('File must be at most 100 KB.');
                setRows(parseCSV(await file.text()));
                setFilename(file.name);
              } catch (e: any) {
                setError(e.message);
              }
            }}
          />
        </label>
        {rows.length > 0 && (
          <>
            <div className="detail-line">
              <b>{rows.length} recipients</b>
              <span>
                Total IDR{' '}
                {new Intl.NumberFormat('en-US').format(
                  rows.reduce((s, r) => s + Number(r.amount), 0),
                )}
              </span>
            </div>
            <div className="batch-preview">
              {rows.map((r, i) => (
                <div className="detail-line" key={i}>
                  <span>
                    {i + 1}. {r.beneficiary}
                    <small className="cell-sub">
                      {r.bank} · {r.number}
                    </small>
                  </span>
                  <b>{r.amount}</b>
                </div>
              ))}
            </div>
          </>
        )}
        {review && (
          <div className="info-box">
            All {rows.length} rows passed validation. Confirm to send the entire
            batch to the approval queue.
          </div>
        )}
        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}
        <div className="form-footer">
          <Button
            disabled={!rows.length || busy || role !== 'Maker'}
            onClick={() => {
              try {
                setError('');
                const items = rows.map((r) => ({
                  ...r,
                  account_id: p.account_id,
                  rail: p.rail,
                  date: p.date,
                }));
                const validated = items.map((p) =>
                  validatePayment(p, data.accounts),
                );
                if (
                  validated.reduce((s, p) => s + p.amount, 0) >
                  (a?.balance || 0)
                )
                  throw Error('Batch exceeds available balance.');
                if (!review) setReview(true);
                else void submit({ action: 'batch', payments: items });
              } catch (e: any) {
                setError(e.message);
              }
            }}
          >
            {busy
              ? 'Submitting…'
              : review
                ? 'Submit batch for approval'
                : 'Validate batch'}
          </Button>
        </div>
        {role !== 'Maker' && (
          <p className="muted">A user assigned Maker can submit this batch.</p>
        )}
      </div>
    );
  return (
    <form
      className="bank-form"
      onSubmit={(e) => {
        e.preventDefault();
        void submit({ action: 'record', kind, data: r });
      }}
    >
      {rfield(
        'name',
        kind === 'virtual'
          ? 'Customer name'
          : kind === 'sweep'
            ? 'Rule name'
            : 'Company / project name',
        { maxLength: 120 },
      )}
      {kind === 'virtual' ? (
        <>
          <Choice
            label="Collection account"
            value={r.account_id}
            onChange={(v) => setR({ ...r, account_id: v })}
            options={accountOptions.filter(
              (o) =>
                data.accounts.find((a) => a.id === o.value)?.currency === 'IDR',
            )}
          />
          {rfield('amount', 'Expected amount (IDR)', { inputMode: 'numeric' })}
          {rfield('reference', 'Invoice reference', { maxLength: 120 })}
          <p className="muted">
            A non-routable DEMO-VA identifier will be generated. You can
            simulate a receipt in Collections.
          </p>
        </>
      ) : kind === 'sweep' ? (
        <>
          <Choice
            label="Sweep from"
            value={r.source}
            onChange={(v) => setR({ ...r, source: v })}
            options={accountOptions}
          />
          <Choice
            label="Sweep to"
            value={r.target}
            onChange={(v) => setR({ ...r, target: v })}
            options={accountOptions}
          />
          {rfield(
            'threshold',
            'Retain in source account (whole IDR / USD cents)',
            { inputMode: 'numeric' },
          )}
          <div className="info-box">
            Daily at 17:00 WIB. Both accounts must share a currency. This saves
            a configuration; no automated transfers run in the sandbox.
          </div>
        </>
      ) : (
        <>
          <Choice
            label="Service"
            value={r.service}
            onChange={(v) => setR({ ...r, service: v })}
            options={[
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
            ]}
          />
          <label className="field">
            <span>Requirements / notes</span>
            <textarea
              value={r.notes}
              maxLength={2000}
              rows={4}
              onChange={(e) => setR({ ...r, notes: e.target.value })}
            />
          </label>
          <div className="info-box">
            This request is saved as a draft for you to download. It is not sent
            to the bank. Service availability and onboarding must be confirmed
            with your relationship manager.
          </div>
        </>
      )}
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      <div className="form-footer">
        <Button disabled={busy || role === 'Approver'} type="submit">
          {busy
            ? 'Saving…'
            : kind === 'virtual'
              ? 'Create virtual account'
              : kind === 'sweep'
                ? 'Save sweep rule'
                : 'Save draft request'}
        </Button>
      </div>
      {role === 'Approver' && (
        <p className="muted">
          Maker or Administrator access is required to create records.
        </p>
      )}
    </form>
  );
}
