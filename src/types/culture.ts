export type MuseumCategory =
  | 'Museo'
  | 'Galería'
  | 'Sitio Histórico'
  | 'Centro Cultural';

export interface Museum {
  id: string;
  nombre: string;
  descripcion: string;
  direccion: string;
  contacto: string;
  horarios: string;
  precio_entrada: number;
  categoria: MuseumCategory;
  latitud: number;
  longitud: number;
  wikipedia_titulo: string;
  imagen_url: string;
  created_at: string;
  updated_at: string;
}

export type MuseumInput = Omit<Museum, 'id' | 'created_at' | 'updated_at'>;

export interface WikipediaInfo {
  found: boolean;
  title: string;
  description?: string;
  extract?: string;
  thumbnailUrl?: string;
  pageUrl?: string;
}

export interface CurrencyRatesResponse {
  base: string;
  updatedAt: string;
  provider: string;
  rates: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AdminStatusResponse {
  mode: 'env' | 'claimed' | 'claim_required';
  authenticated: boolean;
  storageBackend: 'supabase' | 'local';
}
