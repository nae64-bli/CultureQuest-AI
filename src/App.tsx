import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Search,
} from 'lucide-react';
import type { Museum } from './types/culture.ts';
import { Header } from './components/Header.tsx';
import { MuseumImage } from './components/MuseumImage.tsx';
import { CultureMap } from './components/CultureMap.tsx';
import { MuseumDetailModal } from './components/MuseumDetailModal.tsx';
import { CurrencyConverter } from './components/CurrencyConverter.tsx';
import { GeminiChatDrawer } from './components/GeminiChatDrawer.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';

const CATEGORY_TABS = [
  'Todas',
  'Museo',
  'Galería',
  'Sitio Histórico',
  'Centro Cultural',
] as const;

export default function App() {
  const [museums, setMuseums] = useState<Museum[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Catalog filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [priceFilter, setPriceFilter] = useState<'todos' | 'gratis' | 'pago'>(
    'todos'
  );

  // Interactive states
  const [mapSelectedMuseum, setMapSelectedMuseum] = useState<Museum | null>(
    null
  );
  const [detailMuseum, setDetailMuseum] = useState<Museum | null>(null);
  const [converterMuseumId, setConverterMuseumId] = useState<string>('');
  const [chatOpen, setChatOpen] = useState(false);

  const loadMuseums = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/museums');
      const body = (await res.json()) as Museum[] & { error?: string };
      if (!res.ok) {
        throw new Error(body.error || 'No se pudo cargar el catálogo cultural.');
      }
      setMuseums(body);
      setMapSelectedMuseum((prev) => {
        if (prev) {
          return body.find((m) => m.id === prev.id) ?? body[0] ?? null;
        }
        return body[0] ?? null;
      });
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Error al conectar con el catálogo.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMuseums();
  }, [loadMuseums]);

  const filteredMuseums = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return museums.filter((m) => {
      const matchesSearch =
        !q ||
        m.nombre.toLowerCase().includes(q) ||
        m.descripcion.toLowerCase().includes(q) ||
        m.direccion.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === 'Todas' || m.categoria === selectedCategory;
      const matchesPrice =
        priceFilter === 'todos' ||
        (priceFilter === 'gratis' && m.precio_entrada === 0) ||
        (priceFilter === 'pago' && m.precio_entrada > 0);
      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [museums, searchQuery, selectedCategory, priceFilter]);

  const stats = useMemo(() => {
    const freeCount = museums.filter((m) => m.precio_entrada === 0).length;
    const paidCount = museums.filter((m) => m.precio_entrada > 0).length;
    const categoriesCount = new Set(museums.map((m) => m.categoria)).size;
    return {
      total: museums.length,
      freeCount,
      paidCount,
      categoriesCount,
    };
  }, [museums]);

  const handleFocusOnMap = (museum: Museum) => {
    setMapSelectedMuseum(museum);
    document.getElementById('mapa')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleConvertPrice = (museum: Museum) => {
    setConverterMuseumId(museum.id);
    document
      .getElementById('conversor')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917]">
      <Header onOpenChat={() => setChatOpen(true)} />

      <main className="flex-1">
        {/* Institutional Hero Section */}
        <section id="inicio" className="py-12 sm:py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
              <div className="lg:col-span-6 flex flex-col justify-center">
                <p className="text-xs uppercase tracking-widest text-[#78716C] mb-3">
                  Archivo cultural del Paraguay
                </p>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold text-[#1C1917] leading-[1.08] tracking-tight text-balance">
                  Explorá museos, galerías y lugares históricos de Paraguay
                </h1>
                <p className="mt-5 text-base sm:text-lg text-[#57534E] leading-relaxed max-w-xl">
                  Descubrí el patrimonio artístico y arquitectónico del país con fichas
                  verificadas, cartografía interactiva, consulta enciclopédica en
                  Wikipedia, conversión real de tarifas y guía asistida por Gemini.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a
                    href="#catalogo"
                    className="px-6 py-3 text-sm font-medium text-[#FBF9F5] bg-[#9A3412] hover:bg-[#7C2D12] rounded-md transition-colors whitespace-nowrap"
                  >
                    Explorar catálogo
                  </a>
                  <a
                    href="#mapa"
                    className="px-6 py-3 text-sm font-medium text-[#1C1917] bg-[#F3EFE7] hover:bg-stone-200 border border-stone-300 rounded-md transition-colors whitespace-nowrap"
                  >
                    Ver mapa cultural
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6 flex flex-col">
                <div className="flex-1 rounded-lg overflow-hidden border border-stone-200 bg-[#F3EFE7] min-h-[280px]">
                  <img
                    src="/src/assets/images/hero_paraguay_heritage_1795698710875.jpg"
                    alt="Palacio de los López en Asunción, Paraguay al atardecer"
                    referrerPolicy="no-referrer"
                    className="w-full h-full lg:h-full object-cover"
                  />
                </div>
                <p className="mt-2.5 text-xs font-serif italic text-[#78716C]">
                  Fig. 1 — Palacio de los López, Centro Histórico de Asunción. Patrimonio
                  arquitectónico neoclásico del siglo XIX.
                </p>
              </div>
            </div>

            {/* Operational Summary Strip */}
            <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 border border-stone-200 rounded-lg bg-[#F7F4EE] divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
              <div className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-widest text-[#78716C]">
                  Espacios en catálogo
                </p>
                <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold text-[#1C1917] tabular-nums">
                  {stats.total}
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-widest text-[#78716C]">
                  Acceso gratuito
                </p>
                <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold text-[#1C1917] tabular-nums">
                  {stats.freeCount}
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-widest text-[#78716C]">
                  Con tarifa en PYG
                </p>
                <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold text-[#1C1917] tabular-nums">
                  {stats.paidCount}
                </p>
              </div>
              <div className="p-5 sm:p-6">
                <p className="text-xs uppercase tracking-widest text-[#78716C]">
                  Categorías curadas
                </p>
                <p className="mt-2 font-mono text-2xl sm:text-3xl font-semibold text-[#1C1917] tabular-nums">
                  {stats.categoriesCount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Catalog Section */}
        <section
          id="catalogo"
          className="py-16 sm:py-20 border-t border-stone-200 bg-[#FBF9F5]"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#78716C] mb-2">
                  Colección nacional
                </p>
                <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917] text-balance">
                  Catálogo de espacios culturales
                </h2>
              </div>
              <p className="text-sm text-[#57534E] tabular-nums">
                Mostrando {filteredMuseums.length} de {museums.length} ubicaciones
              </p>
            </div>

            {/* Search & Filter Controls */}
            <div className="mb-10 pb-6 border-b border-stone-200 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-[#78716C] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar museo, dirección o descripción..."
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F7F4EE] border border-stone-300 rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#9A3412]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Interactive Category Segmented Tabs */}
                <div
                  role="tablist"
                  aria-label="Filtrar por categoría"
                  className="flex flex-wrap items-center gap-1 p-1 bg-[#F3EFE7] border border-stone-200 rounded-md"
                >
                  {CATEGORY_TABS.map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs border border-stone-200'
                            : 'text-[#57534E] hover:text-[#1C1917]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                <select
                  aria-label="Filtrar por precio de entrada"
                  value={priceFilter}
                  onChange={(e) =>
                    setPriceFilter(
                      e.target.value as 'todos' | 'gratis' | 'pago'
                    )
                  }
                  className="px-3 py-2 text-xs font-medium bg-[#F7F4EE] border border-stone-300 rounded-md text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#9A3412]"
                >
                  <option value="todos">Cualquier precio</option>
                  <option value="gratis">Entrada gratuita</option>
                  <option value="pago">Entrada arancelada</option>
                </select>
              </div>
            </div>

            {loading && (
              <div className="py-16 flex items-center justify-center gap-3 text-sm text-[#57534E]">
                <Loader2 className="w-5 h-5 animate-spin text-[#9A3412]" />
                <span>Cargando catálogo cultural...</span>
              </div>
            )}

            {!loading && loadError && (
              <div className="p-6 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-sm text-red-900">
                <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">No se pudo cargar el catálogo</p>
                  <p className="mt-1">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => void loadMuseums()}
                    className="mt-3 px-4 py-2 text-xs font-medium bg-red-800 text-white rounded-md cursor-pointer"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {!loading && !loadError && filteredMuseums.length === 0 && (
              <div className="py-14 px-6 text-center bg-[#F7F4EE] border border-stone-200 rounded-lg">
                <p className="font-serif text-2xl text-[#1C1917]">
                  No encontramos coincidencias en el catálogo
                </p>
                <p className="mt-2 text-sm text-[#57534E]">
                  Probá limpiar la búsqueda o seleccionar otra categoría cultural.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('Todas');
                    setPriceFilter('todos');
                  }}
                  className="mt-4 px-4 py-2 text-xs font-medium text-[#FBF9F5] bg-[#1C1917] rounded-md cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            )}

            {!loading && !loadError && filteredMuseums.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMuseums.map((museum) => (
                  <article
                    key={museum.id}
                    className="flex flex-col bg-[#FBF9F5] border border-stone-200 rounded-lg overflow-hidden hover:border-stone-400 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => setDetailMuseum(museum)}
                      className="block w-full text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9A3412]"
                    >
                      <MuseumImage
                        src={museum.imagen_url}
                        alt={museum.nombre}
                        categoria={museum.categoria}
                        className="w-full h-52"
                      />
                    </button>

                    <div className="p-6 flex-1 flex flex-col">
                      {/* Zero-pill unboxed metadata */}
                      <div className="flex items-center gap-2 text-xs text-[#78716C]">
                        <span className="font-medium text-[#9A3412]">
                          {museum.categoria}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-[#1C1917]">
                          {museum.precio_entrada === 0
                            ? 'Entrada gratuita'
                            : `PYG ${museum.precio_entrada.toLocaleString('es-PY')}`}
                        </span>
                      </div>

                      <h3 className="mt-2 font-serif text-2xl font-semibold text-[#1C1917] leading-snug">
                        <button
                          type="button"
                          onClick={() => setDetailMuseum(museum)}
                          className="text-left hover:text-[#9A3412] transition-colors cursor-pointer"
                        >
                          {museum.nombre}
                        </button>
                      </h3>

                      <p className="mt-2.5 text-sm text-[#57534E] leading-relaxed line-clamp-3">
                        {museum.descripcion}
                      </p>

                      <dl className="mt-4 pt-4 border-t border-stone-200 space-y-2 text-xs text-[#44403C]">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-[#78716C] shrink-0 mt-0.5" />
                          <dd className="line-clamp-2">{museum.direccion}</dd>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#78716C] shrink-0 mt-0.5" />
                          <dd>{museum.horarios}</dd>
                        </div>
                        {museum.contacto && (
                          <div className="flex items-start gap-2">
                            <Phone className="w-3.5 h-3.5 text-[#78716C] shrink-0 mt-0.5" />
                            <dd className="truncate">{museum.contacto}</dd>
                          </div>
                        )}
                      </dl>

                      <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setDetailMuseum(museum)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9A3412] hover:text-[#7C2D12] cursor-pointer"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Ficha y Wikipedia</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFocusOnMap(museum)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Ubicar en mapa</span>
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Interactive Map Section */}
        <CultureMap
          museums={filteredMuseums.length > 0 ? filteredMuseums : museums}
          selectedMuseum={mapSelectedMuseum}
          onSelectMuseum={setMapSelectedMuseum}
          onInspectWikipedia={(museum) => setDetailMuseum(museum)}
        />

        {/* Real-time Currency Converter Section */}
        <CurrencyConverter
          museums={museums}
          selectedMuseumId={converterMuseumId}
          onSelectMuseumId={setConverterMuseumId}
        />

        {/* Protected Administration Section */}
        <AdminPanel museums={museums} onRefreshMuseums={loadMuseums} />
      </main>

      {/* Editorial Footer */}
      <footer className="border-t border-stone-200 bg-[#FBF9F5] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 text-xs text-[#78716C]">
          <div>
            <p className="font-serif text-base font-semibold text-[#1C1917]">
              CultureQuest AI
            </p>
            <p className="mt-1">
              Sistema cultural de museos, galerías y sitios históricos del Paraguay.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <a href="#catalogo" className="hover:text-[#1C1917]">
              Catálogo
            </a>
            <a href="#mapa" className="hover:text-[#1C1917]">
              Mapa
            </a>
            <a href="#conversor" className="hover:text-[#1C1917]">
              Conversor
            </a>
            <a href="#admin" className="hover:text-[#1C1917]">
              Administración
            </a>
          </div>
        </div>
      </footer>

      {/* Live Wikipedia & Detail Modal */}
      <MuseumDetailModal
        museum={detailMuseum}
        onClose={() => setDetailMuseum(null)}
        onFocusMap={handleFocusOnMap}
        onConvertPrice={handleConvertPrice}
      />

      {/* Gemini AI Cultural Assistant Drawer */}
      <GeminiChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
