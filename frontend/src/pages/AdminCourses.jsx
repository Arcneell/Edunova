import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import {
  deleteFormateurCourse,
  getFormateurCourses,
  updateFormateurCourse,
} from '../api/user/formateur.js'
import { useAuth } from '../hooks/useAuth.js'
import { getReadableFormError } from '../utils/formErrors.js'

function adminLinkClass({ isActive }) {
  return `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
}

function normalizeRoleName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function isTrainer(user) {
  return normalizeRoleName(user?.role?.role_name) === 'formateur'
}

export default function AdminCourses() {
  const { user } = useAuth()
  const trainerAccount = isTrainer(user)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingCourse, setEditingCourse] = useState(null)
  const [editForm, setEditForm] = useState({
    course_title: '',
    body_content: '',
    map_order: 0,
  })
  const [savingEdit, setSavingEdit] = useState(false)

  async function loadCourses() {
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
  }

  useEffect(() => {
    void loadCourses()
  }, [])

  async function handleDelete(course) {
    if (!window.confirm(`Supprimer le cours "${course.course_title}" ?`)) return
    setError('')
    try {
      await deleteFormateurCourse(course.course_id)
      await loadCourses()
    } catch (e) {
      setError(getReadableFormError(e, 'La suppression du cours a échoué. Réessayez.'))
    }
  }

  function handleEditOpen(course) {
    setEditingCourse(course)
    setEditForm({
      course_title: course.course_title || '',
      body_content: course.body_content || '',
      map_order: Number(course.map_order || 0),
    })
  }

  function handleEditClose() {
    if (savingEdit) return
    setEditingCourse(null)
  }

  async function handleEditSubmit(event) {
    event.preventDefault()
    if (!editingCourse) return

    const nextTitle = editForm.course_title.trim()
    const nextContent = editForm.body_content.trim()
    if (!nextTitle) {
      setError('Le titre du cours est obligatoire.')
      return
    }

    setError('')
    setSavingEdit(true)
    try {
      await updateFormateurCourse(editingCourse.course_id, {
        course_title: nextTitle,
        body_content: nextContent,
        map_order: Number(editForm.map_order) || 0,
      })
      await loadCourses()
      setEditingCourse(null)
    } catch (e) {
      setError(getReadableFormError(e, 'La modification du cours a échoué. Vérifiez les champs et réessayez.'))
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <div className="page">
      <nav className="admin-nav" aria-label="Navigation admin">
        <NavLink to="/admin" end className={adminLinkClass}>
          Dashboard
        </NavLink>
        {user?.is_staff ? (
          <NavLink to="/admin/users" className={adminLinkClass}>
            Utilisateurs
          </NavLink>
        ) : null}
        <NavLink to="/admin/cours" className={adminLinkClass}>
          Cours
        </NavLink>
        <NavLink to="/admin/quizz" className={adminLinkClass}>
          Quiz
        </NavLink>
      </nav>

      <header className="page-header">
        <p className="page-header__eyebrow">Administration</p>
        <h1>Gestion des cours</h1>
        <p className="page-header__lead">
          Créez, organisez et suivez les contenus de formation depuis un seul espace.
        </p>
      </header>

      <section className="admin-cards">
        {loading ? <p className="muted">Chargement des cours...</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {!loading && !error && courses.length === 0 ? (
          <p className="dash-empty">Aucun cours disponible en base.</p>
        ) : null}

        {!loading && !error
          ? courses.map((course) => (
              <article key={course.course_id} className="card admin-card">
                <div className="admin-card__head">
                  <h2>{course.course_title}</h2>
                  <span className="dash-badge dash-badge--purple">Publié</span>
                </div>
                <p className="muted">
                  #{course.course_id} · Ordre carte {course.map_order}
                </p>
                <p className="muted">Thème ID: {course.theme} · Quiz ID: {course.validating_quiz}</p>
                {trainerAccount ? <p className="muted">Cours visible depuis la base globale.</p> : null}
                <div className="hero-actions admin-card__actions">
                  <button type="button" className="btn btn--secondary" onClick={() => handleEditOpen(course)}>
                    Modifier
                  </button>
                  <button type="button" className="btn btn--secondary" onClick={() => handleDelete(course)}>
                    Supprimer
                  </button>
                  <Link to="/admin/quizz" className="btn btn--primary">
                    Gérer les quiz
                  </Link>
                </div>
              </article>
            ))
          : null}
      </section>

      {editingCourse ? (
        <div className="course-map-modal__overlay" role="dialog" aria-modal="true" aria-label="Modifier un cours">
          <div className="course-map-modal card">
            <div className="course-map-modal__head">
              <h2 className="section-title">Modifier le cours</h2>
              <button type="button" className="btn btn--secondary" onClick={handleEditClose} disabled={savingEdit}>
                Fermer
              </button>
            </div>
            <form className="stack-form" onSubmit={handleEditSubmit}>
              <label>
                Titre du cours
                <input
                  type="text"
                  value={editForm.course_title}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, course_title: e.target.value }))}
                  required
                />
              </label>

              <label>
                Contenu du cours
                <textarea
                  rows={8}
                  value={editForm.body_content}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, body_content: e.target.value }))}
                  placeholder="Décrivez le contenu pédagogique du cours..."
                />
              </label>

              <label>
                Ordre sur la carte
                <input
                  type="number"
                  min={0}
                  value={editForm.map_order}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, map_order: e.target.value }))}
                />
              </label>

              <div className="hero-actions">
                <button type="submit" className="btn btn--primary" disabled={savingEdit}>
                  {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button type="button" className="btn btn--secondary" onClick={handleEditClose} disabled={savingEdit}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
