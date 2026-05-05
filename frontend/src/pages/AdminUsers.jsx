import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUser,
  listAdminUsers,
  patchAdminUser,
} from '../api/user/adminUsers.js'
import { listRoles } from '../api/user/roles.js'
import {
  AdminUsersTable,
  DashAlert,
  DashHero,
  DashLayout,
  DashPanel,
  DashStatGrid,
  DashTableSkeleton,
  PaginationBar,
  StatCard,
} from '../components/dash/index.js'
import { useAuth } from '../hooks/useAuth.js'

function stripOrigin(url) {
  try {
    const u = new URL(url)
    return `${u.pathname}${u.search}`
  } catch {
    return url
  }
}

function pageFromPath(path) {
  if (!path) return null
  try {
    const u = new URL(path, window.location.origin)
    const p = u.searchParams.get('page')
    return p ? Number(p) : 1
  } catch {
    return null
  }
}

function formatApiError(data) {
  if (!data || typeof data !== 'object') return null
  if (typeof data.detail === 'string') return data.detail
  const parts = []
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) parts.push(`${k}: ${v.join(', ')}`)
    else if (v && typeof v === 'object') parts.push(`${k}: ${JSON.stringify(v)}`)
    else parts.push(`${k}: ${String(v)}`)
  }
  return parts.length ? parts.join(' · ') : null
}

function normalizeRoleName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function learnerNeedsFormateur(roleName) {
  const n = normalizeRoleName(roleName)
  return n === 'eleve' || n === 'utilisateur'
}

