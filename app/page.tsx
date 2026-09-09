import {
  getChatGPTUser,
  chatGPTSignInPath,
  chatGPTSignOutPath,
} from './chatgpt-auth';
import { resolveMember, publicMember } from '@/lib/access';
import BankingApp from './banking-app';
import {
  ShieldCheck,
  ArrowRight,
  LockKeyhole,
  Users,
  Database,
} from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const user = await getChatGPTUser();
  let member = null;
  let unavailable = false;
  if (user) {
    try {
      member = await resolveMember(user);
    } catch (e) {
      console.error(e);
      unavailable = true;
    }
  }
  if (member) return <BankingApp member={publicMember(member)} />;
  return (
    <main className="login-page">
      <section className="login-story">
        <a href="/" className="login-brand">
          <img
            src="/sampoerna-logo.png"
            alt="Bank Sahabat Sampoerna"
            width={234}
            height={70}
          />
        </a>
        <div>
          <p className="eyebrow">CORPORATE INTERNET BANKING</p>
          <h1>
            Your business.
            <br />
            One connected workspace.
          </h1>
          <p>Manage your accounts, payments and team access in one place.</p>
          <div className="login-benefits">
            <span>
              <Database />
              Saved business records
            </span>
            <span>
              <Users />
              Controlled user access
            </span>
            <span>
              <ShieldCheck />
              Independent payment approval
            </span>
          </div>
        </div>
        <small>Unofficial banking sandbox · No real money moves.</small>
      </section>
      <section className="login-main">
        <div className="login-card">
          <span className="login-lock">
            <LockKeyhole size={28} />
          </span>
          <p className="eyebrow">WELCOME TO SAMPOERNA CORPORATE</p>
          <h2>
            {unavailable
              ? 'Workspace temporarily unavailable'
              : user
                ? 'Access not enabled'
                : 'Sign in to your workspace'}
          </h2>
          <p>
            {unavailable
              ? 'We could not load your account. Please try again.'
              : user
                ? 'Your signed-in account has not been enabled, or has been suspended. Contact your corporate administrator.'
                : 'Sign in with the ChatGPT account that your administrator registered for you.'}
          </p>
          {user && <div className="signed-email">{user.email}</div>}
          {unavailable ? (
            <a className="login-cta" href="/">
              Try again <ArrowRight size={18} />
            </a>
          ) : user ? (
            <a
              className="login-cta"
              href={chatGPTSignOutPath('/')}
              target="_top"
            >
              Sign out and use another account <ArrowRight size={18} />
            </a>
          ) : (
            <a
              className="login-cta"
              href={chatGPTSignInPath('/')}
              target="_top"
            >
              Sign in with ChatGPT <ArrowRight size={18} />
            </a>
          )}
          <div className="login-help">
            <b>Need access?</b>
            <p>
              Your administrator can create your user and assign a role under
              Administration → Users. There is no public self-registration.
            </p>
          </div>
          <p className="login-disclaimer">
            Use fictional banking data. Never enter your bank password, PIN or
            token here.
          </p>
        </div>
        <footer>Bank Sahabat Sampoerna · Corporate banking concept</footer>
      </section>
    </main>
  );
}
