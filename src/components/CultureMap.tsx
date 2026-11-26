import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Clock,
  Compass,
  ExternalLink,
  MapPin,
  Phone,
  Ticket,
} from 'lucide-react';
import type { Museum } from '../types/culture.ts';

interface CultureMapProps {
  museums: Museum[];
  selectedMuseum: Museum | null;
  onSelectMuseum: (museum: Museum) => void;
  onInspectWikipedia: (museum: Museum) => void;
}

function formatPricePyg(price: number): string {
  if (price === 0) return 'Entrada gratuita';
  return `PYG ${price.toLocaleString('es-PY')}`;
}

export function CultureMap({
  museums,
  selectedMuseum,
  onSelectMuseum,
  onInspectWikipedia,
}: CultureMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [-25.282, -57.625],
      zoom: 13,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    museums.forEach((museum) => {
      const isSelected = selectedMuseum?.id === museum.id;
      const pinColor = isSelected ? '#9A3412' : '#1C1917';
      const ringSize = isSelected ? 34 : 26;

      const icon = L.divIcon({
        className: 'culturequest-pin',
        iconSize: [ringSize, ringSize],
        iconAnchor: [ringSize / 2, ringSize / 2],
        html: `<div style="width:${ringSize}px;height:${ringSize}px;border-radius:9999px;background:${pinColor};border:2.5px solid #FBF9F5;box-shadow:0 3px 10px rgba(28,25,23,0.28);display:flex;align-items:center;justify-content:center;color:#FBF9F5;font-size:11px;font-weight:600;cursor:pointer;transition:transform 150ms ease;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="M12 2 2 7h20z"/></svg>
        </div>`,
      });

      const marker = L.marker([museum.latitud, museum.longitud], { icon });
      marker.bindTooltip(museum.nombre, {
        direction: 'top',
        offset: [0, -14],
      });
      marker.on('click', () => {
        onSelectMuseum(museum);
      });
      marker.addTo(layer);
    });
  }, [museums, selectedMuseum, onSelectMuseum]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedMuseum) return;
    map.flyTo([selectedMuseum.latitud, selectedMuseum.longitud], 14, {
      duration: 0.65,
    });
  }, [selectedMuseum]);

  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map || museums.length === 0) return;
    const bounds = L.latLngBounds(
      museums.map((m) => [m.latitud, m.longitud] as [number, number])
    );
    map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
  };

  const handleFocusAsuncion = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([-25.2815, -57.628], 13, { duration: 0.65 });
  };

  return (
    <section
      id="mapa"
      className="py-16 sm:py-20 border-t border-stone-200 bg-[#F7F4EE]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#78716C] mb-2">
              Cartografía patrimonial
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917] text-balance">
              Mapa interactivo de ubicaciones culturales
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#57534E] max-w-2xl">
              Seleccioná cualquier marcador en el mapa para consultar su dirección, horarios,
              tarifa de ingreso y reseña histórica en Wikipedia.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFocusAsuncion}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-[#1C1917] bg-[#FBF9F5] border border-stone-300 rounded-md hover:border-[#1C1917] transition-colors whitespace-nowrap cursor-pointer"
            >
              Centrar en Asunción
            </button>
            <button
              type="button"
              onClick={handleFitAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-[#FBF9F5] bg-[#1C1917] hover:bg-[#9A3412] rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Ver todo Paraguay</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Interactive Map Viewport */}
          <div className="lg:col-span-8 bg-[#FBF9F5] border border-stone-200 rounded-lg overflow-hidden">
            <div
              ref={mapContainerRef}
              className="w-full h-[380px] sm:h-[460px] lg:h-[540px]"
              aria-label="Mapa interactivo de museos y sitios históricos de Paraguay"
            />
          </div>

          {/* Right Panel: Selected Location Details + Pin List */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {selectedMuseum ? (
              <div className="bg-[#FBF9F5] border border-stone-200 rounded-lg p-6">
                <div className="text-xs text-[#78716C] flex items-center gap-2 mb-2">
                  <span className="font-medium text-[#9A3412]">
                    {selectedMuseum.categoria}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">
                    {selectedMuseum.latitud.toFixed(4)}, {selectedMuseum.longitud.toFixed(4)}
                  </span>
                </div>

                <h3 className="font-serif text-2xl font-semibold text-[#1C1917] leading-tight">
                  {selectedMuseum.nombre}
                </h3>

                <p className="mt-3 text-sm text-[#57534E] leading-relaxed">
                  {selectedMuseum.descripcion}
                </p>

                <dl className="mt-5 pt-4 border-t border-stone-200 space-y-2.5 text-sm">
                  <div className="flex items-start gap-2.5 text-[#44403C]">
                    <MapPin className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
                    <dd>{selectedMuseum.direccion}</dd>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403C]">
                    <Clock className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
                    <dd>{selectedMuseum.horarios}</dd>
                  </div>
                  <div className="flex items-start gap-2.5 text-[#44403C]">
                    <Ticket className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
                    <dd className="tabular-nums font-medium">
                      {formatPricePyg(selectedMuseum.precio_entrada)}
                    </dd>
                  </div>
                  {selectedMuseum.contacto && (
                    <div className="flex items-start gap-2.5 text-[#44403C]">
                      <Phone className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
                      <dd>{selectedMuseum.contacto}</dd>
                    </div>
                  )}
                </dl>

                <button
                  type="button"
                  onClick={() => onInspectWikipedia(selectedMuseum)}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-[#FBF9F5] bg-[#9A3412] hover:bg-[#7C2D12] rounded-md transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Ver ficha cultural y Wikipedia</span>
                </button>
              </div>
            ) : (
              <div className="bg-[#FBF9F5] border border-stone-200 rounded-lg p-6 text-sm text-[#57534E]">
                Seleccioná una ubicación en el mapa o en la lista para ver su ficha completa.
              </div>
            )}

            {/* Compact Pin Directory */}
            <div className="bg-[#FBF9F5] border border-stone-200 rounded-lg p-4 flex-1 max-h-[260px] overflow-y-auto">
              <p className="text-xs uppercase tracking-widest text-[#78716C] px-2 pb-2 border-b border-stone-200 mb-2">
                Ubicaciones georreferenciadas ({museums.length})
              </p>
              <ul className="divide-y divide-stone-100">
                {museums.map((m) => {
                  const active = selectedMuseum?.id === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => onSelectMuseum(m)}
                        className={`w-full text-left px-2.5 py-2 rounded-md transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                          active
                            ? 'bg-[#F3EFE7] text-[#1C1917] font-medium'
                            : 'text-[#57534E] hover:bg-[#F7F4EE] hover:text-[#1C1917]'
                        }`}
                      >
                        <span className="text-sm truncate">{m.nombre}</span>
                        <span className="text-xs text-[#78716C] shrink-0">
                          {m.categoria}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
