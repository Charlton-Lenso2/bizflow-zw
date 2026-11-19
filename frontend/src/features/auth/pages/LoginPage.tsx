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
      const result = await signIn({ email: email.trim(), password });

      if (result.error) {
        setError(result.error.message);
        setStatus("idle");
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
      setStatus("idle");
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
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-xs font-semibold uppercase tracking-wider text-[var(--app-foreground-subtle)]"
            >
              Password
            </label>
          </div>

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
              className="pr-16"
              required
            />

            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              className="absolute inset-y-0 right-3 my-auto h-8 rounded-lg px-2 text-xs font-semibold text-[var(--app-foreground-muted)] transition hover:bg-[var(--app-surface-elevated)] hover:text-[var(--app-foreground)]"
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              aria-pressed={passwordVisible}
            >
              {passwordVisible ? "Hide" : "Show"}
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
