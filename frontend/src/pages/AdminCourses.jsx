import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBadges } from '../api/user/badges.js'
import {
  createFormateurCourse,
  createFormateurTheme,
  deleteFormateurCourse,
  deleteFormateurTheme,
  getFormateurCourses,
  getFormateurQuizzes,
  updateFormateurCourse,
} from '../api/user/formateur.js'
import { getThemes } from '../api/user/learningMap.js'
import { ModalOverlayPortal } from '../components/ModalOverlayPortal.jsx'

function formatApiError(data) {
  if (!data || typeof data !== 'object') return null
  if (typeof data.detail === 'string') return data.detail
  const parts = []
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v)) parts.push(`${k}: ${v.join(', ')}`)
    else parts.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
  }
  return parts.length ? parts.join(' · ') : null
}

const emptyCourseForm = () => ({
  course_title: '',
  body_content: '',
  map_order: 0,
  theme_id: '',
  validating_quiz: '',
  delivered_badge: '',
})

const COURSES_PER_PAGE = 8

export default function AdminCourses() {
  const [courses, setCourses] = useState([])
  const [themes, setThemes] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [badges, setBadges] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingRefs, setLoadingRefs] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(emptyCourseForm)
  const [editingCourse, setEditingCourse] = useState(null)
  const [editForm, setEditForm] = useState(emptyCourseForm)
  const [savingEdit, setSavingEdit] = useState(false)
  const [modalError, setModalError] = useState('')
  const [creatingTheme, setCreatingTheme] = useState(false)
  const [newThemeTitle, setNewThemeTitle] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [deletingThemeId, setDeletingThemeId] = useState(null)
  const [coursePage, setCoursePage] = useState(1)

  const loadRefs = useCallback(async () => {
    setLoadingRefs(true)
    try {
      const [t, q, b] = await Promise.all([getThemes(), getFormateurQuizzes(), getBadges()])
      setThemes(Array.isArray(t) ? t : [])
      setQuizzes(Array.isArray(q) ? q : [])
      setBadges(Array.isArray(b) ? b : [])
    } catch (e) {
      const message = formatApiError(e.data) || e?.message || 'Impossible de charger thèmes, quiz ou badges.'
      setError(message)
      setThemes([])
      setQuizzes([])
      setBadges([])
    } finally {
      setLoadingRefs(false)
    }
  }, [])

  const loadCourses = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getFormateurCourses()
      setCourses(Array.isArray(data) ? data : [])
    } catch (e) {
      const message =
        formatApiError(e.data) ||
        (typeof e?.data === 'object' ? JSON.stringify(e.data) : null) ||
        e?.message ||
        'Impossible de charger les cours.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement thèmes / quiz / badges
    void loadRefs()
  }, [loadRefs])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement cours
    void loadCourses()
  }, [loadCourses])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- repli sur la dernière page si la liste raccourcit
    const maxPage = Math.max(1, Math.ceil(courses.length / COURSES_PER_PAGE))
    setCoursePage((p) => Math.min(Math.max(1, p), maxPage))
  }, [courses.length])

  const coursePageCount = Math.max(1, Math.ceil(courses.length / COURSES_PER_PAGE))
  const paginatedCourses = useMemo(() => {
    const start = (coursePage - 1) * COURSES_PER_PAGE
    return courses.slice(start, start + COURSES_PER_PAGE)
  }, [courses, coursePage])

  function openCreate() {
    setModalError('')
    setCreateForm(emptyCourseForm())
    setCreating(false)
    setCreateOpen(true)
  }

  async function handleDelete(course) {
    if (!window.confirm(`Supprimer le cours « ${course.course_title} » ?`)) return
    setError('')
    try {
      await deleteFormateurCourse(course.course_id)
      await loadCourses()
    } catch (e) {
      setError(formatApiError(e.data) || e?.message || 'Suppression impossible.')
    }
  }

  function syncEditForm(course) {
    setEditForm({
      course_title: course.course_title || '',
      body_content: course.body_content || '',
      map_order: Number(course.map_order || 0),
      theme_id: course.theme ?? '',
      validating_quiz: course.validating_quiz ?? '',
      delivered_badge: course.delivered_badge != null ? String(course.delivered_badge) : '',
    })
  }

  function handleEditOpen(course) {
    setEditingCourse(course)
    setModalError('')
    syncEditForm(course)
  }

  function handleEditClose() {
    if (savingEdit) return
    setEditingCourse(null)
  }

  async function handleCreateSubmit(event) {
    event.preventDefault()
    const title = createForm.course_title.trim()
    const bodyContent = createForm.body_content.trim()
    const themeId = Number(createForm.theme_id)
    const quizId = Number(createForm.validating_quiz)
    if (!title || !bodyContent) {
      setModalError('Titre et contenu sont requis.')
      return
    }
    if (!Number.isFinite(themeId) || themeId <= 0) {
      setModalError('Choisissez un thème.')
      return
    }
    if (!Number.isFinite(quizId) || quizId <= 0) {
      setModalError('Choisissez un quiz de validation (créez un quiz d’abord si besoin).')
      return
    }
    const badgeRaw = createForm.delivered_badge
    let delivered_badge = null
    if (badgeRaw !== '' && badgeRaw != null) {
      const bid = Number(badgeRaw)
      if (!Number.isFinite(bid) || bid <= 0) {
        setModalError('Badge invalide.')
        return
      }
      delivered_badge = bid
    }
    setModalError('')
    setCreating(true)
    try {
      await createFormateurCourse({
        course_title: title,
        body_content: bodyContent,
        map_order: Number(createForm.map_order) || 0,
        theme: themeId,
        validating_quiz: quizId,
        delivered_badge,
      })
      setCreateOpen(false)
      await loadCourses()
    } catch (e) {
      setModalError(formatApiError(e.data) || e?.message || 'Création impossible.')
    } finally {
      setCreating(false)
    }
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    if (!editingCourse) return

    const nextTitle = editForm.course_title.trim()
    const nextContent = editForm.body_content.trim()
    const themeId = Number(editForm.theme_id)
    const quizId = Number(editForm.validating_quiz)
    if (!nextTitle) {
      setModalError('Le titre du cours est obligatoire.')
      return
    }
    if (!Number.isFinite(themeId) || themeId <= 0) {
      setModalError('Choisissez un thème.')
      return
    }
    if (!Number.isFinite(quizId) || quizId <= 0) {
      setModalError('Choisissez un quiz de validation.')
      return
    }
    const badgeRaw = editForm.delivered_badge
    let delivered_badge = null
    if (badgeRaw !== '' && badgeRaw != null) {
      const bid = Number(badgeRaw)
      if (!Number.isFinite(bid) || bid <= 0) {
        setModalError('Badge invalide.')
        return
      }
      delivered_badge = bid
    }

    setModalError('')
    setSavingEdit(true)
    try {
      await updateFormateurCourse(editingCourse.course_id, {
        course_title: nextTitle,
        body_content: nextContent,
        map_order: Number(editForm.map_order) || 0,
        theme: themeId,
        validating_quiz: quizId,
        delivered_badge,
      })
      await loadCourses()
      setEditingCourse(null)
    } catch (e) {
      setModalError(formatApiError(e.data) || e?.message || 'Modification impossible.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleCreateTheme(event) {
    event.preventDefault()
    const title = newThemeTitle.trim()
    if (!title) {
      setCategoryError('Indiquez un nom de catégorie.')
      return
    }
    setCategoryError('')
    setCreatingTheme(true)
    try {
      await createFormateurTheme({ theme_title: title })
      setNewThemeTitle('')
      await loadRefs()
    } catch (e) {
      setCategoryError(formatApiError(e.data) || e?.message || 'Création de la catégorie impossible.')
    } finally {
      setCreatingTheme(false)
    }
  }

  async function handleDeleteTheme(theme) {
    if (!window.confirm(`Supprimer la catégorie « ${theme.theme_title} » ?`)) return
    setCategoryError('')
    setDeletingThemeId(theme.theme_id)
    try {
      await deleteFormateurTheme(theme.theme_id)
      await loadRefs()
    } catch (e) {
      setCategoryError(formatApiError(e.data) || e?.message || 'Suppression impossible.')
    } finally {
      setDeletingThemeId(null)
    }
  }

  return (
    <div className="page">
      <header className="page-header page-header--split">
        <div className="page-header__intro">
          <p className="page-header__eyebrow">Administration</p>
          <h1>Gestion des cours</h1>
          <p className="page-header__lead">
            Créez des parcours, reliez-les à un thème et à un quiz de validation, puis modifiez ou supprimez-les.
          </p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn--primary" onClick={openCreate} disabled={loadingRefs}>
            Nouveau cours
          </button>
          <Link to="/admin/quizz" className="btn btn--secondary">
            Gérer les quiz
          </Link>
        </div>
      </header>

      <div className="admin-courses-page__categories-wrap">
        <details className="admin-category-details">
          <summary>
            Catégories
            <span className="muted admin-category-summary__meta">
              {loadingRefs ? ' — …' : ` — ${themes.length} ${themes.length > 1 ? 'thèmes' : 'thème'} · créer ou supprimer`}
            </span>
          </summary>
          <div className="admin-category-details__panel">
            <p className="admin-category-details__hint muted">
              Utilisées pour ranger les cours sur la carte. Impossible de supprimer un thème encore lié à un cours.
            </p>
            {categoryError ? <p className="error">{categoryError}</p> : null}
            <form className="admin-category-details__toolbar" onSubmit={handleCreateTheme}>
              <label htmlFor="new-theme-title-input">
                Nouvelle catégorie
                <input
                  id="new-theme-title-input"
                  type="text"
                  value={newThemeTitle}
                  onChange={(e) => setNewThemeTitle(e.target.value)}
                  placeholder="Ex. Sciences"
                  disabled={loadingRefs || creatingTheme}
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="btn btn--primary" disabled={loadingRefs || creatingTheme}>
                {creatingTheme ? 'Ajout…' : 'Ajouter'}
              </button>
            </form>
            {loadingRefs ? (
              <p className="muted admin-category-loading">Chargement…</p>
            ) : themes.length === 0 ? (
              <p className="muted admin-category-loading">Aucune catégorie.</p>
            ) : (
              <ul className="admin-category-details__list" aria-label="Liste des catégories">
                {themes.map((th) => (
                  <li key={th.theme_id} className="admin-category-details__row">
                    <span>
                      <strong>{th.theme_title}</strong>
                      <span className="muted"> · #{th.theme_id}</span>
                    </span>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => handleDeleteTheme(th)}
                      disabled={deletingThemeId === th.theme_id}
                    >
                      {deletingThemeId === th.theme_id ? '…' : 'Supprimer'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </div>

      <div className="admin-courses-page__divider">
        <h2 className="admin-courses-page__section-title" id="courses-section-title">
          Cours
        </h2>
        <p className="admin-courses-page__section-meta muted">
          Liste des parcours rattachés à un thème et à un quiz de validation.
        </p>
      </div>

      <section className="admin-cards" aria-labelledby="courses-section-title">
        {loading ? <p className="muted">Chargement des cours…</p> : null}
        {loadingRefs && !loading ? <p className="muted">Chargement des références…</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && !error && courses.length === 0 ? (
          <p className="dash-empty">Aucun cours disponible en base.</p>
        ) : null}

        {!loading && !error
          ? paginatedCourses.map((course) => (
              <article key={course.course_id} className="card admin-card">
                <div className="admin-card__head">
                  <h2>{course.course_title}</h2>
                  <span className="dash-badge dash-badge--purple">Cours</span>
                </div>
                <p className="muted">
                  #{course.course_id} · Ordre carte {course.map_order}
                </p>
                <p className="muted">
                  Thème #{course.theme} · Quiz validation #{course.validating_quiz}
                  {course.delivered_badge != null ? ` · Badge #${course.delivered_badge}` : ''}
                </p>
                <div className="hero-actions admin-card__actions">
                  <button type="button" className="btn btn--secondary" onClick={() => handleEditOpen(course)}>
                    Modifier
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={() => handleDelete(course)}>
                    Supprimer
                  </button>
                </div>
              </article>
            ))
          : null}

        {!loading && !error && courses.length > 0 ? (
          <div className="admin-pagination admin-pagination--full-span">
            <p className="admin-pagination__meta">
              {coursePageCount > 1
                ? `Affichage ${(coursePage - 1) * COURSES_PER_PAGE + 1}–${Math.min(coursePage * COURSES_PER_PAGE, courses.length)} sur ${courses.length} cours`
                : `${courses.length} cours affichés`}
            </p>
            {coursePageCount > 1 ? (
              <div className="admin-pagination__nav">
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={coursePage <= 1}
                  onClick={() => setCoursePage((p) => Math.max(1, p - 1))}
                >
                  Précédent
                </button>
                <span className="muted">
                  Page {coursePage} / {coursePageCount}
                </span>
                <button
                  type="button"
                  className="btn btn--secondary"
                  disabled={coursePage >= coursePageCount}
                  onClick={() => setCoursePage((p) => Math.min(coursePageCount, p + 1))}
                >
                  Suivant
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {createOpen ? (
        <ModalOverlayPortal
          role="dialog"
          aria-modal="true"
          aria-label="Nouveau cours"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creating) setCreateOpen(false)
          }}
        >
          <div className="course-map-modal card" onClick={(ev) => ev.stopPropagation()}>
            <div className="course-map-modal__head">
              <h2 className="section-title">Nouveau cours</h2>
              <button type="button" className="btn btn--secondary" onClick={() => !creating && setCreateOpen(false)} disabled={creating}>
                Fermer
              </button>
            </div>
            {modalError ? <p className="error">{modalError}</p> : null}
            <form className="stack-form" onSubmit={handleCreateSubmit}>
              <label>
                Titre du cours
                <input
                  type="text"
                  value={createForm.course_title}
                  onChange={(e) => setCreateForm((f) => ({ ...f, course_title: e.target.value }))}
                  required
                />
              </label>
              <label>
                Contenu du cours
                <textarea
                  rows={6}
                  value={createForm.body_content}
                  onChange={(e) => setCreateForm((f) => ({ ...f, body_content: e.target.value }))}
                  placeholder="Décrivez le contenu pédagogique du cours…"
                  required
                />
              </label>
              <label>
                Thème
                <select
                  value={createForm.theme_id}
                  onChange={(e) => setCreateForm((f) => ({ ...f, theme_id: e.target.value }))}
                  required
                >
                  <option value="">— Choisir —</option>
                  {themes.map((th) => (
                    <option key={th.theme_id} value={th.theme_id}>
                      {th.theme_title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quiz de validation
                <select
                  value={createForm.validating_quiz}
                  onChange={(e) => setCreateForm((f) => ({ ...f, validating_quiz: e.target.value }))}
                  required
                >
                  <option value="">— Choisir —</option>
                  {quizzes.map((q) => (
                    <option key={q.quiz_id} value={q.quiz_id}>
                      Quiz #{q.quiz_id} — min {q.min_score_to_pass}%
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Badge délivré (optionnel)
                <select
                  value={createForm.delivered_badge}
                  onChange={(e) => setCreateForm((f) => ({ ...f, delivered_badge: e.target.value }))}
                >
                  <option value="">Aucun</option>
                  {badges.map((b) => (
                    <option key={b.badge_id} value={b.badge_id}>
                      {b.badge_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ordre sur la carte
                <input
                  type="number"
                  min={0}
                  value={createForm.map_order}
                  onChange={(e) => setCreateForm((f) => ({ ...f, map_order: e.target.value }))}
                />
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn--primary" disabled={creating}>
                  {creating ? 'Création…' : 'Créer le cours'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlayPortal>
      ) : null}

      {editingCourse ? (
        <ModalOverlayPortal
          role="dialog"
          aria-modal="true"
          aria-label="Modifier un cours"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingEdit) setEditingCourse(null)
          }}
        >
          <div className="course-map-modal card" onClick={(ev) => ev.stopPropagation()}>
            <div className="course-map-modal__head">
              <h2 className="section-title">Modifier le cours</h2>
              <button type="button" className="btn btn--secondary" onClick={handleEditClose} disabled={savingEdit}>
                Fermer
              </button>
            </div>
            {modalError ? <p className="error">{modalError}</p> : null}
            <form className="stack-form" onSubmit={handleEditSubmit}>
              <label>
                Titre du cours
                <input
                  type="text"
                  value={editForm.course_title}
                  onChange={(e) => setEditForm((f) => ({ ...f, course_title: e.target.value }))}
                  required
                />
              </label>
              <label>
                Contenu du cours
                <textarea
                  rows={8}
                  value={editForm.body_content}
                  onChange={(e) => setEditForm((f) => ({ ...f, body_content: e.target.value }))}
                />
              </label>
              <label>
                Thème
                <select
                  value={editForm.theme_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, theme_id: e.target.value }))}
                  required
                >
                  {themes.map((th) => (
                    <option key={th.theme_id} value={th.theme_id}>
                      {th.theme_title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quiz de validation
                <select
                  value={editForm.validating_quiz}
                  onChange={(e) => setEditForm((f) => ({ ...f, validating_quiz: e.target.value }))}
                  required
                >
                  {quizzes.map((q) => (
                    <option key={q.quiz_id} value={q.quiz_id}>
                      Quiz #{q.quiz_id} — min {q.min_score_to_pass}%
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Badge délivré (optionnel)
                <select
                  value={editForm.delivered_badge === '' ? '' : editForm.delivered_badge}
                  onChange={(e) => setEditForm((f) => ({ ...f, delivered_badge: e.target.value }))}
                >
                  <option value="">Aucun</option>
                  {badges.map((b) => (
                    <option key={b.badge_id} value={b.badge_id}>
                      {b.badge_name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Ordre sur la carte
                <input
                  type="number"
                  min={0}
                  value={editForm.map_order}
                  onChange={(e) => setEditForm((f) => ({ ...f, map_order: e.target.value }))}
                />
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn--primary" disabled={savingEdit}>
                  {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button type="button" className="btn btn--secondary" onClick={handleEditClose} disabled={savingEdit}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </ModalOverlayPortal>
      ) : null}
    </div>
  )
}
