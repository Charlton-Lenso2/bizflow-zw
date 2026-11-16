import type { Session, User } from "@supabase/supabase-js";
import type {
  UserProfile,
  UpdateProfileInput,
} from "../services/profileService";

export type AuthRole = "owner" | "administrator" | "manager" | "cashier";

export type AuthErrorState = {
  message: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type SignUpInput = SignInInput & {
  fullName: string;
};

export type AuthResult = {
  error: Error | null;
  needsEmailConfirmation?: boolean;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signIn: (input: SignInInput) => Promise<AuthResult>;
  signUp: (
    input: SignUpInput,
  ) => Promise<AuthResult & { session: Session | null }>;
  signOut: () => Promise<void>;
  updateProfile: (input: UpdateProfileInput) => Promise<UserProfile>;
};
