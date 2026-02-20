import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next;
  return (
    <div className="space-y-6">
      <LoginForm redirectTo={next} />
    </div>
  );
}
