import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { listActivityLogs } from '../api/user/activityLogs.js'
import { useAuth } from '../hooks/useAuth.js'
import {
  DashAlert,
  DashHero,
  DashLayout,
  DashPanel,
  DashTableSkeleton,
  PaginationBar,
  StatusPill,
} from '../components/dash/index.js'

const POLL_INTERVAL_MS = 5000

const ACTION_VARIANTS = {
  register: 'blue',
  login: 'blue',
  logout: 'muted',
  quiz_submit: 'purple',
  course_enroll: 'green',
  course_unenroll: 'muted',
  cosmetic_purchase: 'pink',
  course_create: 'purple',
  course_update: 'purple',
  course_delete: 'red',
  quiz_create: 'purple',
  quiz_update: 'purple',
  quiz_delete: 'red',
  question_create: 'purple',
  question_update: 'purple',
  question_delete: 'red',
  answer_create: 'purple',
  answer_update: 'purple',
  answer_delete: 'red',
}

function adminLinkClass({ isActive }) {
  return `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
}

function metaPreview(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return null
  const text = Object.entries(metadata)
    .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
    .join(' · ')
  return <span className="dash-table__meta muted">{text}</span>
}

export default function AdminLogs() {
  const { user } = useAuth()
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [liveMode, setLiveMode] = useState(true)
  const pollRef = useRef(null)

  const load = useCallback(
    async (pageNum, action, silent = false) => {
      if (!silent) setLoading(true)
      setErr(null)
      try {
        const params = { page: pageNum, page_size: 50 }
        if (action) params.action = action
        const res = await listActivityLogs(params)
        setData(res)
      } catch (e) {
        setErr(e.data?.detail ?? 'Erreur lors du chargement des logs.')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [],
  )

  // Chargement initial + rechargement quand page ou filtre change
  useEffect(() => {
    const id = window.setTimeout(() => {
      void load(page, actionFilter)
    }, 0)
    return () => window.clearTimeout(id)
  }, [page, actionFilter, load])

  // Polling live (page 1 uniquement, rafraîchissement silencieux)
  useEffect(() => {
    if (!liveMode) {
      clearInterval(pollRef.current)
      return
    }
    pollRef.current = setInterval(() => {
      if (page === 1) load(1, actionFilter, true)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(pollRef.current)
  }, [liveMode, page, actionFilter, load])

  const rows = data?.results ?? []
  const total = data?.count ?? 0
  const hasNext = Boolean(data?.next)
  const hasPrev = Boolean(data?.previous)

  return (
    <DashLayout>
      <nav className="admin-nav" aria-label="Navigation admin">
        <NavLink to="/admin" end className={adminLinkClass}>
          Dashboard
        </NavLink>
        {user?.is_staff ? (
          <>
            <NavLink to="/admin/users" className={adminLinkClass}>
              Utilisateurs
            </NavLink>
            <NavLink to="/admin/logs" className={adminLinkClass}>
              Logs
            </NavLink>
          </>
        ) : null}
        <NavLink to="/admin/cours" className={adminLinkClass}>
          Cours
        </NavLink>
        <NavLink to="/admin/quizz" className={adminLinkClass}>
          Quiz
        </NavLink>
      </nav>

      <DashHero eyebrow="Monitoring" title="Logs d'activité">
        <p>Trace en temps réel de toutes les actions enregistrées sur la plateforme.</p>
      </DashHero>

      {/* Barre de contrôle */}
      <div className="dash-toolbar">
        <label className="dash-toolbar__label" htmlFor="action-filter">
          Filtrer par action
        </label>
        <select
          id="action-filter"
          className="dash-toolbar__select"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
        >
          <option value="">Toutes les actions</option>
          <optgroup label="Authentification">
            <option value="register">Inscription</option>
            <option value="login">Connexion</option>
            <option value="logout">Déconnexion</option>
          </optgroup>
          <optgroup label="Parcours élève">
            <option value="quiz_submit">Soumission quiz</option>
            <option value="course_enroll">Inscription cours</option>
            <option value="course_unenroll">Désinscription cours</option>
            <option value="cosmetic_purchase">Achat cosmétique</option>
          </optgroup>
          <optgroup label="Formateur — cours">
            <option value="course_create">Création cours</option>
            <option value="course_update">Modification cours</option>
            <option value="course_delete">Suppression cours</option>
          </optgroup>
          <optgroup label="Formateur — quiz / Q&amp;R">
            <option value="quiz_create">Création quiz</option>
            <option value="quiz_update">Modification quiz</option>
            <option value="quiz_delete">Suppression quiz</option>
            <option value="question_create">Création question</option>
            <option value="question_update">Modification question</option>
            <option value="question_delete">Suppression question</option>
            <option value="answer_create">Création réponse</option>
            <option value="answer_update">Modification réponse</option>
            <option value="answer_delete">Suppression réponse</option>
          </optgroup>
        </select>

        <button
          type="button"
          className={`btn ${liveMode ? 'btn--primary' : 'btn--ghost'}`}
          onClick={() => setLiveMode((v) => !v)}
          title={liveMode ? 'Désactiver la mise à jour automatique' : 'Activer la mise à jour automatique'}
        >
          {liveMode ? '⏸ Live activé' : '▶ Live désactivé'}
        </button>

        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => load(page, actionFilter)}
          disabled={loading}
        >
          ↻ Actualiser
        </button>

        <span className="muted dash-toolbar__count">
          {total} entrée{total !== 1 ? 's' : ''}
          {actionFilter ? ` · filtre : ${actionFilter}` : ''}
        </span>
      </div>

      {err && <DashAlert>{err}</DashAlert>}

      <DashPanel
        title="Activité"
        meta={`Page ${page}`}
        footer={
          <PaginationBar
            page={page}
            prevDisabled={!hasPrev}
            nextDisabled={!hasNext}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        }
      >
        {loading ? (
          <DashTableSkeleton rows={8} />
        ) : rows.length === 0 ? (
          <p className="muted" style={{ padding: '1.5rem' }}>Aucun log trouvé.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Date</th>
                <th scope="col">Utilisateur</th>
                <th scope="col">Action</th>
                <th scope="col">Détails</th>
                <th scope="col">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((log) => (
                <tr key={log.log_id}>
                  <td>
                    <span className="dash-table__id">{log.log_id}</span>
                  </td>
                  <td className="dash-table__date">
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td className="dash-table__email">
                    {log.user_email ?? <span className="muted">—</span>}
                  </td>
                  <td>
                    <StatusPill variant={ACTION_VARIANTS[log.action] ?? 'muted'}>
                      {log.action_label}
                    </StatusPill>
                  </td>
                  <td>{metaPreview(log.metadata)}</td>
                  <td className="muted">{log.ip_address ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashPanel>
    </DashLayout>
  )
}
