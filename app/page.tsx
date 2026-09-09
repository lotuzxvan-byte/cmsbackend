import { getPasswordSession } from '@/lib/password-auth';
import { publicMember } from '@/lib/access';
import BankingApp from './banking-app';
import PasswordLogin from '@/components/banking/password-login';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const session = await getPasswordSession();
  if (!session) return <PasswordLogin />;
  if (session.mustChange) return <PasswordLogin change />;
  return <BankingApp member={publicMember(session.member)} />;
}
