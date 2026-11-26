import { CustomSelect } from "../../../components/ui/CustomSelect";
import { useEffect, useRef, useState } from "react";
import { ImageUp, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { useBusiness } from "../hooks/useActiveBusiness";
import type { BusinessRecord } from "../types/business";
import {
  saveBusinessBranding,
  updateBusinessLogoUrl,
  uploadBusinessLogoForBusiness,
  validateBusinessLogoFile,
} from "../services/businessService";
import {
  extractPaletteFromImage,
  FALLBACK_BRAND_PALETTE,
  type BrandPalette,
} from "../utils/brandPalette";

export function BusinessOnboardingPage() {
  const navigate = useNavigate();
  const { createBusiness } = useBusiness();

  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("wholesale");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState<"USD" | "ZWG">(
    "USD",
  );
  const [palette, setPalette] = useState<BrandPalette>(
    FALLBACK_BRAND_PALETTE,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [createdBusiness, setCreatedBusiness] =
    useState<BusinessRecord | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleLogoChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const validationMessage = validateBusinessLogoFile(file);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");

    try {
      const extractedPalette = await extractPaletteFromImage(file);
      const nextPreviewUrl = URL.createObjectURL(file);

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      previewUrlRef.current = nextPreviewUrl;
      setPreviewUrl(nextPreviewUrl);
      setSelectedFile(file);
      setPalette(extractedPalette);
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : "Could not analyse the selected logo.",
      );
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      let business = createdBusiness;

      if (!business) {
        business = await createBusiness({
          name,
          business_type: businessType,
          phone,
          address,
          default_currency: defaultCurrency,
        });

        if (!business) {
          throw new Error("You must be signed in to create a business.");
        }

        setCreatedBusiness(business);
      }

      await saveBusinessBranding(business.id, palette);

      if (selectedFile) {
        const publicUrl = await uploadBusinessLogoForBusiness(
          business.id,
          selectedFile,
        );

        await updateBusinessLogoUrl(business.id, publicUrl);
      }

      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Business setup failed. Please try again.";

      setError(
        createdBusiness
          ? `Your business has already been created. Your branding setup did not finish: ${message} You can retry safely; this will not create another business.`
          : message,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const continueToDashboard = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <Sparkles className="h-3.5 w-3.5" />
            BizFlow business setup
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Set up your business
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Add your business details and brand identity. Your workspace will
            use these details for its sales, customers, inventory and reports.
          </p>
        </div>

        {error ? (
          <div className="mb-6">
            <Alert variant="error" title="Setup needs attention">
              {error}
            </Alert>
          </div>
        ) : null}

        {createdBusiness ? (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
            <p className="font-semibold">
              {createdBusiness.name} has been created.
            </p>
            <p className="mt-1">
              Complete the branding step below or continue to your dashboard.
            </p>
            <button
              type="button"
              onClick={continueToDashboard}
              className="mt-3 font-semibold underline underline-offset-2"
            >
              Continue to dashboard
            </button>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]"
        >
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Business information
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                These details identify your workspace.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Business name *
              </span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Simba Wholesale"
                required
                disabled={Boolean(createdBusiness)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Business type *
              </span>
              <CustomSelect
  value={businessType}
  onChange={setBusinessType}
  disabled={Boolean(createdBusiness)}
  options={[
    { value: "wholesale", label: "Wholesale" },
    { value: "retail", label: "Retail" },
    { value: "distribution", label: "Distribution" },
    { value: "other", label: "Other" },
  ]}
/>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Phone number
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+263 ..."
                disabled={Boolean(createdBusiness)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Business address
              </span>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Town, area or physical address"
                disabled={Boolean(createdBusiness)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-800"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Default currency
              </span>
              <CustomSelect
  value={defaultCurrency}
  onChange={(value) =>
    setDefaultCurrency(value as "USD" | "ZWG")
  }
  disabled={Boolean(createdBusiness)}
  options={[
    { value: "USD", label: "USD — US Dollar" },
    { value: "ZWG", label: "ZWG — Zimbabwe Gold" },
  ]}
/>
            </label>
          </section>

          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                Brand identity
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Upload a logo to automatically generate your starting palette.
              </p>
            </div>

            <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Selected business logo preview"
                  className="max-h-28 max-w-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <ImageUp className="mx-auto h-9 w-9 text-slate-400" />
                  <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Add your business logo
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    PNG, JPG or WebP · Maximum 2 MB
                  </p>
                </div>
              )}
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              <ImageUp className="h-4 w-4" />
              Choose business logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleLogoChange}
              />
            </label>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Brand colours
              </p>

              <label className="flex items-center gap-3">
                <input
                  type="color"
                  value={palette.primary}
                  onChange={(event) =>
                    setPalette((current) => ({
                      ...current,
                      primary: event.target.value,
                    }))
                  }
                  className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Primary · {palette.primary.toUpperCase()}
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="color"
                  value={palette.accent}
                  onChange={(event) =>
                    setPalette((current) => ({
                      ...current,
                      accent: event.target.value,
                    }))
                  }
                  className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Accent · {palette.accent.toUpperCase()}
                </span>
              </label>

              <div className="flex h-9 overflow-hidden rounded-lg">
                <div className="flex-1" style={{ backgroundColor: palette.primary }} />
                <div className="flex-1" style={{ backgroundColor: palette.accent }} />
                <div className="flex-1" style={{ backgroundColor: palette.highlight }} />
                <div className="flex-1" style={{ backgroundColor: palette.surface }} />
              </div>
            </div>

            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              You can change your logo and brand colours later in Settings.
            </p>

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
            >
              {createdBusiness
                ? "Retry branding setup"
                : "Create business and workspace"}
            </Button>
          </section>
        </form>
      </div>
    </main>
  );
}
