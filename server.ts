import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import type {
  CurrencyRatesResponse,
  MuseumCategory,
  MuseumInput,
  WikipediaInfo,
} from './src/types/culture.ts';
import {
  createMuseum,
  deleteMuseum,
  getMuseumById,
  getStorageBackend,
  listMuseums,
  updateMuseum,
} from './src/server/db.ts';
import {
  claimInitialAdminPasscode,
  extractBearerToken,
  getAdminMode,
  requireAdmin,
  signAdminToken,
  verifyAdminPasscode,
  verifyAdminToken,
} from './src/server/auth.ts';

const PORT = Number(process.env.PORT) || 3000;
const ALLOWED_CATEGORIES: MuseumCategory[] = [
  'Museo',
  'Galería',
  'Sitio Histórico',
  'Centro Cultural',
];

function isSafeImageUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith('/src/assets/')) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function validateMuseumPayload(
  body: unknown
): { ok: true; data: MuseumInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Cuerpo de solicitud inválido.' };
  }
  const raw = body as Record<string, unknown>;

  const nombre = typeof raw.nombre === 'string' ? raw.nombre.trim() : '';
  const descripcion =
    typeof raw.descripcion === 'string' ? raw.descripcion.trim() : '';
  const direccion =
    typeof raw.direccion === 'string' ? raw.direccion.trim() : '';
  const contacto = typeof raw.contacto === 'string' ? raw.contacto.trim() : '';
  const horarios = typeof raw.horarios === 'string' ? raw.horarios.trim() : '';
  const categoria =
    typeof raw.categoria === 'string' ? raw.categoria.trim() : '';
  const wikipedia_titulo =
    typeof raw.wikipedia_titulo === 'string'
      ? raw.wikipedia_titulo.trim()
      : '';
  const imagen_url =
    typeof raw.imagen_url === 'string' ? raw.imagen_url.trim() : '';

  const precio_entrada = Number(raw.precio_entrada);
  const latitud = Number(raw.latitud);
  const longitud = Number(raw.longitud);

  if (nombre.length < 3 || nombre.length > 160) {
    return { ok: false, error: 'El nombre debe tener entre 3 y 160 caracteres.' };
  }
  if (descripcion.length < 10 || descripcion.length > 2000) {
    return {
      ok: false,
      error: 'La descripción debe tener entre 10 y 2000 caracteres.',
    };
  }
  if (direccion.length < 4 || direccion.length > 240) {
    return {
      ok: false,
      error: 'La dirección debe tener entre 4 y 240 caracteres.',
    };
  }
  if (contacto.length > 160) {
    return { ok: false, error: 'El contacto no puede superar 160 caracteres.' };
  }
  if (horarios.length < 3 || horarios.length > 160) {
    return {
      ok: false,
      error: 'Los horarios deben tener entre 3 y 160 caracteres.',
    };
  }
  if (!ALLOWED_CATEGORIES.includes(categoria as MuseumCategory)) {
    return { ok: false, error: 'Categoría cultural inválida.' };
  }
  if (
    !Number.isFinite(precio_entrada) ||
    precio_entrada < 0 ||
    precio_entrada > 100_000_000
  ) {
    return {
      ok: false,
      error: 'El precio de entrada debe ser un monto válido en Guaraníes (>= 0).',
    };
  }
  if (!Number.isFinite(latitud) || latitud < -90 || latitud > 90) {
    return { ok: false, error: 'La latitud debe estar entre -90 y 90.' };
  }
  if (!Number.isFinite(longitud) || longitud < -180 || longitud > 180) {
    return { ok: false, error: 'La longitud debe estar entre -180 y 180.' };
  }
  if (wikipedia_titulo.length > 180) {
    return {
      ok: false,
      error: 'El título de Wikipedia no puede superar 180 caracteres.',
    };
  }
  if (!isSafeImageUrl(imagen_url)) {
    return {
      ok: false,
      error: 'La URL de la imagen debe usar protocolo http(s) o una ruta local válida.',
    };
  }

  return {
    ok: true,
    data: {
      nombre,
      descripcion,
      direccion,
      contacto,
      horarios,
      precio_entrada: Math.round(precio_entrada),
      categoria: categoria as MuseumCategory,
      latitud,
      longitud,
      wikipedia_titulo,
      imagen_url,
    },
  };
}

let cachedCurrency: { data: CurrencyRatesResponse; fetchedAt: number } | null =
  null;
const CURRENCY_CACHE_TTL_MS = 1000 * 60 * 30;

