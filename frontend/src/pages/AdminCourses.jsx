import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { generateAiCourse, getAiStatus } from '../api/user/ai.js'
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
import { getReadableFormError } from '../utils/formErrors.js'

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

const emptyAiForm = () => ({
  topic: '',
  level: 'debutant',
  language: 'fr',
  num_questions: 5,
  coins_on_success: 20,
  min_score_to_pass: 70,
  map_order: 0,
  theme_id: '',
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
  const [coursePageRequested, setCoursePageRequested] = useState(1)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiForm, setAiForm] = useState(emptyAiForm)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiStatus, setAiStatus] = useState({ configured: false, model: null })
  const [aiSuccess, setAiSuccess] = useState(null) // { course_id, course_title, quiz_id, question_count }

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
      setError(getReadableFormError(e, 'Impossible de charger la liste des cours pour le moment.'))
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
    let cancelled = false
    getAiStatus()
      .then((data) => {
        if (cancelled) return
        setAiStatus({
          configured: Boolean(data?.configured),
          model: data?.model || null,
        })
      })
      .catch(() => {
        if (cancelled) return
        setAiStatus({ configured: false, model: null })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const coursePageCount = Math.max(1, Math.ceil(courses.length / COURSES_PER_PAGE))
  const coursePage = Math.min(Math.max(1, coursePageRequested), coursePageCount)
  const paginatedCourses = useMemo(() => {
    const start = (coursePage - 1) * COURSES_PER_PAGE
    return courses.slice(start, start + COURSES_PER_PAGE)
  }, [courses, coursePage])

  // Badge.delivered_badge est OneToOne : on désactive ceux déjà attribués à un cours
  // pour éviter une erreur 400 au moment de la soumission.
  const usedBadgeIds = useMemo(() => {
    const set = new Set()
    for (const c of courses) {
      if (c?.delivered_badge != null) set.add(Number(c.delivered_badge))
    }
    return set
  }, [courses])

  function openCreate() {
    setModalError('')
    setCreateForm(emptyCourseForm())
    setCreating(false)
    setCreateOpen(true)
  }

  function openAi() {
    setAiError('')
    setAiForm(emptyAiForm())
    setAiLoading(false)
    setAiOpen(true)
  }

  async function handleAiSubmit(event) {
    event.preventDefault()
    const topic = aiForm.topic.trim()
    const themeId = Number(aiForm.theme_id)
    if (topic.length < 5) {
      setAiError('Décrivez le sujet du cours en au moins 5 caractères.')
      return
    }
    if (!Number.isFinite(themeId) || themeId <= 0) {
      setAiError('Choisissez un thème de rattachement.')
      return
    }
    let delivered_badge = null
    if (aiForm.delivered_badge !== '' && aiForm.delivered_badge != null) {
      const bid = Number(aiForm.delivered_badge)
      if (!Number.isFinite(bid) || bid <= 0) {
        setAiError('Badge invalide.')
        return
      }
      delivered_badge = bid
    }
    setAiError('')
    setAiLoading(true)
    try {
      const result = await generateAiCourse({
        topic,
        theme: themeId,
        level: aiForm.level,
        language: aiForm.language,
        num_questions: Number(aiForm.num_questions) || 5,
        coins_on_success: Number(aiForm.coins_on_success) || 20,
        min_score_to_pass: Number(aiForm.min_score_to_pass) || 70,
        map_order: Number(aiForm.map_order) || 0,
        delivered_badge,
      })
      setAiSuccess({
        course_id: result?.course?.course_id ?? null,
        course_title: result?.course?.course_title || 'Cours généré',
        quiz_id: result?.quiz?.quiz_id ?? null,
        question_count: Array.isArray(result?.questions) ? result.questions.length : 0,
      })
      setAiOpen(false)
      setAiForm(emptyAiForm())
      await Promise.all([loadCourses(), loadRefs()])
    } catch (e) {
      setAiError(getReadableFormError(e, 'La génération du cours a échoué. Réessayez dans quelques instants.'))
    } finally {
      setAiLoading(false)
    }
  }

  async function handleDelete(course) {
    if (!window.confirm(`Supprimer le cours « ${course.course_title} » ?`)) return
    setError('')
    try {
      await deleteFormateurCourse(course.course_id)
      await loadCourses()
    } catch (e) {
      setError(getReadableFormError(e, 'La suppression du cours a échoué. Réessayez.'))
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
      setModalError(getReadableFormError(e, 'Création impossible. Vérifiez les champs et réessayez.'))
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
      setModalError(getReadableFormError(e, 'La modification du cours a échoué. Vérifiez les champs et réessayez.'))
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
          <button
            type="button"
            className="btn btn--secondary"
            onClick={openAi}
            disabled={loadingRefs || !aiStatus.configured}
            title={
              aiStatus.configured
                ? `Générer un cours complet via ${aiStatus.model || 'l’IA'}`
                : 'Service IA non configuré côté serveur (GEMINI_API_KEY manquante).'
            }
          >
            Générer avec l’IA
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

      {aiSuccess ? (
        <div className="dash-alert" role="status" aria-live="polite">
          Cours créé par l’IA :{' '}
          <strong>« {aiSuccess.course_title} »</strong>
          {aiSuccess.course_id ? <> (#{aiSuccess.course_id})</> : null}{' '}
          — {aiSuccess.question_count} question(s) générée(s)
          {aiSuccess.quiz_id ? <> · quiz #{aiSuccess.quiz_id}</> : null}.{' '}
          Vous pouvez le relire et l’éditer ci-dessous, ou ajuster le quiz depuis{' '}
          <Link to="/admin/quizz">Gérer les quiz</Link>.{' '}
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setAiSuccess(null)}
            style={{ marginLeft: '0.5rem' }}
          >
            Fermer
          </button>
        </div>
      ) : null}

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
                  onClick={() =>
                    setCoursePageRequested((p) => Math.max(1, Math.min(p, coursePageCount) - 1))
                  }
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
                  onClick={() =>
                    setCoursePageRequested((p) =>
                      Math.min(coursePageCount, Math.min(p, coursePageCount) + 1),
                    )
                  }
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
                  {badges.map((b) => {
                    const isUsed = usedBadgeIds.has(Number(b.badge_id))
                    return (
                      <option key={b.badge_id} value={b.badge_id} disabled={isUsed}>
                        {b.badge_name}{isUsed ? ' (déjà attribué)' : ''}
                      </option>
                    )
                  })}
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
                  {badges.map((b) => {
                    // En édition on conserve éditable le badge actuel du cours.
                    const currentBadgeId =
                      editingCourse?.delivered_badge != null
                        ? Number(editingCourse.delivered_badge)
                        : null
                    const isUsed =
                      usedBadgeIds.has(Number(b.badge_id)) && Number(b.badge_id) !== currentBadgeId
                    return (
                      <option key={b.badge_id} value={b.badge_id} disabled={isUsed}>
                        {b.badge_name}{isUsed ? ' (déjà attribué)' : ''}
                      </option>
                    )
                  })}
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

      {aiOpen ? (
        <ModalOverlayPortal
          role="dialog"
          aria-modal="true"
          aria-label="Générer un cours avec l’IA"
          onClick={(e) => {
            if (e.target === e.currentTarget && !aiLoading) setAiOpen(false)
          }}
        >
          <div className="course-map-modal card" onClick={(ev) => ev.stopPropagation()}>
            <div className="course-map-modal__head">
              <h2 className="section-title">Générer un cours avec l’IA</h2>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => !aiLoading && setAiOpen(false)}
                disabled={aiLoading}
              >
                Fermer
              </button>
            </div>
            <p className="muted">
              {aiStatus.model
                ? `Le serveur appelle ${aiStatus.model} et persiste cours + quiz + questions en une opération.`
                : 'Le serveur appelle Gemini et persiste cours + quiz + questions en une opération.'}
              {' '}Vous pourrez ensuite tout éditer depuis la liste des cours et la page Quiz.
            </p>
            {aiLoading ? (
              <p className="dash-alert" role="status" aria-live="polite">
                Génération en cours… L’appel à l’IA prend généralement 5 à 15 secondes.
                Ne fermez pas cette fenêtre.
              </p>
            ) : null}
            {aiError ? <p className="error">{aiError}</p> : null}
            <form className="stack-form" onSubmit={handleAiSubmit}>
              <label>
                Sujet du cours
                <textarea
                  rows={3}
                  value={aiForm.topic}
                  onChange={(e) => setAiForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="Ex. : Les fondamentaux du HTML pour débuter le développement web."
                  required
                />
              </label>
              <label>
                Thème
                <select
                  value={aiForm.theme_id}
                  onChange={(e) => setAiForm((f) => ({ ...f, theme_id: e.target.value }))}
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
                Niveau
                <select
                  value={aiForm.level}
                  onChange={(e) => setAiForm((f) => ({ ...f, level: e.target.value }))}
                >
                  <option value="debutant">Débutant</option>
                  <option value="intermediaire">Intermédiaire</option>
                  <option value="avance">Avancé</option>
                </select>
              </label>
              <label>
                Langue
                <select
                  value={aiForm.language}
                  onChange={(e) => setAiForm((f) => ({ ...f, language: e.target.value }))}
                >
                  <option value="fr">Français</option>
                  <option value="en">Anglais</option>
                </select>
              </label>
              <label>
                Nombre de questions de quiz
                <input
                  type="number"
                  min={3}
                  max={10}
                  value={aiForm.num_questions}
                  onChange={(e) => setAiForm((f) => ({ ...f, num_questions: e.target.value }))}
                />
              </label>
              <label>
                Pièces si réussite
                <input
                  type="number"
                  min={0}
                  value={aiForm.coins_on_success}
                  onChange={(e) => setAiForm((f) => ({ ...f, coins_on_success: e.target.value }))}
                />
              </label>
              <label>
                Score minimum pour valider (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={aiForm.min_score_to_pass}
                  onChange={(e) => setAiForm((f) => ({ ...f, min_score_to_pass: e.target.value }))}
                />
              </label>
              <label>
                Badge délivré (optionnel)
                <select
                  value={aiForm.delivered_badge}
                  onChange={(e) => setAiForm((f) => ({ ...f, delivered_badge: e.target.value }))}
                >
                  <option value="">Aucun</option>
                  {badges.map((b) => {
                    const isUsed = usedBadgeIds.has(Number(b.badge_id))
                    return (
                      <option key={b.badge_id} value={b.badge_id} disabled={isUsed}>
                        {b.badge_name}{isUsed ? ' (déjà attribué)' : ''}
                      </option>
                    )
                  })}
                </select>
              </label>
              <label>
                Ordre sur la carte
                <input
                  type="number"
                  min={0}
                  value={aiForm.map_order}
                  onChange={(e) => setAiForm((f) => ({ ...f, map_order: e.target.value }))}
                />
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn--primary" disabled={aiLoading || loadingRefs}>
                  {aiLoading ? 'Génération en cours…' : 'Générer le cours'}
                </button>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => !aiLoading && setAiOpen(false)}
                  disabled={aiLoading}
                >
                  Fermer
                </button>
              </div>
            </form>
          </div>
        </ModalOverlayPortal>
      ) : null}
    </div>
  )
}
