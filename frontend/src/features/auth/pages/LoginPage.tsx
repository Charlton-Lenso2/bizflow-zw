import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import {
  AuthCard,
  type AuthField,
  type AuthStatus,
} from "../components/AuthCard";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeField, setActiveField] = useState<AuthField>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("idle");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    setStatus("submitting");

    try {
      const result = await signIn({
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message);
        setStatus("error");
        return;
      }

      setStatus("success");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.",
      );
      setStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      title="Welcome back."
      subtitle="Sign in to access your business workspace and keep your operations moving."
      activeField={activeField}
      passwordVisible={passwordVisible}
      status={status}
      mode="login"
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        {error && (
          <Alert variant="error" title="Unable to sign in">
            {error}
          </Alert>
        )}

        <Input
          id="login-email"
          label="Email address"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onFocus={() => setActiveField("email")}
          onBlur={() => setActiveField(null)}
          autoComplete="email"
          placeholder="you@business.com"
          required
        />

        <div className="space-y-2">
          <label
            htmlFor="login-password"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--app-foreground-subtle)]"
          >
            Password
          </label>

          <div className="relative">
            <Input
              id="login-password"
              type={passwordVisible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={() => setActiveField("password")}
              onBlur={() => setActiveField(null)}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="pr-12"
              required
            />

            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              className="absolute inset-y-0 right-3 flex items-center justify-center text-[var(--app-foreground-muted)] transition hover:text-[var(--brand-primary)]"
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              aria-pressed={passwordVisible}
            >
              {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full !rounded-xl !py-3"
          isLoading={isSubmitting}
        >
          Sign in to BizFlow
        </Button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-[var(--app-border)]" />
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--app-foreground-subtle)]">
            Secure business access
          </span>
          <div className="h-px flex-1 bg-[var(--app-border)]" />
        </div>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--app-foreground-muted)]">
        New to BizFlow?{" "}
        <Link
          to="/signup"
          className="font-semibold text-[var(--brand-primary)] transition hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6 0 9.5 7 9.5 7a16.8 16.8 0 0 1-3.1 4.1" />
      <path d="M6.6 6.6A16.8 16.8 0 0 0 2.5 12s3.5 7 9.5 7a10.8 10.8 0 0 0 3.3-.5" />
    </svg>
  );
}
