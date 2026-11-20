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

  const passwordCriteria = [
    {
      label: "At least 6 characters",
      met: password.length >= 6,
    },
    {
      label: "At least 8 characters",
      met: password.length >= 8,
    },
    {
      label: "Lowercase letter",
      met: /[a-z]/.test(password),
    },
    {
      label: "Uppercase letter",
      met: /[A-Z]/.test(password),
    },
    {
      label: "Number or symbol",
      met: /[\d\W]/.test(password),
    },
  ];

  const strengthScore = passwordCriteria.filter(
    (criterion) => criterion.met,
  ).length;

  const strength = (() => {
    if (!password) {
      return {
        label: "Not entered",
        color: "bg-slate-200",
        textColor: "text-slate-400",
      };
    }

    if (strengthScore <= 2) {
      return {
        label: "Weak",
        color: "bg-red-500",
        textColor: "text-red-600",
      };
    }

    if (strengthScore === 3) {
      return {
        label: "Fair",
        color: "bg-amber-500",
        textColor: "text-amber-600",
      };
    }

    if (strengthScore === 4) {
      return {
        label: "Good",
        color: "bg-blue-500",
        textColor: "text-blue-600",
      };
    }

    return {
      label: "Strong",
      color: "bg-emerald-500",
      textColor: "text-emerald-600",
    };
  })();

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
        setStatus("error");
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
      setStatus("error");
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

        <div className="space-y-3">
          <label
            htmlFor="signup-password"
            className="text-xs font-semibold uppercase tracking-wider text-slate-500"
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
              className="pr-12"
              required
            />

            <button
              type="button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              className="absolute inset-y-0 right-3 flex items-center justify-center rounded-lg text-slate-400 transition hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label={passwordVisible ? "Hide password" : "Show password"}
              aria-pressed={passwordVisible}
            >
              {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">
                Password strength
              </span>

              <span className={`text-xs font-semibold ${strength.textColor}`}>
                {strength.label}
              </span>
            </div>

            <div
              className="flex h-1.5 w-full gap-1 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-label="Password strength"
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={strengthScore}
            >
              {passwordCriteria.map((criterion, index) => (
                <div
                  key={index}
                  className={`h-full flex-1 rounded-full transition-colors duration-300 ${
                    criterion.met ? strength.color : "bg-slate-200"
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-1">
              {passwordCriteria.map((criterion) => (
                <div key={criterion.label} className="flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
                      criterion.met
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {criterion.met ? (
                      <CheckIcon />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-current" />
                    )}
                  </span>

                  <span
                    className={`text-[11px] transition-colors ${
                      criterion.met ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {criterion.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full !rounded-xl !py-3"
          isLoading={isSubmitting}
        >
          Create your account
        </Button>

        <p className="text-center text-xs leading-5 text-slate-400">
          By creating an account, you agree to use BizFlow responsibly to manage
          your business operations.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}

function EyeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 3 18 18" />
      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a13.4 13.4 0 0 1-3.2 4.2" />
      <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 7 10 7a10.3 10.3 0 0 0 4.1-.8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}
