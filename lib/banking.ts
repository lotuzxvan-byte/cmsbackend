export type Account = {
  id: string;
  name: string;
  number: string;
  currency: string;
  type: string;
  balance: number;
};
export type Payment = {
  id: string;
  account_id: string;
  beneficiary: string;
  bank: string;
  number: string;
  amount: number;
  currency: string;
  rail: string;
  reference: string;
  date: string;
  status: string;
  maker: string;
  approver?: string;
  direction: string;
  batch?: string;
  created: string;
};
export type RecordItem = {
  id: string;
  kind: string;
  data: any;
  created: string;
};
export type BankData = {
  accounts: Account[];
  payments: Payment[];
  records: RecordItem[];
  audit: {
    id: string;
    actor: string;
    action: string;
    detail: string;
    created: string;
  }[];
};
export const emptyData: BankData = {
  accounts: [],
  payments: [],
  records: [],
  audit: [],
};
export const rails = [
  'Internal',
  'BI-FAST',
  'SKN',
  'RTGS',
  'Online',
  'SWIFT (proposed)',
  'Bill payment',
  'Tax payment (proposed)',
];
export function money(n: number, currency = 'IDR') {
  return (
    currency +
    ' ' +
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(currency === 'USD' ? n / 100 : n)
  );
}
export function amountMinor(value: unknown, currency: string) {
  const s = String(value);
  if (!/^\d+(\.\d{1,2})?$/.test(s))
    throw Error('Enter a positive amount without commas.');
  if (currency === 'IDR' && s.includes('.'))
    throw Error('Use whole rupiah amounts.');
  const n = Math.round(Number(s) * (currency === 'USD' ? 100 : 1));
  if (!Number.isSafeInteger(n) || n <= 0 || n > 1e14)
    throw Error('Amount is outside the supported range.');
  return n;
}
export function validatePayment(p: any, accounts: Account[]) {
  const a = accounts.find((a) => a.id === p.account_id);
  if (!a) throw Error('Choose a valid debit account.');
  const amount = amountMinor(p.amount, a.currency);
  if (amount > a.balance) throw Error('Insufficient available balance.');
  if (!rails.includes(p.rail))
    throw Error('Choose a supported payment method.');
  if ((a.currency === 'USD') !== (p.rail === 'SWIFT (proposed)'))
    throw Error(
      'USD accounts require the proposed SWIFT workflow; domestic payments require IDR.',
    );
  if (p.rail === 'BI-FAST' && amount > 250000000)
    throw Error('Sandbox BI-FAST limit is IDR 250,000,000.');
  if (p.rail === 'SKN' && amount > 1000000000)
    throw Error('Sandbox SKN limit is IDR 1,000,000,000.');
  if (p.rail === 'RTGS' && amount < 100000000)
    throw Error('Sandbox RTGS minimum is IDR 100,000,000.');
  for (const key of ['beneficiary', 'bank', 'number', 'reference'])
    if (typeof p[key] !== 'string' || !p[key].trim() || p[key].length > 120)
      throw Error('Complete all payment fields (maximum 120 characters).');
  if (!/^[A-Za-z0-9 -]{5,34}$/.test(p.number))
    throw Error(
      'Enter a valid account or billing identifier (5–34 characters).',
    );
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Asia/Jakarta',
  });
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(p.date) ||
    !Number.isFinite(Date.parse(p.date)) ||
    p.date < today
  )
    throw Error('Execution date must be today or later.');
  return { ...p, amount, currency: a.currency };
}
export function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if (c === '\n' && !quoted) {
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') cell += c;
  }
  if (quoted) throw Error('CSV contains an unclosed quote.');
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (
    rows.shift()?.join(',').toLowerCase() !==
    'name,bank,number,amount,reference'
  )
    throw Error('CSV header must be name,bank,number,amount,reference.');
  if (!rows.length || rows.length > 100)
    throw Error('Upload between 1 and 100 payment rows.');
  return rows.map((r, i) => {
    if (r.length !== 5)
      throw Error('Row ' + (i + 2) + ' must have five columns.');
    return {
      beneficiary: r[0],
      bank: r[1],
      number: r[2],
      amount: r[3],
      reference: r[4],
    };
  });
}
export function downloadCSV(name: string, rows: unknown[][]) {
  const cell = (v: unknown) =>
    '"' +
    String(v ?? '')
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  if (navigator.userAgent.includes('SampoernaAndroid/')) {
    const csv = '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
    location.href =
      'sampoerna-download://csv?name=' +
      encodeURIComponent(name) +
      '&text=' +
      encodeURIComponent(csv);
    return;
  }
  const blob = new Blob(
    ['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')],
    { type: 'text/csv;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
