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

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeField, setActiveField] = useState<AuthField>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [status, setStatus] = useState<AuthStatus>("idle");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    setStatus("submitting");

    try {
      const result = await signUp({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message);
        setStatus("idle");
        return;
      }

      setStatus("success");

      if (result.needsEmailConfirmation || !result.session) {
        setSuccessMessage(
          "Your account has been created. Please check your email and confirm your address before signing in.",
        );
        return;
      }

      navigate("/onboarding", { replace: true });
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
      title="Create your account."
      subtitle="Get started with one connected workspace for managing your business operations."
      activeField={activeField}
      passwordVisible={passwordVisible}
      status={status}
      mode="signup"
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error && (
          <Alert variant="error" title="Unable to create account">
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" title="Verify your email">
            {successMessage}
          </Alert>
        )}

        <Input
          id="signup-name"
          label="Full name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          onFocus={() => setActiveField("name")}
          onBlur={() => setActiveField(null)}
          autoComplete="name"
          placeholder="Your full name"
          required
        />

        <Input
          id="signup-email"
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
            htmlFor="signup-password"
            className="text-xs font-semibold uppercase tracking-wider text-[var(--app-foreground-subtle)]"
          >
            Password
          </label>

          <div className="relative">
            <Input
              id="signup-password"
              type={passwordVisible ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={() => setActiveField("password")}
              onBlur={() => setActiveField(null)}
              autoComplete="new-password"
              placeholder="Create a password"
              minLength={6}
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

          <p className="text-xs text-[var(--app-foreground-subtle)]">
            Use at least 6 characters.
          </p>
        </div>

        <Button
          type="submit"
          className="w-full !rounded-xl !py-3"
          isLoading={isSubmitting}
        >
          Create your account
        </Button>

        <p className="text-center text-xs leading-5 text-[var(--app-foreground-subtle)]">
          By creating an account, you agree to use BizFlow responsibly to manage
          your business operations.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--app-foreground-muted)]">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-[var(--brand-primary)] transition hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
