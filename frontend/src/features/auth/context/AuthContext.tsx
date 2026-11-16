import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase";
import {
  getCurrentSession,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
} from "../services/authService";
import {
  fetchUserProfile,
  saveUserProfile,
  type UserProfile,
} from "../services/profileService";
import type {
  AuthContextValue,
  AuthResult,
  SignInInput,
  SignUpInput,
} from "../types/auth";
import type { UpdateProfileInput } from "../services/profileService";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const initialiseSession = async () => {
      const { data, error } = await getCurrentSession();

      if (!isMounted) return;

      if (error) {
        console.error("Failed to initialise auth session", error);
      }

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    };

    void initialiseSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!isMounted) return;

        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setIsLoading(false);

        if (!nextSession) {
          setProfile(null);
        }
      },
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    const loadProfile = async () => {
      try {
        const savedProfile = await fetchUserProfile(user.id);

        if (cancelled) return;

        setProfile(
          savedProfile ?? {
            id: user.id,
            full_name:
              typeof user.user_metadata?.full_name === "string"
                ? user.user_metadata.full_name
                : null,
            phone:
              typeof user.user_metadata?.phone === "string"
                ? user.user_metadata.phone
                : null,
          },
        );
      } catch (error) {
        console.error("Failed to load user profile", error);

        if (!cancelled) {
          setProfile({
            id: user.id,
            full_name:
              typeof user.user_metadata?.full_name === "string"
                ? user.user_metadata.full_name
                : null,
            phone: null,
          });
        }
      }
    };

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.user_metadata]);

  const signIn = async (input: SignInInput): Promise<AuthResult> => {
    const { data, error } = await signInWithEmail(input);

    if (error) {
      return {
        error: error as Error,
      };
    }

    setSession(data.session);
    setUser(data.user);

    return {
      error: null,
    };
  };

  const signUp = async (
    input: SignUpInput,
  ): Promise<AuthResult & { session: Session | null }> => {
    const { data, error } = await signUpWithEmail(input);

    if (error) {
      return {
        error: error as Error,
        session: null,
      };
    }

    setSession(data.session);
    setUser(data.session?.user ?? null);

    return {
      error: null,
      session: data.session,
      needsEmailConfirmation: !data.session,
    };
  };

  const signOut = async () => {
    const { error } = await signOutUser();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<UserProfile> => {
      if (!user?.id) {
        throw new Error("You must be signed in to update your profile.");
      }

      const updatedProfile = await saveUserProfile(user.id, input);

      setProfile(updatedProfile);

      return updatedProfile;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      signIn,
      signUp,
      signOut,
      updateProfile,
    }),
    [isLoading, session, user, profile, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
