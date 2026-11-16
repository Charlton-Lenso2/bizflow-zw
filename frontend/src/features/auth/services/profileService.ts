import { supabase } from "../../../lib/supabase";

export type UserProfile = {
  id: string;
  full_name: string | null;
  phone: string | null;
};

export type UpdateProfileInput = {
  fullName: string;
  phone: string;
};

export async function fetchUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: input.fullName.trim(),
      phone: input.phone.trim() || null,
    })
    .eq("id", userId)
    .select("id, full_name, phone")
    .single();

  if (error) {
    throw error;
  }

  return data;
}