export default function AdminUsers() {
  const { user: me } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState([])
  const [formateurs, setFormateurs] = useState([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editUserId, setEditUserId] = useState(null)
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    role_id: '',
    formateur_id: '',
    is_active: true,
    is_staff: false,
  })
  const [editForm, setEditForm] = useState(null)

  const load = useCallback(async (pageNum) => {
    setErr(null)
    setLoading(true)
    try {
      const res = await listAdminUsers({ page: pageNum })
      setData(res)
    } catch (ex) {
      const detail =
        ex.data?.detail ||
        (typeof ex.data === 'object' ? JSON.stringify(ex.data) : ex.message)
      setErr(detail || 'Erreur chargement')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadFormateurs = useCallback(async () => {
    try {
      const res = await listAdminUsers({ role_name: 'formateur', page_size: 100 })
      setFormateurs(Array.isArray(res?.results) ? res.results : [])
    } catch {
      setFormateurs([])
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement liste async au changement de page
    void load(page)
  }, [page, load])

  useEffect(() => {
    async function run() {
      try {
        const r = await listRoles()
        setRoles(Array.isArray(r) ? r : [])
      } catch {
        setRoles([])
      }
    }
    void run()
  }, [])

  useEffect(() => {
    if (!createOpen && editUserId == null) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement formateurs pour sélecteurs modal
    void loadFormateurs()
  }, [createOpen, editUserId, loadFormateurs])

  useEffect(() => {
    if (editUserId == null) return
    let cancelled = false
    async function run() {
      setModalError('')
      try {
        const u = await getAdminUser(editUserId)
        if (cancelled) return
        setEditForm({
          email: u.email || '',
          role_id: u.role?.role_id ?? '',
          formateur_id: u.formateur?.user_id ?? '',
          is_active: Boolean(u.is_active),
          is_staff: Boolean(u.is_staff),
          is_superuser: Boolean(u.is_superuser),
        })
      } catch (ex) {
        if (!cancelled) setModalError(formatApiError(ex.data) || ex.message || 'Chargement impossible.')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [editUserId])

  const results = useMemo(() => data?.results ?? [], [data])

  const nextPath = data?.next ? stripOrigin(data.next) : null
  const prevPath = data?.previous ? stripOrigin(data.previous) : null

  const pageStats = useMemo(() => {
    const activeOnPage = results.filter((r) => r.is_active).length
    const staffOnPage = results.filter((r) => r.is_staff).length
    return { activeOnPage, staffOnPage }
  }, [results])

  const pending = loading && data == null && !err

  const selectedCreateRole = roles.find((r) => String(r.role_id) === String(createForm.role_id))
  const showFormateurCreate = learnerNeedsFormateur(selectedCreateRole?.role_name)

  const selectedEditRole = roles.find((r) => String(r.role_id) === String(editForm?.role_id))
  const showFormateurEdit = learnerNeedsFormateur(selectedEditRole?.role_name)

  function openCreate() {
    setModalError('')
    setCreateForm({
      email: '',
      password: '',
      role_id: roles[0]?.role_id ?? '',
      formateur_id: '',
      is_active: true,
      is_staff: false,
    })
    setCreateOpen(true)
  }

  async function handleDelete(row) {
    if (me && row.user_id === me.user_id) {
      setErr('Vous ne pouvez pas supprimer votre propre compte.')
      return
    }
    if (!window.confirm(`Supprimer définitivement « ${row.email} » ?`)) return
    setErr(null)
    try {
      await deleteAdminUser(row.user_id)
      await load(page)
    } catch (ex) {
      setErr(formatApiError(ex.data) || ex.message || 'Suppression impossible.')
    }
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    setModalError('')
    const email = createForm.email.trim().toLowerCase()
    const password = createForm.password
    const roleId = Number(createForm.role_id)
    if (!email || !password) {
      setModalError('E-mail et mot de passe sont requis.')
      return
    }
    if (!Number.isFinite(roleId)) {
      setModalError('Choisissez un rôle.')
      return
    }
    const fmId = createForm.formateur_id === '' ? null : Number(createForm.formateur_id)
    if (showFormateurCreate && (!Number.isFinite(fmId) || fmId <= 0)) {
      setModalError('Liez cet apprenant à un formateur.')
      return
    }
    const payload = {
      email,
      password,
      role_id: roleId,
      is_active: createForm.is_active,
      is_staff: createForm.is_staff,
    }
    if (showFormateurCreate) payload.formateur_id = fmId
    else payload.formateur_id = null

    setSaving(true)
    try {
      await createAdminUser(payload)
      setCreateOpen(false)
      await load(page)
    } catch (ex) {
      setModalError(formatApiError(ex.data) || ex.message || 'Création impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    if (!editUserId || !editForm) return
    setModalError('')
    const email = editForm.email.trim().toLowerCase()
    const roleId = Number(editForm.role_id)
    const fmRaw = editForm.formateur_id === '' ? null : Number(editForm.formateur_id)
    if (!email) {
      setModalError('L’e-mail est requis.')
      return
    }
    if (!Number.isFinite(roleId)) {
      setModalError('Choisissez un rôle.')
      return
    }
    if (showFormateurEdit && (!Number.isFinite(fmRaw) || fmRaw <= 0)) {
      setModalError('Liez cet apprenant à un formateur.')
      return
    }
    const body = {
      email,
      role_id: roleId,
      is_active: editForm.is_active,
      is_staff: editForm.is_staff,
      formateur_id: showFormateurEdit ? fmRaw : null,
    }
    setSaving(true)
    try {
      await patchAdminUser(editUserId, body)
      setEditUserId(null)
      setEditForm(null)
      await load(page)
    } catch (ex) {
      setModalError(formatApiError(ex.data) || ex.message || 'Modification impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashLayout>
      <DashHero eyebrow="Espace admin" title="Gestion des utilisateurs">
        <p>
          Liste des comptes, création, mise à jour et suppression réservées au personnel autorisé
          (staff Django).
        </p>
      </DashHero>

      <DashStatGrid>
        <StatCard
          variant="blue"
          label="Total comptes"
          value={pending ? '…' : data?.count != null ? data.count : '—'}
        />
        <StatCard
          variant="purple"
          label="Actifs (page)"
          value={pending ? '…' : `${pageStats.activeOnPage} / ${results.length}`}
        />
        <StatCard
          variant="pink"
          label="Staff (page)"
          value={pending ? '…' : `${pageStats.staffOnPage} / ${results.length}`}
        />
      </DashStatGrid>

      {err ? <DashAlert>{err}</DashAlert> : null}

      <DashPanel
        title="Annuaire utilisateurs"
        meta={
          <>
            Page {page}
            {data?.count != null ? ` · ${data.count} au total` : ''}
          </>
        }
        actions={
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            Nouvel utilisateur
          </button>
        }
        footer={
          <PaginationBar
            page={page}
            prevDisabled={!prevPath}
            nextDisabled={!nextPath}
            onPrev={() => {
              const p = pageFromPath(prevPath)
              if (p != null) setPage(p)
              else setPage((x) => Math.max(1, x - 1))
            }}
            onNext={() => {
              const p = pageFromPath(nextPath)
              if (p != null) setPage(p)
              else setPage((x) => x + 1)
            }}
          />
        }
      >
        {loading ? (
          <DashTableSkeleton rows={4} />
        ) : results.length === 0 ? (
          <p className="dash-empty">Aucun utilisateur sur cette page.</p>
        ) : (
          <AdminUsersTable
            rows={results}
            onEditRow={(row) => {
              setModalError('')
              setEditForm(null)
              setEditUserId(row.user_id)
            }}
            onDeleteRow={handleDelete}
          />
        )}
      </DashPanel>

      {createOpen ? (
        <div
          className="course-map-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Créer un utilisateur"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) setCreateOpen(false)
          }}
        >
          <div className="course-map-modal card course-map-modal--narrow" onClick={(ev) => ev.stopPropagation()}>
            <div className="course-map-modal__head">
              <h2 className="section-title">Nouvel utilisateur</h2>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => !saving && setCreateOpen(false)}
                disabled={saving}
              >
                Fermer
              </button>
            </div>
            {modalError ? <p className="error">{modalError}</p> : null}
            <form className="stack-form" onSubmit={handleCreateSubmit}>
              <label>
                Adresse e-mail
                <input
                  type="email"
                  value={createForm.email}
                  autoComplete="off"
                  onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                  required
                />
              </label>
              <label>
                Mot de passe (minimum 8 caractères)
                <input
                  type="password"
                  value={createForm.password}
                  autoComplete="new-password"
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                />
              </label>
              <label>
                Rôle
                <select
                  value={createForm.role_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, role_id: e.target.value, formateur_id: '' }))}
                  required
                >
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </label>
              {showFormateurCreate ? (
                <label>
                  Formateur référent
                  <select
                    value={createForm.formateur_id}
                    onChange={(e) => setCreateForm((f) => ({ ...f, formateur_id: e.target.value }))}
                    required
                  >
                    <option value="">— Choisir —</option>
                    {formateurs.map((f) => (
                      <option key={f.user_id} value={f.user_id}>
                        #{f.user_id} · {f.email}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="stack-form__checkbox">
                <input
                  type="checkbox"
                  checked={createForm.is_active}
                  onChange={(e) => setCreateForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
                Compte actif
              </label>
              <label className="stack-form__checkbox hint">
                <input
                  type="checkbox"
                  checked={createForm.is_staff}
                  onChange={(e) => setCreateForm((f) => ({ ...f, is_staff: e.target.checked }))}
                />
                Accès équipe Django (staff) — seuls les super-utilisateurs peuvent l’activer côté API.
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Création…' : 'Créer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editUserId != null && editForm ? (
        <div
          className="course-map-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Modifier un utilisateur"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving) {
              setEditUserId(null)
              setEditForm(null)
            }
          }}
        >
          <div className="course-map-modal card course-map-modal--narrow" onClick={(ev) => ev.stopPropagation()}>
            <div className="course-map-modal__head">
              <h2 className="section-title">Modifier #{editUserId}</h2>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  if (!saving) {
                    setEditUserId(null)
                    setEditForm(null)
                  }
                }}
                disabled={saving}
              >
                Fermer
              </button>
            </div>
            {editForm.is_superuser ? (
              <p className="hint">Ce compte est super-utilisateur ; certains champs sont figés côté serveur.</p>
            ) : null}
            {modalError ? <p className="error">{modalError}</p> : null}
            <form className="stack-form" onSubmit={handleEditSubmit}>
              <label>
                Adresse e-mail
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, email: e.target.value } : f))}
                  required
                />
              </label>
              <label>
                Rôle
                <select
                  value={editForm.role_id}
                  onChange={(e) =>
                    setEditForm((f) => (f ? { ...f, role_id: e.target.value, formateur_id: '' } : f))
                  }
                  required
                >
                  {roles.map((r) => (
                    <option key={r.role_id} value={r.role_id}>
                      {r.role_name}
                    </option>
                  ))}
                </select>
              </label>
              {showFormateurEdit ? (
                <label>
                  Formateur référent
                  <select
                    value={editForm.formateur_id === '' ? '' : editForm.formateur_id}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, formateur_id: e.target.value } : f))
                    }
                    required
                  >
                    <option value="">— Choisir —</option>
                    {formateurs.map((f) => (
                      <option key={f.user_id} value={f.user_id}>
                        #{f.user_id} · {f.email}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="stack-form__checkbox">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm((f) => (f ? { ...f, is_active: e.target.checked } : f))}
                />
                Compte actif
              </label>
              {!editForm.is_superuser ? (
                <label className="stack-form__checkbox hint">
                  <input
                    type="checkbox"
                    checked={editForm.is_staff}
                    onChange={(e) =>
                      setEditForm((f) => (f ? { ...f, is_staff: e.target.checked } : f))
                    }
                  />
                  Accès équipe Django (staff)
                </label>
              ) : null}
              <div className="hero-actions">
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : editUserId != null && !editForm ? (
        <div
          className="course-map-modal__overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Chargement utilisateur"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditUserId(null)
              setEditForm(null)
            }
          }}
        >
          <div className="course-map-modal card course-map-modal--narrow" onClick={(ev) => ev.stopPropagation()}>
            <p>{modalError || 'Chargement…'}</p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setEditUserId(null)
                setEditForm(null)
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </DashLayout>
  )
}
