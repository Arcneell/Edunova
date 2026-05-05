import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getQuizPlay, getThemeMap, getThemes, submitQuiz } from '../api/user/learningMap.js'

const MAP_PATH_POINTS = [
  { x: 15, y: 8 },
  { x: 28, y: 16 },
  { x: 43, y: 12 },
  { x: 60, y: 18 },
  { x: 73, y: 22 },
  { x: 80, y: 34 },
  { x: 69, y: 43 },
  { x: 55, y: 42 },
  { x: 42, y: 47 },
  { x: 30, y: 45 },
  { x: 17, y: 50 },
  { x: 10, y: 62 },
  { x: 21, y: 70 },
  { x: 33, y: 76 },
  { x: 47, y: 73 },
  { x: 61, y: 76 },
  { x: 75, y: 73 },
]

function interpolatePoint(start, end, ratio) {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  }
}

function getNodePosition(index, total) {
  if (total <= 1) return { left: '15%', top: '8%' }
  const scaled = (index / (total - 1)) * (MAP_PATH_POINTS.length - 1)
  const lower = Math.floor(scaled)
  const upper = Math.min(lower + 1, MAP_PATH_POINTS.length - 1)
  const ratio = scaled - lower
  const point = interpolatePoint(MAP_PATH_POINTS[lower], MAP_PATH_POINTS[upper], ratio)
  return { left: `${point.x}%`, top: `${point.y}%` }
}

export default function CourseMap() {
  const [themes, setThemes] = useState([])
  const [selectedThemeId, setSelectedThemeId] = useState('')
  const [mapData, setMapData] = useState(null)
  const [loadingThemes, setLoadingThemes] = useState(true)
  const [loadingMap, setLoadingMap] = useState(false)
  const [mapValidated, setMapValidated] = useState(false)
  const [error, setError] = useState('')
  const [activeQuiz, setActiveQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [resultMessage, setResultMessage] = useState('')

  async function loadMap(themeId) {
    setLoadingMap(true)
    setError('')
    setResultMessage('')
    try {
      if (!themeId) {
        setMapData({ theme_title: 'Aucune thématique', checkpoints: [] })
        return
      }
      const data = await getThemeMap(themeId)
      setMapData(data)
      setMapValidated(true)
    } catch (e) {
      setError(e.message || 'Impossible de charger la carte.')
    } finally {
      setLoadingMap(false)
    }
  }

  useEffect(() => {
    async function loadThemes() {
      setLoadingThemes(true)
      setError('')
      try {
        const list = await getThemes()
        setThemes(list)
        setSelectedThemeId(String(list[0]?.theme_id ?? ''))
      } catch (e) {
        setError(e.message || 'Impossible de charger les thématiques.')
      } finally {
        setLoadingThemes(false)
      }
    }
    void loadThemes()
  }, [])

  const checkpoints = useMemo(() => mapData?.checkpoints ?? [], [mapData])

  async function handleOpenQuiz(checkpoint) {
    setResultMessage('')
    setError('')
    if (!checkpoint.quiz?.quiz_id) {
      setError('Ce cours n’a pas encore de quiz associé.')
      return
    }
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
      await loadMap(Number(selectedThemeId))
    } catch (e) {
      setError(e.data?.detail || e.message || 'Envoi du quiz impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleValidateMap(event) {
    event.preventDefault()
    setActiveQuiz(null)
    void loadMap(Number(selectedThemeId))
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
        <form className="stack-form" onSubmit={handleValidateMap}>
          <label>
            Thématique
            <select
              value={selectedThemeId}
              onChange={(e) => {
                setSelectedThemeId(e.target.value)
                setActiveQuiz(null)
                setMapValidated(false)
                setMapData(null)
              }}
              disabled={loadingThemes || loadingMap || themes.length === 0}
            >
              {themes.map((theme) => (
                <option key={theme.theme_id} value={theme.theme_id}>
                  {theme.theme_title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={!selectedThemeId || loadingThemes || loadingMap}
          >
            {loadingMap ? 'Chargement…' : 'Valider'}
          </button>
        </form>

        {loadingThemes ? <p className="muted">Chargement des thématiques…</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {resultMessage ? <p className="hint">{resultMessage}</p> : null}

        {!loadingThemes && !mapValidated ? (
          <p className="hint">Sélectionne une thématique puis clique sur Valider.</p>
        ) : null}

        {!loadingThemes && mapValidated ? (
          <div className="course-map">
            <div className="course-map__board" role="img" aria-label="Carte statique des cours">
              {checkpoints.map((checkpoint, index) => {
                const position = getNodePosition(index, checkpoints.length)
                const statusLabel =
                  checkpoint.status === 'completed'
                    ? 'Terminé'
                    : checkpoint.status === 'unlocked'
                      ? 'Débloqué'
                      : 'Verrouillé'
                return (
                  <button
                    key={checkpoint.course_id}
                    type="button"
                    className={`course-map__node course-map__node--${checkpoint.status}`}
                    style={position}
                    onClick={() => {
                      if (checkpoint.status !== 'locked') void handleOpenQuiz(checkpoint)
                    }}
                    disabled={checkpoint.status === 'locked'}
                    title={`${checkpoint.title} (${statusLabel})`}
                  >
                    <span className="course-map__node-order">{checkpoint.map_order}</span>
                  </button>
                )
              })}
            </div>

            {checkpoints.length > 0 ? (
              <p className="hint">
                Clique sur un point debloque pour lancer le quiz du cours correspondant.
              </p>
            ) : (
              <p className="hint">Aucun cours disponible sur cette thématique.</p>
            )}
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