async function fetchWikipediaSummaryByTitle(
  rawTitle: string
): Promise<WikipediaInfo | null> {
  const cleanTitle = rawTitle.trim().slice(0, 180);
  if (!cleanTitle) return null;

  const restUrl = `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    cleanTitle.replace(/\s+/g, '_')
  )}`;

  const response = await fetch(restUrl, {
    headers: {
      'User-Agent': 'CultureQuestAI/1.0 (https://culturequest.local)',
      Accept: 'application/json',
    },
  });

  if (response.ok) {
    const data = (await response.json()) as {
      type?: string;
      title?: string;
      description?: string;
      extract?: string;
      thumbnail?: { source?: string };
      originalimage?: { source?: string };
      content_urls?: { desktop?: { page?: string } };
    };
    if (data.type === 'disambiguation' || !data.extract) {
      return null;
    }
    return {
      found: true,
      title: data.title ?? cleanTitle,
      description: data.description,
      extract: data.extract,
      thumbnailUrl: data.thumbnail?.source ?? data.originalimage?.source,
      pageUrl:
        data.content_urls?.desktop?.page ??
        `https://es.wikipedia.org/wiki/${encodeURIComponent(
          (data.title ?? cleanTitle).replace(/\s+/g, '_')
        )}`,
    };
  }

  return null;
}

