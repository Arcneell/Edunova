import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getQuizPlay, getThemeMap, getThemes, submitQuiz } from '../api/user/learningMap.js'
import { getReadableFormError } from '../utils/formErrors.js'

const COURSE_FIXED_POINTS = [
  { x: 18.0, y: 88.8 },
  { x: 44.7, y: 55.5 },
  { x: 63.6, y: 76.4 },
  { x: 74.4, y: 63.0 },
  { x: 74.6, y: 43.2 },
]

function interpolatePoint(start, end, ratio) {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  }
}

function getNodePosition(index, total, points) {
  if (points[index]) {
    return { left: `${points[index].x}%`, top: `${points[index].y}%` }
  }
  if (total <= 1) return { left: `${points[0].x}%`, top: `${points[0].y}%` }
  const scaled = (index / (total - 1)) * (points.length - 1)
  const lower = Math.floor(scaled)
  const upper = Math.min(lower + 1, points.length - 1)
  const ratio = scaled - lower
  const point = interpolatePoint(points[lower], points[upper], ratio)
  return { left: `${point.x}%`, top: `${point.y}%` }
}

function buildMapNodes(checkpoints) {
  const courseNodes = []
  checkpoints.forEach((checkpoint, index) => {
    courseNodes.push({
      id: `course-${checkpoint.course_id}`,
      kind: 'course',
      checkpoint,
      status: checkpoint.status,
      position: getNodePosition(index, checkpoints.length, COURSE_FIXED_POINTS),
    })
  })
  return courseNodes
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
  const [selectedNode, setSelectedNode] = useState(null)

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
      setError(getReadableFormError(e, 'Impossible de charger la carte pour cette thématique.'))
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
        setError(getReadableFormError(e, 'Impossible de charger la liste des thématiques.'))
      } finally {
        setLoadingThemes(false)
      }
    }
    void loadThemes()
  }, [])

  const checkpoints = useMemo(() => mapData?.checkpoints ?? [], [mapData])
  const mapNodes = useMemo(() => buildMapNodes(checkpoints), [checkpoints])

  async function handleOpenQuiz(checkpoint, nodeKind = 'quiz') {
    setResultMessage('')
    setError('')
    if (!checkpoint.quiz?.quiz_id) {
      setError('Ce cours n’a pas encore de quiz associé.')
      return
    }
    try {
      const quiz = await getQuizPlay(checkpoint.quiz.quiz_id)
      setSelectedNode({ kind: nodeKind, checkpoint })
      setActiveQuiz({
        checkpoint,
        quiz,
      })
      setAnswers({})
    } catch (e) {
      setError(getReadableFormError(e, 'Impossible de charger ce quiz pour le moment.'))
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
      setError(getReadableFormError(e, "L'envoi des réponses a échoué. Réessayez."))
    } finally {
      setSubmitting(false)
    }
  }

  function handleValidateMap(event) {
    event.preventDefault()
    setActiveQuiz(null)
    setSelectedNode(null)
    void loadMap(Number(selectedThemeId))
  }

  function handleCloseMap() {
    setMapValidated(false)
    setMapData(null)
    setActiveQuiz(null)
    setSelectedNode(null)
    setAnswers({})
    setError('')
  }

  return (
    <div className="page">
      {!mapValidated ? (
        <>
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
                setSelectedNode(null)
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

          </section>
        </>
      ) : null}

      {!loadingThemes && mapValidated ? (
        <section className="course-map-fullscreen">
          <div className="course-map-fullscreen__topbar">
            <strong>{mapData?.theme_title || 'Thématique'}</strong>
            <button type="button" className="btn btn--secondary" onClick={handleCloseMap}>
              Quitter la map
            </button>
          </div>
          <div className="course-map course-map--fullscreen">
            <div className="course-map__board" role="img" aria-label="Carte statique des cours">
              {mapNodes.map((node) => {
                const position = node.position
                const checkpoint = node.checkpoint
                const typeLabel = node.kind === 'quiz' ? 'Quiz' : 'Cours'
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`course-map__node course-map__node--${checkpoint.status} course-map__node--${node.kind}`}
                    style={position}
                    onClick={() => {
                      if (checkpoint.status === 'locked') return
                      if (node.kind === 'quiz') {
                        void handleOpenQuiz(checkpoint, 'quiz')
                      } else {
                        setSelectedNode(node)
                        setActiveQuiz(null)
                      }
                    }}
                    disabled={checkpoint.status === 'locked'}
                    title={`${typeLabel} · ${checkpoint.title}`}
                  >
                    <span className="course-map__node-order">
                      {node.kind === 'quiz' ? 'Q' : checkpoint.map_order}
                    </span>
                  </button>
                )
              })}
            </div>
            {mapNodes.length === 0 ? (
              <p className="hint">Aucun cours disponible sur cette thématique.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {selectedNode ? (
        <div className="course-map-modal__overlay" onClick={() => {
          setSelectedNode(null)
          setActiveQuiz(null)
          setAnswers({})
        }}>
          <section className="course-map-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="course-map-modal__head">
              <h2 className="section-title">
                {selectedNode.kind === 'quiz' ? 'Quiz' : 'Cours'}: {selectedNode.checkpoint.title}
              </h2>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setSelectedNode(null)
                  setActiveQuiz(null)
                  setAnswers({})
                }}
              >
                Fermer
              </button>
            </div>

            {selectedNode.kind === 'course' ? (
              <div className="stack-form">
                <p className="muted">
                  Cours #{selectedNode.checkpoint.course_id} · Ordre {selectedNode.checkpoint.map_order}
                </p>
                <div className="hero-actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={!selectedNode.checkpoint.quiz?.quiz_id}
                    onClick={() => void handleOpenQuiz(selectedNode.checkpoint, 'quiz')}
                  >
                    Lancer le quiz du cours
                  </button>
                </div>
              </div>
            ) : null}

            {activeQuiz ? (
              <form className="stack-form course-quiz" onSubmit={handleSubmitQuiz}>
                {activeQuiz.quiz.questions.map((question, index) => (
                  <fieldset key={question.question_id} className="quiz-question">
                    <legend>
                      {index + 1}. {question.question_content}
                    </legend>
                    <div className="quiz-answers-grid">
                      {question.answers.map((answer, answerIndex) => (
                        <label
                          key={answer.answer_id}
                          className={`quiz-answer quiz-answer--${answerIndex % 4}`}
                        >
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
                          <span className="quiz-answer__marker" aria-hidden="true" />
                          <span>{answer.label_answer}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}

                <div className="hero-actions">
                  <button type="submit" className="btn btn--primary" disabled={submitting}>
                    {submitting ? 'Validation…' : 'Valider le quiz'}
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      ) : null}

      <div className="hero-actions">
        <Link to="/compte" className="btn btn--secondary">
          Retour au compte
        </Link>
      </div>
    </div>
  )
}
