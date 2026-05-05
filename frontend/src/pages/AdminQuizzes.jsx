import { useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

const demoQuizzes = [
  {
    id: 'QZ-JS-01',
    title: 'Quiz JavaScript Fondamentaux',
    course: 'Bases JavaScript',
    questions: [
      {
        id: 'Q1',
        label: 'Quel mot-clé déclare une constante ?',
        answers: ['let', 'const', 'var'],
        correct: 'const',
      },
      {
        id: 'Q2',
        label: 'Quel type retourne typeof [] ?',
        answers: ['array', 'object', 'list'],
        correct: 'object',
      },
    ],
  },
  {
    id: 'QZ-RC-02',
    title: 'Quiz React Intermédiaire',
    course: 'React intermédiaire',
    questions: [
      {
        id: 'Q1',
        label: "Quel hook gère l'état local ?",
        answers: ['useState', 'useRoute', 'useMemoizedValue'],
        correct: 'useState',
      },
    ],
  },
]

function adminLinkClass({ isActive }) {
  return `admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`
}

export default function AdminQuizzes() {
  const { user } = useAuth()
  const [selectedQuizId, setSelectedQuizId] = useState(demoQuizzes[0]?.id ?? '')
  const quiz = useMemo(
    () => demoQuizzes.find((q) => q.id === selectedQuizId) ?? null,
    [selectedQuizId]
  )

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
        <h1>Gestion des quiz</h1>
        <p className="page-header__lead">
          Pilotez les quiz et leurs questions/réponses depuis une vue dédiée.
        </p>
      </header>

      <section className="card admin-grid">
        <article>
          <h2 className="section-title">Quiz</h2>
          <div className="stack-form">
            <label>
              Sélectionner un quiz
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
              >
                {demoQuizzes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} · {item.course}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="hint">
            Astuce: ajoutez une action backend sur cette page pour créer, archiver ou
            publier un quiz.
          </p>
        </article>

        <article>
          <h2 className="section-title">Questions / Réponses</h2>
          {!quiz ? (
            <p className="dash-empty">Aucun quiz sélectionné.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Question</th>
                    <th>Réponses possibles</th>
                    <th>Bonne réponse</th>
                  </tr>
                </thead>
                <tbody>
                  {quiz.questions.map((question) => (
                    <tr key={question.id}>
                      <td>{question.id}</td>
                      <td>{question.label}</td>
                      <td>{question.answers.join(' · ')}</td>
                      <td>
                        <span className="dash-pill dash-pill--blue">{question.correct}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
