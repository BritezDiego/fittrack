import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Checkin, CheckinFoto, CheckinWithFotos } from '../types'

export function useCheckins(userId: string | undefined) {
  const [checkins, setCheckins] = useState<CheckinWithFotos[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCheckins = async () => {
    if (!userId) { setLoading(false); return }
    const { data } = await supabase
      .from('checkins')
      .select('*, checkin_fotos(*)')
      .eq('user_id', userId)
      .order('anio', { ascending: true })
      .order('mes', { ascending: true })
    setCheckins((data as CheckinWithFotos[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCheckins() }, [userId])

  const saveCheckin = async (
    checkin: Omit<Checkin, 'id' | 'user_id' | 'created_at'>,
    files: { file: File; tipo: CheckinFoto['tipo'] }[]
  ) => {
    if (!userId) return { error: new Error('No user') }

    // Upsert checkin
    const { data: savedCheckin, error: checkinError } = await supabase
      .from('checkins')
      .upsert(
        { ...checkin, user_id: userId },
        { onConflict: 'user_id,mes,anio' }
      )
      .select()
      .single()

    if (checkinError) return { error: checkinError }

    // Upload photos
    const uploadedFotos: Omit<CheckinFoto, 'id' | 'created_at'>[] = []
    for (const { file, tipo } of files) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${savedCheckin.id}/${tipo}_${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('checkin-fotos')
        .upload(path, file, { upsert: true })
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('checkin-fotos')
          .getPublicUrl(path)
        uploadedFotos.push({ checkin_id: savedCheckin.id, url: publicUrl, tipo })
      }
    }

    if (uploadedFotos.length > 0) {
      await supabase.from('checkin_fotos').insert(uploadedFotos)
    }

    await fetchCheckins()
    return { data: savedCheckin, error: null }
  }

  const deleteCheckin = async (id: string) => {
    await supabase.from('checkins').delete().eq('id', id)
    await fetchCheckins()
  }

  return { checkins, loading, saveCheckin, deleteCheckin, refetch: fetchCheckins }
}
