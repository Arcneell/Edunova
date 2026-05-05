import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import CourseMapBoardSvg from '../components/CourseMapBoardSvg.jsx'
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
      const id = Number(themeId)
      if (!themeId || Number.isNaN(id) || id <= 0) {
        setMapData({ theme_title: 'Aucune thématique', checkpoints: [] })
        return
      }
      const data = await getThemeMap(id)
      setMapData(data)
      setMapValidated(true)
    } catch (e) {
      setError(getReadableFormError(e, 'Impossible de charger la carte pour cette thématique.'))
    } finally {
      setLoadingMap(false)
    }
  }

  useEffect(() => {
    if (!mapValidated) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [mapValidated])

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
  const activeQuestCourseId = useMemo(() => {
    const next = checkpoints.find((c) => c.status === 'unlocked')
    return next?.course_id ?? null
  }, [checkpoints])
  const mapNodes = useMemo(() => buildMapNodes(checkpoints), [checkpoints])
  const routePathPoints = useMemo(() => {
    if (checkpoints.length < 2) return []
    return checkpoints.map((_, i) => {
      const pos = getNodePosition(i, checkpoints.length, COURSE_FIXED_POINTS)
      return { x: parseFloat(pos.left), y: parseFloat(pos.top) }
    })
  }, [checkpoints])

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
              className="select-field"
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
        <section className="course-map-fullscreen" aria-label="Parcours plein écran">
              <header className="course-map-rpg__header">
                <div className="course-map-rpg__title-block">
                  <p className="course-map-rpg__eyebrow">Quête de formation</p>
                  <strong>{mapData?.theme_title || 'Thématique'}</strong>
                </div>
                <div className="hero-actions" style={{ margin: 0 }}>
                  <Link to="/compte" className="btn btn--secondary">
                    Mon compte
                  </Link>
                  <button type="button" className="btn btn--primary" onClick={handleCloseMap}>
                    Quitter la map
                  </button>
                </div>
              </header>

              <div className="course-map course-map--fullscreen">
                <div className="course-map-rpg__body">
                  <aside className="course-map-rpg__legend" aria-label="Progression des étapes">
                    <h2 className="course-map-rpg__legend-head">Journal de quête</h2>
                    {checkpoints.length === 0 ? (
                      <p className="muted" style={{ margin: 0 }}>
                        Aucun cours sur cette thématique.
                      </p>
                    ) : (
                      <ol className="course-map-rpg__steps">
                        {checkpoints.map((cp) => {
                          const isCurrent = cp.status === 'unlocked' && cp.course_id === activeQuestCourseId
                          const stepClass = [
                            'course-map-rpg__step',
                            cp.status === 'completed' && 'course-map-rpg__step--completed',
                            isCurrent && 'course-map-rpg__step--current',
                            cp.status === 'locked' && 'course-map-rpg__step--locked',
                          ]
                            .filter(Boolean)
                            .join(' ')
                          const badge =
                            cp.status === 'completed'
                              ? { label: 'Terminé', cls: 'course-map-rpg__badge--ok' }
                              : cp.status === 'unlocked'
                                ? { label: 'En cours', cls: 'course-map-rpg__badge--wip' }
                                : { label: 'Verrouillé', cls: 'course-map-rpg__badge--locked' }
                          return (
                            <li key={cp.course_id} className={stepClass}>
                              <span className="course-map-rpg__step-num">{cp.map_order}</span>
                              <div className="course-map-rpg__step-meta">
                                <strong title={cp.title}>{cp.title}</strong>
                                <span>
                                  {cp.status === 'completed' && cp.best_score != null
                                    ? `Meilleur score : ${cp.best_score}%`
                                    : cp.quiz?.quiz_id
                                      ? 'Valide le quiz pour avancer'
                                      : 'Pas de quiz de validation'}
                                </span>
                              </div>
                              <span className={`course-map-rpg__badge ${badge.cls}`}>{badge.label}</span>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </aside>

                  <div className="course-map-rpg__arena">
                    <div className="course-map__board" role="region" aria-label="Carte du parcours de cours">
                      <CourseMapBoardSvg pathPoints={routePathPoints} />
                      {mapNodes.map((node) => {
                        const position = node.position
                        const checkpoint = node.checkpoint
                        return (
                          <button
                            key={node.id}
                            type="button"
                            className={`course-map__node course-map__node--${checkpoint.status}`}
                            style={position}
                            onClick={() => {
                              if (checkpoint.status === 'locked') return
                              setSelectedNode(node)
                              setActiveQuiz(null)
                            }}
                            disabled={checkpoint.status === 'locked'}
                            title={`Cours · ${checkpoint.title}`}
                          >
                            <span className="course-map__node-order">{checkpoint.map_order}</span>
                          </button>
                        )
                      })}
                      {mapNodes.length === 0 ? (
                        <div className="course-map__hint-empty" role="status">
                          Aucun point de passage sur cette carte. Choisis une autre thématique ou contacte un
                          formateur.
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>
      ) : null}

      {selectedNode
        ? createPortal(
            <div
              className="course-map-modal__overlay"
              onClick={() => {
                setSelectedNode(null)
                setActiveQuiz(null)
                setAnswers({})
              }}
            >
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
            </div>,
            document.body,
          )
        : null}

      {!mapValidated ? (
        <div className="hero-actions">
          <Link to="/compte" className="btn btn--secondary">
            Retour au compte
          </Link>
        </div>
      ) : null}
    </div>
  )
}
