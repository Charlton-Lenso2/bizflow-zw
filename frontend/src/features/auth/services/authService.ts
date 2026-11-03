import { supabase } from '../../../lib/supabase'
import type { SignInInput, SignUpInput } from '../types/auth'

export async function signInWithEmail(input: SignInInput) {
  return supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  })
}

export async function signUpWithEmail(input: SignUpInput) {
  return supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
      },
    },
  })
}

export async function signOutUser() {
  return supabase.auth.signOut()
}

export async function getCurrentSession() {
  return supabase.auth.getSession()
}
