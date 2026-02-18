import { LoginForm } from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: { error?: string };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <div className="space-y-6">
      <LoginForm authError={searchParams.error} />
    </div>
  );
}
