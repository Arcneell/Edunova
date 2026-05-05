import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getQuizPlay, getThemeMap, getThemes, submitQuiz } from '../api/user/learningMap.js'

export default function CourseMap() {
  const [themes, setThemes] = useState([])
  const [selectedThemeId, setSelectedThemeId] = useState('')
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [resultMessage, setResultMessage] = useState('')

  async function loadMap(themeIdOverride) {
    setLoading(true)
    setError('')
    setResultMessage('')
    try {
      const list = await getThemes()
      setThemes(list)
      const nextThemeId = themeIdOverride ?? selectedThemeId ?? list[0]?.theme_id
      if (!nextThemeId) {
        setMapData({ theme_title: 'Aucune thématique', checkpoints: [] })
        return
      }
      setSelectedThemeId(String(nextThemeId))
      const data = await getThemeMap(nextThemeId)
      setMapData(data)
    } catch (e) {
      setError(e.message || 'Impossible de charger la carte.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMap()
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkpoints = useMemo(() => mapData?.checkpoints ?? [], [mapData])

  async function handleOpenQuiz(checkpoint) {
    setResultMessage('')
    setError('')
    try {
      const quiz = await getQuizPlay(checkpoint.quiz.quiz_id)
      setActiveQuiz({
        checkpoint,
        quiz,
      })
      setAnswers({})
    } catch (e) {
      setError(e.message || 'Impossible de charger le quiz.')
    }
  }

  async function handleSubmitQuiz(event) {
    event.preventDefault()
    if (!activeQuiz) return
    setSubmitting(true)
    setError('')
    setResultMessage('')
    try {
      const payload = Object.fromEntries(
        Object.entries(answers)
          .filter(([, answerId]) => answerId)
          .map(([questionId, answerId]) => [questionId, Number(answerId)]),
      )
      const result = await submitQuiz(activeQuiz.quiz.quiz_id, payload)
      setResultMessage(
        result.passed
          ? `Bravo ! Score ${result.score}% — checkpoint validé.`
          : `Score ${result.score}% — essaie encore pour débloquer la suite.`,
      )
      setActiveQuiz(null)
      setAnswers({})
      await loadMap(selectedThemeId)
    } catch (e) {
      setError(e.data?.detail || e.message || 'Envoi du quiz impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="page-header__eyebrow">Parcours</p>
        <h1>Ma thématique</h1>
        <p className="page-header__lead">
          Avance checkpoint par checkpoint. Chaque quiz validé débloque le point suivant.
        </p>
      </header>

      <section className="card">
        <div className="stack-form">
          <label>
            Thématique
            <select
              value={selectedThemeId}
              onChange={(e) => {
                const next = e.target.value
                setSelectedThemeId(next)
                setActiveQuiz(null)
                void loadMap(next)
              }}
              disabled={loading || themes.length === 0}
            >
              {themes.map((theme) => (
                <option key={theme.theme_id} value={theme.theme_id}>
                  {theme.theme_title}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? <p className="muted">Chargement de la map…</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {resultMessage ? <p className="hint">{resultMessage}</p> : null}

        {!loading ? (
          <div className="course-map">
            {checkpoints.map((checkpoint) => (
              <article
                key={checkpoint.course_id}
                className={`course-node course-node--${checkpoint.status}`}
              >
                <div className="course-node__head">
                  <span className="course-node__order">#{checkpoint.map_order}</span>
                  <span className="dash-pill dash-pill--muted">
                    {checkpoint.status === 'completed'
                      ? 'Terminé'
                      : checkpoint.status === 'unlocked'
                        ? 'Débloqué'
                        : 'Verrouillé'}
                  </span>
                </div>
                <h2>{checkpoint.title}</h2>
                <p className="muted">
                  Score mini: {checkpoint.quiz.min_score_to_pass}% · Meilleur score:{' '}
                  {checkpoint.best_score}%
                </p>

                {checkpoint.status === 'locked' ? (
                  <p className="hint">Valide le checkpoint précédent pour y accéder.</p>
                ) : (
                  <div className="hero-actions">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => void handleOpenQuiz(checkpoint)}
                    >
                      {checkpoint.status === 'completed' ? 'Rejouer le quiz' : 'Passer le quiz'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {activeQuiz ? (
        <section className="card course-quiz">
          <h2 className="section-title">
            Quiz du checkpoint: {activeQuiz.checkpoint.title}
          </h2>
          <form className="stack-form" onSubmit={handleSubmitQuiz}>
            {activeQuiz.quiz.questions.map((question, index) => (
              <fieldset key={question.question_id} className="quiz-question">
                <legend>
                  {index + 1}. {question.question_content}
                </legend>
                {question.answers.map((answer) => (
                  <label key={answer.answer_id} className="quiz-answer">
                    <input
                      type="radio"
                      name={`q-${question.question_id}`}
                      value={answer.answer_id}
                      checked={String(answers[question.question_id] || '') === String(answer.answer_id)}
                      onChange={(e) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.question_id]: e.target.value,
                        }))
                      }
                    />
                    <span>{answer.label_answer}</span>
                  </label>
                ))}
              </fieldset>
            ))}

            <div className="hero-actions">
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Validation…' : 'Valider le quiz'}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setActiveQuiz(null)
                  setAnswers({})
                }}
              >
                Annuler
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="hero-actions">
        <Link to="/compte" className="btn btn--secondary">
          Retour au compte
        </Link>
      </div>
    </div>
  )
}
