import { getPasswordSession } from "@/lib/password-auth";
import PasswordLogin from "@/components/banking/password-login";
export const dynamic = "force-dynamic";
export default async function PasswordPage() {
  return <PasswordLogin change={!!(await getPasswordSession())} />;
}
