import LoginForm from "@/components/auth/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next)
    ? params.next[0]
    : params.next;

  const nextPath =
    rawNext &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//")
      ? rawNext
      : "/dashboard";

  return <LoginForm nextPath={nextPath} />;
}
