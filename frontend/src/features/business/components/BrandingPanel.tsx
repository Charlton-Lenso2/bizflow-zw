import { useEffect, useRef, useState } from "react";
import { ImageUp, RotateCcw, Save, Sparkles } from "lucide-react";
import { Button } from "../../../components/ui/Button";
import type { BusinessRecord } from "../types/business";
import {
  fetchBusinessBranding,
  saveBusinessBranding,
  updateBusinessLogoUrl,
  uploadBusinessLogoForBusiness,
  validateBusinessLogoFile,
} from "../services/businessService";
import {
  applyBrandPalette,
  extractPaletteFromImage,
  FALLBACK_BRAND_PALETTE,
  type BrandPalette,
} from "../utils/brandPalette";

type BrandingPanelProps = {
  business: BusinessRecord;
};

function getDetailedError(error: unknown): string {
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const parts = [
      value.message,
      value.details,
      value.hint,
      value.code,
    ].filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );

    if (parts.length > 0) {
      return parts.join(" — ");
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred.";
}

export function BrandingPanel({ business }: BrandingPanelProps) {
  const [palette, setPalette] = useState<BrandPalette>(
    FALLBACK_BRAND_PALETTE,
  );
  const [logoUrl, setLogoUrl] = useState(business.logo_url ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const previewUrlRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    async function loadBranding() {
      setIsLoading(true);
      setError("");

      try {
        const record = await fetchBusinessBranding(business.id);

        if (cancelled) return;

        if (record) {
          const savedPalette =
            record.palette &&
            typeof record.palette.primary === "string" &&
            typeof record.palette.accent === "string"
              ? record.palette
              : {
                  ...FALLBACK_BRAND_PALETTE,
                  primary: record.primary_color,
                  accent: record.accent_color,
                };

          setPalette(savedPalette);
          applyBrandPalette(savedPalette);
        } else {
          setPalette(FALLBACK_BRAND_PALETTE);
          applyBrandPalette(FALLBACK_BRAND_PALETTE);
        }

        setLogoUrl(business.logo_url ?? "");
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load the saved business branding.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadBranding();

    return () => {
      cancelled = true;
    };
  }, [business.id, business.logo_url]);

  useEffect(() => {
    applyBrandPalette(palette);
  }, [palette]);

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
      setMessage("");
      return;
    }

    setError("");
    setMessage("Reading your logo and extracting its colours...");

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
      setMessage("Logo analysed. Save changes to apply your new branding.");
    } catch (extractError) {
      setError(
        extractError instanceof Error
          ? extractError.message
          : "Could not extract colours from this image.",
      );
      setMessage("");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setMessage("");

    let stage = "saving your brand colours";

    try {
      await saveBusinessBranding(business.id, palette);

      if (selectedFile) {
        stage = "uploading your logo";

        const publicUrl = await uploadBusinessLogoForBusiness(
          business.id,
          selectedFile,
        );

        stage = "saving your logo URL";

        await updateBusinessLogoUrl(business.id, publicUrl);

        setLogoUrl(publicUrl);
        setSelectedFile(null);
        setPreviewUrl("");

        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = "";
        }
      }

      applyBrandPalette(palette);
      setMessage("Business branding saved successfully.");
    } catch (saveError) {
      console.error("Business branding save failed:", {
        stage,
        error: saveError,
      });

      setError(
        `Failed while ${stage}: ${getDetailedError(saveError)}`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await saveBusinessBranding(
        business.id,
        FALLBACK_BRAND_PALETTE,
      );

      setPalette(FALLBACK_BRAND_PALETTE);
      applyBrandPalette(FALLBACK_BRAND_PALETTE);
      setSelectedFile(null);
      setPreviewUrl("");

      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = "";
      }

      setMessage("Default branding restored and saved.");
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : "Could not restore the default branding.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const displayedLogo = previewUrl || logoUrl;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
          Business appearance
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
          Logo and brand colours
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Add your business logo and choose the colours used throughout your
          workspace. You can automatically extract a colour palette from your
          logo.
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      ) : null}

      {message ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
        >
          {message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          Loading saved branding...
        </div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Business logo
              </h3>

              <div className="mt-4 flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 dark:border-slate-600 dark:bg-slate-800/60">
                {displayedLogo ? (
                  <img
                    src={displayedLogo}
                    alt={`${business.name} logo preview`}
                    className="max-h-32 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center">
                    <ImageUp className="mx-auto h-9 w-9 text-slate-400" />
                    <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                      No logo uploaded
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      PNG, JPG or WebP
                    </p>
                  </div>
                )}
              </div>

              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
                <ImageUp className="h-4 w-4" />
                Choose logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleLogoChange}
                />
              </label>

              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Maximum file size: 2 MB. The new logo is uploaded when you save.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Brand colour palette
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Extracted from your logo or adjusted manually.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
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
                    className="h-11 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                      Primary colour
                    </span>
                    <span className="text-xs uppercase text-slate-500">
                      {palette.primary}
                    </span>
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
                    className="h-11 w-14 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                      Accent colour
                    </span>
                    <span className="text-xs uppercase text-slate-500">
                      {palette.accent}
                    </span>
                  </span>
                </label>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Palette preview
                </p>
                <div className="flex h-12 overflow-hidden rounded-xl">
                  <div className="flex-1" style={{ backgroundColor: palette.primary }} />
                  <div className="flex-1" style={{ backgroundColor: palette.accent }} />
                  <div className="flex-1" style={{ backgroundColor: palette.highlight }} />
                  <div className="flex-1" style={{ backgroundColor: palette.surface }} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              isLoading={isSaving}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Restore defaults
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              isLoading={isSaving}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save branding
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
