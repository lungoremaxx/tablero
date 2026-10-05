import { localStore } from './localStore'
import { createSupabaseStore } from './supabaseStore'
import type { Store } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Con las variables de Supabase usa la base compartida; sin ellas, modo demo local. */
export const store: Store = url && key ? createSupabaseStore(url, key) : localStore
