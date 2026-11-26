import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRightLeft, Loader2, RefreshCw } from 'lucide-react';
import type { CurrencyRatesResponse, Museum } from '../types/culture.ts';

interface CurrencyConverterProps {
  museums: Museum[];
  selectedMuseumId: string;
  onSelectMuseumId: (id: string) => void;
}

const CURRENCY_META: Array<{ code: string; name: string; symbol: string }> = [
  { code: 'USD', name: 'Dólar estadounidense', symbol: 'US$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$' },
  { code: 'ARS', name: 'Peso argentino', symbol: 'AR$' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£' },
  { code: 'CLP', name: 'Peso chileno', symbol: 'CL$' },
  { code: 'UYU', name: 'Peso uruguayo', symbol: 'UY$' },
];

export function CurrencyConverter({
  museums,
  selectedMuseumId,
  onSelectMuseumId,
}: CurrencyConverterProps) {
  const [ratesData, setRatesData] = useState<CurrencyRatesResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amountPyg, setAmountPyg] = useState<string>('50000');
  const [targetCurrency, setTargetCurrency] = useState<string>('USD');

  const fetchRates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/currency');
      const body = (await res.json()) as CurrencyRatesResponse & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(
          body.error || 'No se pudieron obtener las cotizaciones.'
        );
      }
      setRatesData(body);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error consultando el servicio de monedas.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  useEffect(() => {
    if (!selectedMuseumId) return;
    const found = museums.find((m) => m.id === selectedMuseumId);
    if (found) {
      setAmountPyg(String(found.precio_entrada));
    }
  }, [selectedMuseumId, museums]);

  const numericPyg = Math.max(0, Number(amountPyg) || 0);
  const activeRate = ratesData?.rates?.[targetCurrency];
  const convertedPrimary =
    typeof activeRate === 'number' ? numericPyg * activeRate : null;

  return (
    <section
      id="conversor"
      className="py-16 sm:py-20 border-t border-stone-200 bg-[#FBF9F5]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Left Editorial Intro */}
          <div className="lg:col-span-5">
            <p className="text-xs uppercase tracking-widest text-[#78716C] mb-2">
              Planificación de visita
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917] text-balance">
              Conversor real de entradas desde Guaraníes
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[#57534E] leading-relaxed">
              Consultá el valor equivalente de las entradas de cada museo o sitio
              patrimonial en monedas internacionales usando tasas de cambio reales
              actualizadas en el servidor.
            </p>

            {ratesData && !error && (
              <div className="mt-6 pt-5 border-t border-stone-200 text-xs text-[#78716C] space-y-1">
                <p>Fuente: {ratesData.provider}</p>
                <p className="font-mono tabular-nums">
                  Actualización: {ratesData.updatedAt}
                </p>
              </div>
            )}
          </div>

          {/* Right Converter Workspace */}
          <div className="lg:col-span-7 bg-[#F7F4EE] border border-stone-200 rounded-lg p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4 pb-5 border-b border-stone-200">
              <div className="flex items-center gap-2 text-sm font-medium text-[#1C1917]">
                <ArrowRightLeft className="w-4 h-4 text-[#9A3412]" />
                <span>Calculadora PYG (Guaraní paraguayo)</span>
              </div>
              <button
                type="button"
                onClick={fetchRates}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#1C1917] bg-[#FBF9F5] border border-stone-200 rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                />
                <span>Actualizar tasas</span>
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="converter-museum"
                  className="block text-xs font-medium text-[#57534E] mb-1.5"
                >
                  Seleccionar entrada del catálogo
                </label>
                <select
                  id="converter-museum"
                  value={selectedMuseumId}
                  onChange={(e) => onSelectMuseumId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#9A3412]"
                >
                  <option value="">Monto personalizado</option>
                  {museums.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} —{' '}
                      {m.precio_entrada === 0
                        ? 'Gratis'
                        : `PYG ${m.precio_entrada.toLocaleString('es-PY')}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="converter-amount"
                  className="block text-xs font-medium text-[#57534E] mb-1.5"
                >
                  Monto en Guaraníes (PYG)
                </label>
                <input
                  id="converter-amount"
                  type="number"
                  min={0}
                  step={1000}
                  value={amountPyg}
                  onChange={(e) => {
                    onSelectMuseumId('');
                    setAmountPyg(e.target.value);
                  }}
                  className="w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-md text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#9A3412]"
                />
              </div>
            </div>

            <div className="mt-4">
              <label
                htmlFor="converter-currency"
                className="block text-xs font-medium text-[#57534E] mb-1.5"
              >
                Moneda principal de destino
              </label>
              <select
                id="converter-currency"
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
                className="w-full sm:w-64 px-3 py-2.5 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#9A3412]"
              >
                {CURRENCY_META.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Result Area */}
            <div className="mt-6 pt-6 border-t border-stone-200">
              {loading && (
                <div className="flex items-center gap-2 text-sm text-[#57534E]">
                  <Loader2 className="w-4 h-4 animate-spin text-[#9A3412]" />
                  <span>Consultando cotizaciones reales...</span>
                </div>
              )}

              {!loading && error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-900">
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {!loading && !error && ratesData && (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-4 bg-[#FBF9F5] border border-stone-200 rounded-md p-5">
                    <div>
                      <p className="text-xs text-[#78716C]">Equivalente estimado</p>
                      <p className="font-mono text-3xl font-semibold text-[#1C1917] tabular-nums mt-1">
                        {convertedPrimary !== null
                          ? `${convertedPrimary.toLocaleString('es-PY', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} ${targetCurrency}`
                          : 'No disponible'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#78716C]">Monto base</p>
                      <p className="font-mono text-base font-medium text-[#57534E] tabular-nums mt-1">
                        PYG {numericPyg.toLocaleString('es-PY')}
                      </p>
                    </div>
                  </div>

                  {/* Multi-currency table */}
                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {CURRENCY_META.slice(0, 4).map((cur) => {
                      const rate = ratesData.rates[cur.code];
                      const val =
                        typeof rate === 'number' ? numericPyg * rate : null;
                      return (
                        <div
                          key={cur.code}
                          className="p-3 bg-[#FBF9F5] border border-stone-200 rounded-md"
                        >
                          <p className="text-xs text-[#78716C]">{cur.code}</p>
                          <p className="font-mono text-sm font-medium text-[#1C1917] tabular-nums mt-1">
                            {val !== null
                              ? `${cur.symbol} ${val.toLocaleString('es-PY', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}`
                              : '—'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
