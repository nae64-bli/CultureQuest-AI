import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Museum, MuseumInput } from '../types/culture.ts';
import { SEED_MUSEUMS } from './seedData.ts';

interface LocalStoreData {
  museums: Museum[];
  adminPasscodeHash: string | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'store.json');

let supabaseClient: SupabaseClient | null = null;
let supabaseSeeded = false;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function getStorageBackend(): 'supabase' | 'local' {
  return isSupabaseConfigured() ? 'supabase' : 'local';
}

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL!.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!.trim();
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

function ensureLocalStore(): LocalStoreData {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: LocalStoreData = {
      museums: SEED_MUSEUMS,
      adminPasscodeHash: null,
    };
    atomicWriteLocalStore(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<LocalStoreData>;
    return {
      museums: Array.isArray(parsed.museums) ? parsed.museums : SEED_MUSEUMS,
      adminPasscodeHash:
        typeof parsed.adminPasscodeHash === 'string'
          ? parsed.adminPasscodeHash
          : null,
    };
  } catch {
    const fallback: LocalStoreData = {
      museums: SEED_MUSEUMS,
      adminPasscodeHash: null,
    };
    atomicWriteLocalStore(fallback);
    return fallback;
  }
}

function atomicWriteLocalStore(data: LocalStoreData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpPath = path.join(
    DATA_DIR,
    `store.${crypto.randomBytes(6).toString('hex')}.tmp`
  );
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

async function ensureSupabaseSeeded(): Promise<void> {
  if (supabaseSeeded) return;
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from('museums')
    .select('id', { count: 'exact', head: true });
  if (error) {
    throw new Error(`Error consultando Supabase: ${error.message}`);
  }
  if ((count ?? 0) === 0) {
    const rows = SEED_MUSEUMS.map(({ id: _id, ...rest }) => rest);
    const { error: insertError } = await supabase.from('museums').insert(rows);
    if (insertError) {
      throw new Error(`Error inicializando datos en Supabase: ${insertError.message}`);
    }
  }
  supabaseSeeded = true;
}

export async function listMuseums(): Promise<Museum[]> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('museums')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) {
      throw new Error(`Error leyendo catálogo desde Supabase: ${error.message}`);
    }
    return (data ?? []) as Museum[];
  }

  const store = ensureLocalStore();
  return [...store.museums].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );
}

export async function getMuseumById(id: string): Promise<Museum | null> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('museums')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new Error(`Error consultando museo en Supabase: ${error.message}`);
    }
    return (data as Museum | null) ?? null;
  }

  const store = ensureLocalStore();
  return store.museums.find((m) => m.id === id) ?? null;
}

export async function createMuseum(input: MuseumInput): Promise<Museum> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('museums')
      .insert({
        ...input,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();
    if (error) {
      throw new Error(`Error creando museo en Supabase: ${error.message}`);
    }
    return data as Museum;
  }

  const store = ensureLocalStore();
  const created: Museum = {
    id: `mus-${crypto.randomUUID()}`,
    ...input,
    created_at: now,
    updated_at: now,
  };
  store.museums.push(created);
  atomicWriteLocalStore(store);
  return created;
}

export async function updateMuseum(
  id: string,
  input: MuseumInput
): Promise<Museum | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('museums')
      .update({
        ...input,
        updated_at: now,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) {
      throw new Error(`Error actualizando museo en Supabase: ${error.message}`);
    }
    return (data as Museum | null) ?? null;
  }

  const store = ensureLocalStore();
  const idx = store.museums.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  const updated: Museum = {
    ...store.museums[idx],
    ...input,
    id,
    updated_at: now,
  };
  store.museums[idx] = updated;
  atomicWriteLocalStore(store);
  return updated;
}

export async function deleteMuseum(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    await ensureSupabaseSeeded();
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('museums')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) {
      throw new Error(`Error eliminando museo en Supabase: ${error.message}`);
    }
    return Array.isArray(data) && data.length > 0;
  }

  const store = ensureLocalStore();
  const next = store.museums.filter((m) => m.id !== id);
  if (next.length === store.museums.length) return false;
  store.museums = next;
  atomicWriteLocalStore(store);
  return true;
}

export async function getStoredAdminHash(): Promise<string | null> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('admin_config')
      .select('passcode_hash')
      .eq('id', 'primary_admin')
      .maybeSingle();
    if (error) {
      throw new Error(`Error leyendo configuración de administrador: ${error.message}`);
    }
    return (data?.passcode_hash as string | undefined) ?? null;
  }

  const store = ensureLocalStore();
  return store.adminPasscodeHash;
}

export async function claimStoredAdminHash(passcodeHash: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const existing = await getStoredAdminHash();
    if (existing) return false;
    const { error } = await supabase.from('admin_config').insert({
      id: 'primary_admin',
      passcode_hash: passcodeHash,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return false;
    }
    return true;
  }

  const store = ensureLocalStore();
  if (store.adminPasscodeHash) return false;
  store.adminPasscodeHash = passcodeHash;
  atomicWriteLocalStore(store);
  return true;
}
