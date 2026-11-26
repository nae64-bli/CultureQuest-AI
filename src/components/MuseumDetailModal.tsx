import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Clock,
  Coins,
  ExternalLink,
  Loader2,
  MapPin,
  Phone,
  RefreshCw,
  Ticket,
  X,
} from 'lucide-react';
import type { Museum, WikipediaInfo } from '../types/culture.ts';
import { MuseumImage } from './MuseumImage.tsx';

interface MuseumDetailModalProps {
  museum: Museum | null;
  onClose: () => void;
  onFocusMap: (museum: Museum) => void;
  onConvertPrice: (museum: Museum) => void;
}

function isSafeHttpsUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function MuseumDetailModal({
  museum,
  onClose,
  onFocusMap,
  onConvertPrice,
}: MuseumDetailModalProps) {
  const [wiki, setWiki] = useState<WikipediaInfo | null>(null);
  const [loadingWiki, setLoadingWiki] = useState(false);
  const [wikiError, setWikiError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!museum) return;

    const controller = new AbortController();
    setLoadingWiki(true);
    setWikiError(null);
    setWiki(null);

    const params = new URLSearchParams();
    if (museum.wikipedia_titulo) {
      params.set('title', museum.wikipedia_titulo);
    }
    params.set('query', museum.nombre);

    fetch(`/api/wikipedia?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const body = (await res.json()) as WikipediaInfo & { error?: string };
        if (!res.ok) {
          throw new Error(
            body.error || 'Error consultando la API de Wikipedia.'
          );
        }
        setWiki(body);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name === 'AbortError') return;
        setWikiError(
          err instanceof Error
            ? err.message
            : 'No se pudo conectar con Wikipedia.'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingWiki(false);
        }
      });

    return () => controller.abort();
  }, [museum, reloadKey]);

  useEffect(() => {
    if (!museum) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [museum, onClose]);

  if (!museum) return null;

  const displayImage =
    museum.imagen_url ||
    (wiki?.found && isSafeHttpsUrl(wiki.thumbnailUrl)
      ? wiki.thumbnailUrl
      : undefined);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#1C1917]/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="museum-detail-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#FBF9F5] border border-stone-300 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 py-4 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-stone-200">
          <div className="text-xs text-[#78716C] flex items-center gap-2 truncate">
            <span className="font-medium text-[#9A3412]">
              {museum.categoria}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {museum.latitud.toFixed(4)}, {museum.longitud.toFixed(4)}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha cultural"
            className="w-9 h-9 inline-flex items-center justify-center rounded-md border border-stone-200 text-[#57534E] hover:text-[#1C1917] hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Header + Visual */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-5 rounded-md overflow-hidden border border-stone-200 bg-[#F3EFE7]">
              <MuseumImage
                src={displayImage}
                alt={museum.nombre}
                categoria={museum.categoria}
                className="w-full h-56 sm:h-64"
              />
            </div>

            <div className="md:col-span-7 flex flex-col justify-between">
              <div>
                <h2
                  id="museum-detail-title"
                  className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917] leading-tight text-balance"
                >
                  {museum.nombre}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-[#44403C] leading-relaxed">
                  {museum.descripcion}
                </p>
              </div>

              <dl className="mt-5 pt-4 border-t border-stone-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2 text-[#44403C]">
                  <MapPin className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
                  <dd>{museum.direccion}</dd>
                </div>
                <div className="flex items-start gap-2 text-[#44403C]">
                  <Clock className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
                  <dd>{museum.horarios}</dd>
                </div>
                <div className="flex items-start gap-2 text-[#44403C]">
                  <Ticket className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
                  <dd className="font-medium tabular-nums">
                    {museum.precio_entrada === 0
                      ? 'Entrada gratuita'
                      : `PYG ${museum.precio_entrada.toLocaleString('es-PY')}`}
                  </dd>
                </div>
                <div className="flex items-start gap-2 text-[#44403C]">
                  <Phone className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
                  <dd>{museum.contacto || 'Sin contacto registrado'}</dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onFocusMap(museum);
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-[#FBF9F5] bg-[#1C1917] hover:bg-[#9A3412] rounded-md transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Ubicar en el mapa</span>
                </button>
                {museum.precio_entrada > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onConvertPrice(museum);
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-[#1C1917] bg-[#F3EFE7] hover:bg-stone-200 border border-stone-300 rounded-md transition-colors cursor-pointer"
                  >
                    <Coins className="w-4 h-4 text-[#9A3412]" />
                    <span>Convertir entrada a otra moneda</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Wikipedia Section */}
          <div className="pt-6 border-t border-stone-200">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#9A3412]" />
                <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                  Contexto histórico y enciclopédico (Wikipedia)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                disabled={loadingWiki}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] border border-stone-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingWiki ? 'animate-spin' : ''}`}
                />
                <span>Actualizar</span>
              </button>
            </div>

            {loadingWiki && (
              <div className="flex items-center gap-3 p-5 bg-[#F7F4EE] border border-stone-200 rounded-md text-sm text-[#57534E]">
                <Loader2 className="w-4 h-4 animate-spin text-[#9A3412]" />
                <span>Consultando archivo histórico en Wikipedia...</span>
              </div>
            )}

            {!loadingWiki && wikiError && (
              <div className="flex items-start gap-3 p-5 bg-red-50 border border-red-200 rounded-md text-sm text-red-900">
                <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    No se pudo consultar la API de Wikipedia
                  </p>
                  <p className="mt-1 text-red-800">{wikiError}</p>
                </div>
              </div>
            )}

            {!loadingWiki && !wikiError && wiki && !wiki.found && (
              <div className="p-5 bg-[#F7F4EE] border border-stone-200 rounded-md text-sm text-[#57534E]">
                No se encontró un artículo enciclopédico exacto en Wikipedia en español para{' '}
                <strong className="text-[#1C1917]">{wiki.title}</strong>. No se muestran
                datos históricos inventados.
              </div>
            )}

            {!loadingWiki && !wikiError && wiki && wiki.found && (
              <div className="p-6 bg-[#F7F4EE] border border-stone-200 rounded-md">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {isSafeHttpsUrl(wiki.thumbnailUrl) && (
                    <img
                      src={wiki.thumbnailUrl}
                      alt={`Fotografía de Wikipedia sobre ${wiki.title}`}
                      referrerPolicy="no-referrer"
                      className="w-full sm:w-44 h-40 object-cover rounded-md border border-stone-200 shrink-0 bg-stone-200"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-widest text-[#78716C]">
                      Fuente: Wikipedia en español
                    </p>
                    <h4 className="font-serif text-xl font-semibold text-[#1C1917] mt-1">
                      {wiki.title}
                    </h4>
                    {wiki.description && (
                      <p className="text-xs text-[#78716C] mt-0.5 italic">
                        {wiki.description}
                      </p>
                    )}
                    <p className="mt-3 text-sm sm:text-base text-[#292524] leading-relaxed">
                      {wiki.extract}
                    </p>
                    {isSafeHttpsUrl(wiki.pageUrl) && (
                      <a
                        href={wiki.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#9A3412] hover:text-[#7C2D12] underline underline-offset-4"
                      >
                        <span>Leer artículo completo en Wikipedia</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
