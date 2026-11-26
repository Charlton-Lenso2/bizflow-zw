import { useState, type FormEvent } from "react";
import { Save, UserRound } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import { Alert } from "../../../components/ui/Alert";
import { LoadingState } from "../../../components/ui/LoadingState";
import { BrandingPanel } from "../../business/components/BrandingPanel";
import { useBusiness } from "../../business/hooks/useActiveBusiness";
import { useAuth } from "../../auth/hooks/useAuth";
import type {
  UpdateProfileInput,
  UserProfile,
} from "../../auth/services/profileService";

function PersonalProfileForm({
  profile,
  email,
  onSave,
}: {
  profile: UserProfile;
  email: string;
  onSave: (input: UpdateProfileInput) => Promise<UserProfile>;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setIsSaving(true);

    try {
      await onSave({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });

      setSuccess("Your personal profile has been updated.");
    } catch (saveError) {
      console.error("Failed to save personal profile", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "We could not save your profile. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card padding="none" className="scroll-mt-24">
      <section id="profile" className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor:
              "color-mix(in srgb, var(--brand-primary) 12%, transparent)",
            color: "var(--brand-primary)",
          }}
        >
          <UserRound className="h-5 w-5" />
        </div>

        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Personal profile
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage the personal details associated with your account.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-5">
          <Alert variant="error" title="Profile update failed">
            {error}
          </Alert>
        </div>
      ) : null}

      {success ? (
        <div className="mt-5">
          <Alert variant="success" title="Changes saved">
            {success}
          </Alert>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Full name
            </span>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Enter your full name"
              maxLength={120}
              required
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:bg-slate-950"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Phone number
            </span>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Enter your phone number"
              maxLength={30}
              className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:bg-slate-950"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Email address
            </span>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-slate-500 outline-none dark:bg-slate-800 dark:text-slate-400"
            />
            <span className="mt-1.5 block text-xs text-slate-400">
              Your email is managed by your sign-in account.
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {isSaving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </div>
      </form>
      </section>
    </Card>
  );
}

export function SettingsPage() {
  const { activeBusiness, isLoading: businessLoading } = useBusiness();
  const { user, profile, updateProfile } = useAuth();

  if (businessLoading) {
    return <LoadingState message="Loading settings..." />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 p-4 sm:p-6 lg:p-8">
      <header>
        <p
          className="text-sm font-medium"
          style={{ color: "var(--brand-primary)" }}
        >
          Account and workspace
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Manage your personal information and business workspace.
        </p>
      </header>

      {profile ? (
        <PersonalProfileForm
          key={profile.id}
          profile={profile}
          email={user?.email ?? ""}
          onSave={updateProfile}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-white p-6 dark:bg-slate-900">
          <LoadingState message="Loading your personal profile..." />
        </div>
      )}

      {activeBusiness ? (
        <>
          <Card padding="none">
            <section className="p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Business details
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Information about your active workspace.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Business name
                </p>
                <p className="mt-1 font-semibold text-slate-900 dark:text-white">
                  {activeBusiness.name}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Business type
                </p>
                <p className="mt-1 font-semibold capitalize text-slate-900 dark:text-white">
                  {activeBusiness.business_type}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Business phone
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {activeBusiness.phone || "Not provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Business address
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {activeBusiness.address || "Not provided"}
                </p>
              </div>
            </div>
            </section>
          </Card>

          <BrandingPanel key={activeBusiness.id} business={activeBusiness} />
        </>
      ) : (
        <Alert variant="info" title="No active business">
          Your personal profile is available. Select or create a business to
          configure its details and branding.
        </Alert>
      )}
    </div>
  );
}
