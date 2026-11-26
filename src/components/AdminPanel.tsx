import { useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Check,
  Edit3,
  KeyRound,
  Lock,
  LogOut,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AdminStatusResponse,
  Museum,
  MuseumCategory,
  MuseumInput,
} from '../types/culture.ts';

interface AdminPanelProps {
  museums: Museum[];
  onRefreshMuseums: () => Promise<void>;
}

const CATEGORIES: MuseumCategory[] = [
  'Museo',
  'Galería',
  'Sitio Histórico',
  'Centro Cultural',
];

const EMPTY_FORM: MuseumInput = {
  nombre: '',
  descripcion: '',
  direccion: '',
  contacto: '',
  horarios: '',
  precio_entrada: 0,
  categoria: 'Museo',
  latitud: -25.282,
  longitud: -57.635,
  wikipedia_titulo: '',
  imagen_url: '',
};

export function AdminPanel({ museums, onRefreshMuseums }: AdminPanelProps) {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(
    null
  );
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Admin table search & filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todas');
  const [priceFilter, setPriceFilter] = useState<string>('todos');

  // Create / Edit modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MuseumInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchAdminStatus = async (token: string | null) => {
    try {
      const res = await fetch('/api/admin/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = (await res.json()) as AdminStatusResponse;
        setAdminStatus(data);
        if (!data.authenticated && token) {
          setAdminToken(null);
        }
      }
    } catch {
      // Ignore transient status fetch failure
    }
  };

  useEffect(() => {
    void fetchAdminStatus(adminToken);
  }, [adminToken]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passcodeInput.trim()) return;
    setAuthLoading(true);
    setAuthError(null);

    const endpoint =
      adminStatus?.mode === 'claim_required'
        ? '/api/admin/claim'
        : '/api/admin/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput.trim() }),
      });
      const body = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !body.token) {
        throw new Error(body.error || 'No se pudo autenticar.');
      }
      setAdminToken(body.token);
      setPasscodeInput('');
      setActionMessage('Sesión de administrador habilitada.');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Error de autenticación.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  };

  const openEditForm = (museum: Museum) => {
    setEditingId(museum.id);
    setFormData({
      nombre: museum.nombre,
      descripcion: museum.descripcion,
      direccion: museum.direccion,
      contacto: museum.contacto,
      horarios: museum.horarios,
      precio_entrada: museum.precio_entrada,
      categoria: museum.categoria,
      latitud: museum.latitud,
      longitud: museum.longitud,
      wikipedia_titulo: museum.wikipedia_titulo,
      imagen_url: museum.imagen_url,
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleSaveMuseum = async (e: FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;
    setSaving(true);
    setFormError(null);

    try {
      const url = editingId ? `/api/museums/${editingId}` : '/api/museums';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(formData),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setAdminToken(null);
        }
        throw new Error(body.error || 'No se pudo guardar el registro.');
      }
      await onRefreshMuseums();
      setFormOpen(false);
      setActionMessage(
        editingId
          ? 'Espacio cultural actualizado correctamente.'
          : 'Nuevo espacio cultural agregado al catálogo.'
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Error guardando los cambios.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMuseum = async (id: string) => {
    if (!adminToken) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/museums/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        if (res.status === 401) {
          setAdminToken(null);
        }
        throw new Error(body.error || 'No se pudo eliminar el registro.');
      }
      setConfirmDeleteId(null);
      await onRefreshMuseums();
      setActionMessage('Espacio cultural eliminado del catálogo.');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Error eliminando el espacio.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  const filteredMuseums = museums.filter((m) => {
    const q = search.trim().toLowerCase();
    const matchesQ =
      !q ||
      m.nombre.toLowerCase().includes(q) ||
      m.direccion.toLowerCase().includes(q) ||
      m.descripcion.toLowerCase().includes(q);
    const matchesCat =
      categoryFilter === 'Todas' || m.categoria === categoryFilter;
    const matchesPrice =
      priceFilter === 'todos' ||
      (priceFilter === 'gratis' && m.precio_entrada === 0) ||
      (priceFilter === 'pago' && m.precio_entrada > 0);
    return matchesQ && matchesCat && matchesPrice;
  });

  return (
    <section
      id="admin"
      className="py-16 sm:py-20 border-t border-stone-200 bg-[#F7F4EE]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#78716C] mb-2">
              Curaduría y gestión
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-[#1C1917] text-balance">
              Administración del catálogo cultural
            </h2>
            <p className="mt-2 text-sm sm:text-base text-[#57534E] max-w-2xl">
              Agregá, editá, consultá o eliminá espacios culturales. Las operaciones de
              escritura están protegidas por autenticación en el servidor.
            </p>
          </div>

          {adminToken && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#FBF9F5] bg-[#9A3412] hover:bg-[#7C2D12] rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar museo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdminToken(null);
                  setActionMessage('Sesión de administrador cerrada.');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-[#57534E] hover:text-[#1C1917] bg-[#FBF9F5] border border-stone-300 rounded-md transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Cerrar sesión</span>
              </button>
            </div>
          )}
        </div>

        {actionMessage && (
          <div className="mb-6 flex items-center justify-between gap-4 px-4 py-3 bg-[#FBF9F5] border border-stone-300 rounded-md text-sm text-[#1C1917]">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#14532D]" />
              <span>{actionMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              aria-label="Ocultar aviso"
              className="text-[#78716C] hover:text-[#1C1917] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Authentication Gate for Write Operations */}
        {!adminToken && (
          <div className="mb-10 bg-[#FBF9F5] border border-stone-200 rounded-lg p-6 sm:p-8 max-w-2xl">
            <div className="flex items-start gap-3">
              {adminStatus?.mode === 'claim_required' ? (
                <KeyRound className="w-5 h-5 text-[#9A3412] shrink-0 mt-0.5" />
              ) : (
                <Lock className="w-5 h-5 text-[#9A3412] shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                  {adminStatus?.mode === 'claim_required'
                    ? 'Configurar contraseña inicial de administrador'
                    : 'Acceso de administrador para edición'}
                </h3>
                <p className="mt-1.5 text-sm text-[#57534E]">
                  {adminStatus?.mode === 'claim_required'
                    ? 'Aún no se definió la variable ADMIN_PASSCODE en el servidor. Creá una contraseña (mínimo 8 caracteres) para proteger y habilitar la creación, edición y eliminación.'
                    : 'Ingresá la contraseña de administrador para habilitar la creación, edición y eliminación de museos en el servidor.'}
                </p>

                <form
                  onSubmit={handleAuthSubmit}
                  className="mt-4 flex flex-col sm:flex-row gap-3"
                >
                  <input
                    type="password"
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder={
                      adminStatus?.mode === 'claim_required'
                        ? 'Nueva contraseña (mín. 8 caracteres)'
                        : 'Contraseña de administrador'
                    }
                    minLength={adminStatus?.mode === 'claim_required' ? 8 : 1}
                    required
                    className="flex-1 px-3.5 py-2.5 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#9A3412]"
                  />
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="px-5 py-2.5 text-sm font-medium text-[#FBF9F5] bg-[#1C1917] hover:bg-[#9A3412] rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    {authLoading
                      ? 'Verificando...'
                      : adminStatus?.mode === 'claim_required'
                      ? 'Guardar clave y entrar'
                      : 'Desbloquear edición'}
                  </button>
                </form>

                {authError && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{authError}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters for Admin Directory */}
        <div className="bg-[#FBF9F5] border border-stone-200 rounded-lg overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#78716C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar en administración por nombre o dirección..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#9A3412]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Filtrar por categoría en administración"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md text-[#1C1917]"
              >
                <option value="Todas">Todas las categorías</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filtrar por precio en administración"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md text-[#1C1917]"
              >
                <option value="todos">Todos los precios</option>
                <option value="gratis">Entrada gratuita</option>
                <option value="pago">Entrada arancelada</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-[#F7F4EE] text-xs uppercase tracking-wider text-[#78716C]">
                  <th className="py-3 px-4 font-medium">Nombre</th>
                  <th className="py-3 px-4 font-medium">Categoría</th>
                  <th className="py-3 px-4 font-medium">Dirección</th>
                  <th className="py-3 px-4 font-medium">Entrada (PYG)</th>
                  <th className="py-3 px-4 font-medium">Coordenadas</th>
                  {adminToken && (
                    <th className="py-3 px-4 font-medium text-right">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-sm">
                {filteredMuseums.map((m) => (
                  <tr
                    key={m.id}
                    className="hover:bg-[#F7F4EE]/60 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-[#1C1917]">
                      {m.nombre}
                    </td>
                    <td className="py-3.5 px-4 text-[#57534E] whitespace-nowrap">
                      {m.categoria}
                    </td>
                    <td className="py-3.5 px-4 text-[#57534E] max-w-xs truncate">
                      {m.direccion}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-[#1C1917] whitespace-nowrap">
                      {m.precio_entrada === 0
                        ? 'Gratis'
                        : `PYG ${m.precio_entrada.toLocaleString('es-PY')}`}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-[#78716C] whitespace-nowrap">
                      {m.latitud.toFixed(4)}, {m.longitud.toFixed(4)}
                    </td>
                    {adminToken && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {confirmDeleteId === m.id ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => void handleDeleteMuseum(m.id)}
                              disabled={deletingId === m.id}
                              className="px-2.5 py-1 text-xs font-medium text-white bg-red-700 hover:bg-red-800 rounded cursor-pointer disabled:opacity-50"
                            >
                              {deletingId === m.id ? 'Eliminando...' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 py-1 text-xs font-medium text-[#57534E] border border-stone-300 rounded cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEditForm(m)}
                              aria-label={`Editar ${m.nombre}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#1C1917] border border-stone-300 hover:border-[#1C1917] rounded transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Editar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(m.id)}
                              aria-label={`Eliminar ${m.nombre}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-800 border border-red-200 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {filteredMuseums.length === 0 && (
                  <tr>
                    <td
                      colSpan={adminToken ? 6 : 5}
                      className="py-8 px-4 text-center text-sm text-[#78716C]"
                    >
                      No hay registros que coincidan con la búsqueda actual.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create / Edit Museum Modal */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1917]/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? 'Editar museo' : 'Agregar nuevo museo'}
          onClick={() => setFormOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#FBF9F5] border border-stone-300 rounded-lg shadow-xl p-6 sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-stone-200">
              <h3 className="font-serif text-2xl font-semibold text-[#1C1917]">
                {editingId
                  ? 'Editar espacio cultural'
                  : 'Agregar nuevo espacio cultural'}
              </h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-md border border-stone-200 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMuseum} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Nombre del lugar *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={160}
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Categoría *
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoria: e.target.value as MuseumCategory,
                      })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Precio de entrada (PYG, 0 = Gratis) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.precio_entrada}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        precio_entrada: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Descripción *
                  </label>
                  <textarea
                    rows={3}
                    required
                    minLength={10}
                    maxLength={2000}
                    value={formData.descripcion}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    maxLength={240}
                    value={formData.direccion}
                    onChange={(e) =>
                      setFormData({ ...formData, direccion: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Horarios *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={160}
                    value={formData.horarios}
                    onChange={(e) =>
                      setFormData({ ...formData, horarios: e.target.value })
                    }
                    placeholder="Mar a Sáb: 09:00 - 18:00"
                    className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Contacto
                  </label>
                  <input
                    type="text"
                    maxLength={160}
                    value={formData.contacto}
                    onChange={(e) =>
                      setFormData({ ...formData, contacto: e.target.value })
                    }
                    placeholder="+595 21 ..."
                    className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Latitud *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min={-90}
                    max={90}
                    required
                    value={formData.latitud}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        latitud: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Longitud *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min={-180}
                    max={180}
                    required
                    value={formData.longitud}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        longitud: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    Artículo de Wikipedia (opcional)
                  </label>
                  <input
                    type="text"
                    maxLength={180}
                    value={formData.wikipedia_titulo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        wikipedia_titulo: e.target.value,
                      })
                    }
                    placeholder="Ej: Museo del Barro"
                    className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#57534E] mb-1">
                    URL de imagen (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.imagen_url}
                    onChange={(e) =>
                      setFormData({ ...formData, imagen_url: e.target.value })
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 text-sm bg-[#FBF9F5] border border-stone-300 rounded-md"
                  />
                </div>
              </div>

              {formError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-900">
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-[#57534E] border border-stone-300 rounded-md hover:text-[#1C1917] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-[#FBF9F5] bg-[#9A3412] hover:bg-[#7C2D12] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving
                    ? 'Guardando...'
                    : editingId
                    ? 'Guardar cambios'
                    : 'Crear espacio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
