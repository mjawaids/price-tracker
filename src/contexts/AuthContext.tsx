import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { trackAuth } from '../utils/analytics'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signInWithGoogle: () => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>
  updateProfile: (updates: { full_name?: string; avatar_url?: string }) => Promise<{ error: any }>
  uploadAvatar: (file: File) => Promise<{ error: any }>
  removeAvatar: () => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then((response: any) => {
      const session = response?.data?.session ?? null
      const newUser = session?.user ?? null
      setSession(session)
      setUser(prev => (prev?.id === newUser?.id ? prev : newUser))
      setLoading(false)
    }).catch((error: any) => {
      console.warn('Error getting session:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const authListener = supabase.auth.onAuthStateChange(async (_event: any, session: any) => {
      const newUser = session?.user ?? null
      setSession(session)
      // Only update React state when the user id actually changes. This prevents
      // redundant updates triggered by Supabase reconnects (which can cause
      // components to reload data on visibility change).
      setUser(prev => (prev?.id === newUser?.id ? prev : newUser))
      setLoading(false)
    })

    const subscription = authListener?.data?.subscription
    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe()
      }
    }
  }, [])

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (!error && data.user) {
      // Track successful sign up. The full name is stored in user_metadata
      // (options.data above), which is what the UI reads.
      trackAuth('sign_up');
    }

    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (!error) {
      trackAuth('sign_in');
    }
    
    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' },
      },
    })
    return { error }
  }

  const signOut = async () => {
    trackAuth('sign_out');
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    
    if (!error) {
      trackAuth('password_reset');
    }
    
    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    return { error }
  }

  const updateProfile = async (updates: { full_name?: string; avatar_url?: string }) => {
    if (!user) return { error: new Error('No user') }

    // Update the auth user metadata so the UI (which reads user_metadata)
    // reflects the change immediately.
    const { data: authData, error: authError } = await supabase.auth.updateUser({
      data: updates,
    })
    if (!authError && authData?.user) {
      setUser(authData.user)
    }

    return { error: authError }
  }

  // Stored avatars live in the public `avatars` storage bucket under the
  // user's folder. Google-provided photos (user_metadata.picture or a remote
  // avatar_url) are NOT in this bucket and must never be deleted from storage.
  const AVATAR_MARKER = '/avatars/'

  const removeStoredAvatarFile = async (avatarUrl?: string) => {
    if (!avatarUrl) return
    const idx = avatarUrl.indexOf(AVATAR_MARKER)
    if (idx === -1) return // not a stored avatar (e.g. Google URL)
    const { error } = await supabase.storage
      .from('avatars')
      .remove([avatarUrl.slice(idx + AVATAR_MARKER.length)])
    if (error) console.error('Error deleting avatar from storage:', error)
  }

  const uploadAvatar = async (file: File) => {
    if (!user) return { error: new Error('No user') }
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${user.id}/avatar-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: false, contentType: file.type })
    if (uploadError) {
      console.error('Error uploading avatar:', uploadError)
      return { error: uploadError }
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = data.publicUrl as string

    // Persist the new URL first; only remove the previous stored file once the
    // metadata update succeeds, so a failure never leaves the user without an avatar.
    const prevAvatar = user.user_metadata?.avatar_url as string | undefined
    const { error } = await updateProfile({ avatar_url: publicUrl })
    if (error) {
      await removeStoredAvatarFile(publicUrl)
      return { error }
    }
    if (prevAvatar && prevAvatar !== publicUrl) await removeStoredAvatarFile(prevAvatar)
    return { error: null }
  }

  const removeAvatar = async () => {
    if (!user) return { error: new Error('No user') }
    const prevAvatar = user.user_metadata?.avatar_url as string | undefined
    // Clear the custom avatar so the UI falls back to the Google photo (picture)
    // and then to initials.
    const { error } = await updateProfile({ avatar_url: null as unknown as string })
    if (error) return { error }
    await removeStoredAvatarFile(prevAvatar)
    return { error: null }
  }

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    uploadAvatar,
    removeAvatar,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}