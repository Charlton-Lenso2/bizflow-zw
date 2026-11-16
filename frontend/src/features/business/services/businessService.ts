import { supabase } from "../../../lib/supabase";
import type { BrandPalette } from "../utils/brandPalette";
import type {
  BusinessCreateInput,
  BusinessMembership,
  BusinessRecord,
} from "../types/business";

export const MAX_LOGO_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);
export const BUSINESS_LOGO_BUCKET = "business-logos";

export type BusinessBrandingRecord = {
  business_id: string;
  primary_color: string;
  accent_color: string;
  palette: BrandPalette;
  updated_at: string;
};

export function validateBusinessLogoFile(file: File): string | null {
  if (!file.type || !ACCEPTED_LOGO_TYPES.has(file.type)) {
    return "Unsupported file type. Please upload a PNG, JPG, or WebP logo.";
  }

  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    return "Logo is too large. Please upload an image under 2MB.";
  }

  return null;
}

export async function uploadBusinessLogoForBusiness(
  businessId: string,
  file: File,
): Promise<string> {
  const validationMessage = validateBusinessLogoFile(file);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${businessId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUSINESS_LOGO_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(BUSINESS_LOGO_BUCKET)
    .getPublicUrl(objectPath);

  if (!data?.publicUrl) {
    throw new Error("The uploaded logo could not be resolved to a public URL.");
  }

  return data.publicUrl;
}

export async function fetchBusinessBranding(
  businessId: string,
): Promise<BusinessBrandingRecord | null> {
  const { data, error } = await supabase
    .from("business_branding")
    .select("business_id, primary_color, accent_color, palette, updated_at")
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    business_id: data.business_id,
    primary_color: data.primary_color,
    accent_color: data.accent_color,
    palette: data.palette as BrandPalette,
    updated_at: data.updated_at,
  };
}

export async function saveBusinessBranding(
  businessId: string,
  palette: BrandPalette,
): Promise<void> {
  const { error } = await supabase.from("business_branding").upsert(
    {
      business_id: businessId,
      primary_color: palette.primary,
      accent_color: palette.accent,
      palette,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_id" },
  );

  if (error) {
    throw error;
  }
}

export async function fetchBusinessMembershipsForUser(
  userId: string,
): Promise<BusinessMembership[]> {
  const { data, error } = await supabase
    .from("business_members")
    .select(
      "id, business_id, user_id, role, is_active, created_at, businesses(id, name, business_type, phone, address, logo_url, default_currency, created_by, created_at, updated_at)",
    )
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const businessRow = Array.isArray(row.businesses)
      ? row.businesses[0]
      : row.businesses;

    return {
      ...row,
      businesses: businessRow ?? null,
    } as BusinessMembership;
  });
}

export async function createBusinessRecord(
  input: BusinessCreateInput,
): Promise<BusinessRecord> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("You must be signed in to create a business.");
  }

  const businessId = crypto.randomUUID();

  const payload = {
    id: businessId,
    name: input.name.trim(),
    business_type: input.business_type.trim(),
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
    default_currency: input.default_currency ?? "USD",
    created_by: user.id,
  };

  const { error: insertError } = await supabase
    .from("businesses")
    .insert([payload]);

  if (insertError) {
    throw insertError;
  }

  const { data, error: fetchError } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  return data as BusinessRecord;
}

export async function updateBusinessLogoUrl(
  businessId: string,
  logoUrl: string | null,
): Promise<void> {
  if (logoUrl && (logoUrl.startsWith("blob:") || logoUrl.startsWith("data:"))) {
    throw new Error(
      "Only a persisted public storage URL can be saved to businesses.logo_url.",
    );
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", businessId);

  if (error) {
    throw error;
  }
}
