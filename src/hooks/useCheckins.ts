import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Checkin, CheckinFoto, CheckinWithFotos } from '../types'

function getStoragePath(url: string): string | null {
  const marker = '/checkin-fotos/'
  const idx = url.indexOf(marker)
  return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length).split('?')[0]) : null
}

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

  const cleanupOldPhotoSets = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('checkins')
      .select('id, mes, anio, checkin_fotos(*)')
      .eq('user_id', userId)
      .order('anio', { ascending: true })
      .order('mes', { ascending: true })

    if (!data) return
    const withPhotos = data.filter((c: any) => c.checkin_fotos?.length > 0)
    if (withPhotos.length <= 3) return

    const toDelete = withPhotos.slice(0, withPhotos.length - 3)
    for (const checkin of toDelete) {
      const paths = (checkin.checkin_fotos as CheckinFoto[])
        .map(f => getStoragePath(f.url))
        .filter((p): p is string => p !== null)
      if (paths.length) await supabase.storage.from('checkin-fotos').remove(paths)
      await supabase.from('checkin_fotos').delete().eq('checkin_id', checkin.id)
    }
  }

  const saveCheckin = async (
    checkin: Omit<Checkin, 'id' | 'user_id' | 'created_at'>,
    files: { file: File; tipo: CheckinFoto['tipo'] }[]
  ) => {
    if (!userId) return { error: new Error('No user') }

    // Si hay fotos nuevas y existe un check-in previo para ese mes/año, borrar las fotos viejas
    if (files.length > 0) {
      const existing = checkins.find(c => c.mes === checkin.mes && c.anio === checkin.anio)
      if (existing?.checkin_fotos?.length) {
        const paths = existing.checkin_fotos
          .map(f => getStoragePath(f.url))
          .filter((p): p is string => p !== null)
        if (paths.length) await supabase.storage.from('checkin-fotos').remove(paths)
        await supabase.from('checkin_fotos').delete().eq('checkin_id', existing.id)
      }
    }

    const { data: savedCheckin, error: checkinError } = await supabase
      .from('checkins')
      .upsert(
        { ...checkin, user_id: userId },
        { onConflict: 'user_id,mes,anio' }
      )
      .select()
      .single()

    if (checkinError) return { error: checkinError }

    const uploadedFotos: Omit<CheckinFoto, 'id' | 'created_at'>[] = []
    for (const { file, tipo } of files.slice(0, 5)) {
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
      await cleanupOldPhotoSets()
    }

    await fetchCheckins()
    return { data: savedCheckin, error: null }
  }

  // Elimina el check-in completo: fotos de storage, registros DB y medidas
  const deleteCheckin = async (id: string) => {
    const checkin = checkins.find(c => c.id === id)
    if (checkin?.checkin_fotos?.length) {
      const paths = checkin.checkin_fotos
        .map(f => getStoragePath(f.url))
        .filter((p): p is string => p !== null)
      if (paths.length) await supabase.storage.from('checkin-fotos').remove(paths)
      await supabase.from('checkin_fotos').delete().eq('checkin_id', id)
    }
    await supabase.from('checkins').delete().eq('id', id)
    await fetchCheckins()
  }

  // Elimina solo las fotos de un check-in (deja las medidas intactas)
  const deleteFotos = async (checkinId: string) => {
    const checkin = checkins.find(c => c.id === checkinId)
    if (!checkin?.checkin_fotos?.length) return
    const paths = checkin.checkin_fotos
      .map(f => getStoragePath(f.url))
      .filter((p): p is string => p !== null)
    if (paths.length) await supabase.storage.from('checkin-fotos').remove(paths)
    await supabase.from('checkin_fotos').delete().eq('checkin_id', checkinId)
    await fetchCheckins()
  }

  // Elimina una sola foto
  const deleteFoto = async (foto: CheckinFoto) => {
    const path = getStoragePath(foto.url)
    if (path) await supabase.storage.from('checkin-fotos').remove([path])
    await supabase.from('checkin_fotos').delete().eq('id', foto.id)
    await fetchCheckins()
  }

  return { checkins, loading, saveCheckin, deleteCheckin, deleteFotos, deleteFoto, refetch: fetchCheckins }
}
