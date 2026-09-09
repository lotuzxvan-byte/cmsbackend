import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    name: text('name').notNull(),
    number: text('number').notNull(),
    currency: text('currency').notNull(),
    type: text('type').notNull(),
    balance: integer('balance').notNull(),
  },
  (t) => [index('accounts_tenant').on(t.tenant)],
);
export const payments = sqliteTable(
  'payments',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    account_id: text('account_id').notNull(),
    beneficiary: text('beneficiary').notNull(),
    bank: text('bank').notNull(),
    number: text('number').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    rail: text('rail').notNull(),
    reference: text('reference').notNull(),
    date: text('date').notNull(),
    status: text('status').notNull(),
    maker: text('maker').notNull(),
    approver: text('approver'),
    op: text('op'),
    direction: text('direction').notNull(),
    batch: text('batch'),
    created: text('created').notNull(),
  },
  (t) => [index('payments_tenant_date').on(t.tenant, t.date)],
);
export const records = sqliteTable(
  'records',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    kind: text('kind').notNull(),
    data: text('data').notNull(),
    created: text('created').notNull(),
  },
  (t) => [index('records_tenant_kind').on(t.tenant, t.kind)],
);
export const audit = sqliteTable(
  'audit',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    detail: text('detail').notNull(),
    created: text('created').notNull(),
  },
  (t) => [index('audit_tenant').on(t.tenant)],
);

export const members = sqliteTable(
  'members',
  {
    id: text('id').primaryKey(),
    tenant: text('tenant').notNull(),
    user_id: text('user_id'),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: text('role').notNull(),
    status: text('status').notNull(),
    revision: integer('revision').notNull().default(1),
    created: text('created').notNull(),
    updated: text('updated').notNull(),
    last_login: text('last_login'),
  },
  (t) => [
    index('members_tenant').on(t.tenant),
    uniqueIndex('members_email').on(t.email),
    uniqueIndex('members_identity').on(t.user_id),
  ],
);

export const authCredentials = sqliteTable('auth_credentials', {
  member_id: text('member_id').primaryKey(),
  password_hash: text('password_hash').notNull(),
  must_change: integer('must_change').notNull(),
  revision: integer('revision').notNull(),
});
export const authSessions = sqliteTable(
  'auth_sessions',
  {
    token_hash: text('token_hash').primaryKey(),
    member_id: text('member_id').notNull(),
    revision: integer('revision').notNull(),
    expires: integer('expires').notNull(),
  },
  (t) => [
    index('sessions_member').on(t.member_id),
    index('sessions_expiry').on(t.expires),
  ],
);
export const authLimits = sqliteTable(
  'auth_limits',
  {
    key: text('key').primaryKey(),
    count: integer('count').notNull(),
    expires: integer('expires').notNull(),
  },
  (t) => [index('limits_expiry').on(t.expires)],
);
