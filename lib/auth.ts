import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export function subscribeToAuthChanges(
  onChange: (session: Session | null) => void
): () => void {
  if (!supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    onChange(session);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signInCaregiver(email: string, password: string): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUpCaregiver(email: string, password: string): Promise<boolean> {
  if (!supabase) {
    throw new Error('Supabase ei ole seadistatud.');
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: email.trim().split('@')[0] ?? null,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return !data.session;
}

export async function signOutCaregiver(): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  return data.session?.access_token ?? null;
}
