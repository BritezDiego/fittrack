import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    if (!userId) { setLoading(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  useEffect(() => { fetchProfile() }, [userId])

  const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'user_id' | 'created_at'>>) => {
    if (!userId) return { error: new Error('No user') }
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      .select()
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  return { profile, loading, updateProfile, refetch: fetchProfile }
}