async function searchWikipediaTitle(query: string): Promise<string | null> {
  const cleanQuery = query.trim().slice(0, 180);
  if (!cleanQuery) return null;

  const searchUrl = new URL('https://es.wikipedia.org/w/api.php');
  searchUrl.searchParams.set('action', 'query');
  searchUrl.searchParams.set('list', 'search');
  searchUrl.searchParams.set('srsearch', `${cleanQuery} Paraguay`);
  searchUrl.searchParams.set('srlimit', '3');
  searchUrl.searchParams.set('format', 'json');

  const response = await fetch(searchUrl.toString(), {
    headers: {
      'User-Agent': 'CultureQuestAI/1.0 (https://culturequest.local)',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia respondió con estado ${response.status}`);
  }

  const data = (await response.json()) as {
    query?: { search?: Array<{ title?: string }> };
  };
  return data.query?.search?.[0]?.title ?? null;
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, storage: getStorageBackend() });
  });

  // --- Admin Auth Endpoints ---
  app.get('/api/admin/status', async (req: Request, res: Response) => {
    try {
      const mode = await getAdminMode();
      const token = extractBearerToken(req);
      const authenticated = Boolean(token && verifyAdminToken(token));
      res.json({
        mode,
        authenticated,
        storageBackend: getStorageBackend(),
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
      res.status(500).json({ error: 'No se pudo verificar el estado de administración.' });
    }
  });

  app.post('/api/admin/claim', async (req: Request, res: Response) => {
    try {
      const passcode =
        typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
      if (passcode.length < 8 || passcode.length > 128) {
        res.status(400).json({
          error: 'La contraseña de administrador debe tener al menos 8 caracteres.',
        });
        return;
      }
      const mode = await getAdminMode();
      if (mode !== 'claim_required') {
        res.status(409).json({
          error: 'La contraseña de administrador ya fue configurada.',
        });
        return;
      }
      const claimed = await claimInitialAdminPasscode(passcode);
      if (!claimed) {
        res.status(409).json({
          error: 'No se pudo reclamar la contraseña porque ya existe una activa.',
        });
        return;
      }
      const session = signAdminToken();
      res.status(201).json(session);
    } catch (error) {
      console.error('Error claiming admin passcode:', error);
      res.status(500).json({ error: 'Error al configurar la clave de administrador.' });
    }
  });

  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const passcode =
        typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
      if (!passcode) {
        res.status(400).json({ error: 'Ingresá la contraseña de administrador.' });
        return;
      }
      const mode = await getAdminMode();
      if (mode === 'claim_required') {
        res.status(409).json({
          error: 'Primero debés crear una contraseña inicial de administrador.',
        });
        return;
      }
      const valid = await verifyAdminPasscode(passcode);
      if (!valid) {
        res.status(401).json({ error: 'Contraseña de administrador incorrecta.' });
        return;
      }
      const session = signAdminToken();
      res.json(session);
    } catch (error) {
      console.error('Error logging in admin:', error);
      res.status(500).json({ error: 'Error al iniciar sesión de administrador.' });
    }
  });

  // --- Museums Catalog CRUD ---
  app.get('/api/museums', async (req: Request, res: Response) => {
    try {
      const q =
        typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
      const categoria =
        typeof req.query.categoria === 'string'
          ? req.query.categoria.trim()
          : '';
      const precio =
        typeof req.query.precio === 'string' ? req.query.precio.trim() : '';

      let items = await listMuseums();

      if (q) {
        items = items.filter(
          (m) =>
            m.nombre.toLowerCase().includes(q) ||
            m.descripcion.toLowerCase().includes(q) ||
            m.direccion.toLowerCase().includes(q) ||
            m.categoria.toLowerCase().includes(q)
        );
      }
      if (categoria && categoria !== 'Todas') {
        items = items.filter((m) => m.categoria === categoria);
      }
      if (precio === 'gratis') {
        items = items.filter((m) => m.precio_entrada === 0);
      } else if (precio === 'pago') {
        items = items.filter((m) => m.precio_entrada > 0);
      }

      res.json(items);
    } catch (error) {
      console.error('Error listing museums:', error);
      res.status(500).json({ error: 'Error al cargar el catálogo cultural.' });
    }
  });

  app.get('/api/museums/:id', async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id ?? '');
      const item = await getMuseumById(id);
      if (!item) {
        res.status(404).json({ error: 'Espacio cultural no encontrado.' });
        return;
      }
      res.json(item);
    } catch (error) {
      console.error('Error getting museum:', error);
      res.status(500).json({ error: 'Error al consultar el espacio cultural.' });
    }
  });

  app.post('/api/museums', requireAdmin, async (req: Request, res: Response) => {
    const validation = validateMuseumPayload(req.body);
    if (!validation.ok) {
      res.status(400).json({ error: validation.error });
      return;
    }
    try {
      const created = await createMuseum(validation.data);
      res.status(201).json(created);
    } catch (error) {
      console.error('Error creating museum:', error);
      res.status(500).json({ error: 'No se pudo guardar el nuevo espacio cultural.' });
    }
  });

  app.put(
    '/api/museums/:id',
    requireAdmin,
    async (req: Request, res: Response) => {
      const validation = validateMuseumPayload(req.body);
      if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
      }
      try {
        const id = String(req.params.id ?? '');
        const updated = await updateMuseum(id, validation.data);
        if (!updated) {
          res.status(404).json({ error: 'Espacio cultural no encontrado.' });
          return;
        }
        res.json(updated);
      } catch (error) {
        console.error('Error updating museum:', error);
        res.status(500).json({ error: 'No se pudo actualizar el espacio cultural.' });
      }
    }
  );

  app.delete(
    '/api/museums/:id',
    requireAdmin,
    async (req: Request, res: Response) => {
      try {
        const id = String(req.params.id ?? '');
        const deleted = await deleteMuseum(id);
        if (!deleted) {
          res.status(404).json({ error: 'Espacio cultural no encontrado.' });
          return;
        }
        res.json({ deleted: true, id });
      } catch (error) {
        console.error('Error deleting museum:', error);
        res.status(500).json({ error: 'No se pudo eliminar el espacio cultural.' });
      }
    }
  );

  // --- Live Wikipedia Cultural Lookup ---
  app.get('/api/wikipedia', async (req: Request, res: Response) => {
    const title =
      typeof req.query.title === 'string' ? req.query.title.trim() : '';
    const fallbackQuery =
      typeof req.query.query === 'string' ? req.query.query.trim() : '';

    if (!title && !fallbackQuery) {
      res.status(400).json({
        error: 'Se requiere el parámetro title o query para consultar Wikipedia.',
      });
      return;
    }

    try {
      let info: WikipediaInfo | null = null;
      if (title) {
        info = await fetchWikipediaSummaryByTitle(title);
      }
      if (!info && fallbackQuery) {
        const foundTitle = await searchWikipediaTitle(fallbackQuery);
        if (foundTitle) {
          info = await fetchWikipediaSummaryByTitle(foundTitle);
        }
      }
      if (!info) {
        res.json({
          found: false,
          title: title || fallbackQuery,
        } satisfies WikipediaInfo);
        return;
      }
      res.json(info);
    } catch (error) {
      console.error('Wikipedia API error:', error);
      res.status(502).json({
        error:
          'No se pudo obtener la ficha histórica desde Wikipedia en este momento.',
      });
    }
  });

  // --- Live Currency Conversion (Base PYG) ---
  app.get('/api/currency', async (_req: Request, res: Response) => {
    try {
      if (
        cachedCurrency &&
        Date.now() - cachedCurrency.fetchedAt < CURRENCY_CACHE_TTL_MS
      ) {
        res.json(cachedCurrency.data);
        return;
      }

      const upstream = await fetch('https://open.er-api.com/v6/latest/PYG', {
        headers: {
          'User-Agent': 'CultureQuestAI/1.0',
          Accept: 'application/json',
        },
      });
      if (!upstream.ok) {
        throw new Error(`ExchangeRate API devolvió ${upstream.status}`);
      }
      const payload = (await upstream.json()) as {
        result?: string;
        time_last_update_utc?: string;
        rates?: Record<string, number>;
      };

      if (payload.result !== 'success' || !payload.rates) {
        throw new Error('Respuesta inválida del proveedor de tipos de cambio.');
      }

      const selectedRates: Record<string, number> = {
        PYG: 1,
        USD: payload.rates.USD,
        EUR: payload.rates.EUR,
        BRL: payload.rates.BRL,
        ARS: payload.rates.ARS,
        GBP: payload.rates.GBP,
        CLP: payload.rates.CLP,
        UYU: payload.rates.UYU,
      };

      const result: CurrencyRatesResponse = {
        base: 'PYG',
        updatedAt: payload.time_last_update_utc ?? new Date().toISOString(),
        provider: 'ExchangeRate-API (tasas de mercado en tiempo real)',
        rates: selectedRates,
      };

      cachedCurrency = { data: result, fetchedAt: Date.now() };
      res.json(result);
    } catch (error) {
      console.error('Currency API error:', error);
      res.status(502).json({
        error:
          'No se pudieron consultar los tipos de cambio reales en este momento.',
      });
    }
  });

  // --- Gemini AI Cultural Assistant (Live Catalog Grounded) ---
  app.post('/api/chat', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          'Falta configurar la variable GEMINI_API_KEY en el servidor para habilitar el asistente inteligente.',
      });
      return;
    }

    const message =
      typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    const rawHistory = Array.isArray(req.body?.history)
      ? (req.body.history as Array<{ role?: string; content?: string }>)
      : [];

    if (!message || message.length > 2000) {
      res.status(400).json({
        error: 'Escribí una consulta válida (entre 1 y 2000 caracteres).',
      });
      return;
    }

    try {
      const catalog = await listMuseums();
      const catalogContext = catalog.map((m) => ({
        nombre: m.nombre,
        categoria: m.categoria,
        direccion: m.direccion,
        contacto: m.contacto,
        horarios: m.horarios,
        precio_entrada_pyg: m.precio_entrada,
        coordenadas: { lat: m.latitud, lng: m.longitud },
        descripcion: m.descripcion,
      }));

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const systemInstruction = [
        'Sos el asistente curatorial de CultureQuest AI, especializado en museos, galerías, centros culturales y sitios históricos del Paraguay.',
        'Respondé siempre en español claro, preciso y respetuoso del rigor histórico.',
        'Tenés acceso en tiempo real al catálogo oficial cargado actualmente en la base de datos de CultureQuest AI:',
        JSON.stringify(catalogContext, null, 2),
        'Reglas estrictas:',
        '1. Cuando el usuario pregunte por horarios, precios de entrada, direcciones, contactos, ubicaciones o recomendaciones del catálogo, usá exactamente los datos del catálogo JSON provisto arriba. Si un sitio no figura en el catálogo, aclaralo con honestidad.',
        '2. Podés responder preguntas abiertas sobre historia, arte y patrimonio cultural del Paraguay combinando tu conocimiento cultural con las referencias del catálogo.',
        '3. Nunca inventes teléfonos, horarios ni precios de entrada que no figuren en el catálogo.',
        '4. Mantené las respuestas concisas, bien estructuradas y útiles para planificar una visita.',
      ].join('\n\n');

      const formattedHistory = rawHistory
        .slice(-10)
        .filter(
          (item) =>
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string' &&
            item.content.trim().length > 0
        )
        .map((item) => ({
          role: item.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: item.content!.trim().slice(0, 2000) }],
        }));

      const contents = [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        throw new Error('El modelo no devolvió texto.');
      }

      res.json({ reply });
    } catch (error) {
      console.error('Gemini chat error:', error);
      res.status(500).json({
        error:
          'El asistente Gemini no pudo procesar la consulta en este momento. Intentá nuevamente.',
      });
    }
  });

  // --- Vite / Static Frontend ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CultureQuest AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
