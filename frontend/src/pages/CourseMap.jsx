import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import CourseMapBoardSvg from '../components/CourseMapBoardSvg.jsx'
import {
  getCourseDetail,
  getQuizPlay,
  getThemeMap,
  getThemes,
  submitQuiz,
} from '../api/user/learningMap.js'
import { getReadableFormError } from '../utils/formErrors.js'
import { useAuth } from '../hooks/useAuth.js'
import { buildCourseMapLayout, routePointsUpTo } from '../map/courseMapGeometry.js'

export default function CourseMap() {
  const { user } = useAuth()
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
  const [courseDetail, setCourseDetail] = useState(null)
  const [loadingCourse, setLoadingCourse] = useState(false)
  const [courseRead, setCourseRead] = useState(false)

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

  const rawCheckpoints = useMemo(() => mapData?.checkpoints ?? [], [mapData])
  const mapLayout = useMemo(() => buildCourseMapLayout(rawCheckpoints), [rawCheckpoints])
  const checkpoints = useMemo(() => mapLayout.nodes.map((n) => n.checkpoint), [mapLayout])
  const activeQuestCourseId = useMemo(() => {
    const next = checkpoints.find((c) => c.status === 'unlocked')
    return next?.course_id ?? null
  }, [checkpoints])
  const mapNodes = mapLayout.nodes
  const completedRoutePoints = useMemo(
    () => routePointsUpTo(mapLayout.routePercents, mapLayout.activeIndex),
    [mapLayout.routePercents, mapLayout.activeIndex],
  )
  const activePlayerNode = useMemo(() => {
    if (!mapLayout.nodes.length || mapLayout.activeIndex < 0) return null
    return mapLayout.nodes[mapLayout.activeIndex]
  }, [mapLayout.nodes, mapLayout.activeIndex])

  async function handleSelectNode(node) {
    if (node.checkpoint.status === 'locked') return
    setActiveQuiz(null)
    setAnswers({})
    setCourseRead(false)
    setCourseDetail(null)
    setSelectedNode(node)
    setLoadingCourse(true)
    setError('')
    try {
      const detail = await getCourseDetail(node.checkpoint.course_id)
      setCourseDetail(detail)
    } catch (e) {
      setError(getReadableFormError(e, 'Impossible de charger ce cours pour le moment.'))
    } finally {
      setLoadingCourse(false)
    }
  }

  function handleCloseNode() {
    setSelectedNode(null)
    setActiveQuiz(null)
    setAnswers({})
    setCourseDetail(null)
    setCourseRead(false)
  }

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
        <section className="course-map-scope course-map-fullscreen" aria-label="Parcours plein écran">
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

          <div className="course-map-rpg__body">
            <aside className="course-map-rpg__legend" aria-label="Progression des étapes">
              <h2 className="course-map-rpg__legend-head">Journal de quête</h2>
              {checkpoints.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  Aucun cours sur cette thématique.
                </p>
              ) : (
                <ol className="course-map-rpg__steps">
                  {mapNodes.map((node) => {
                    const cp = node.checkpoint
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
                        <span className="course-map-rpg__step-num">Lv {node.level}</span>
                        <div className="course-map-rpg__step-meta">
                          <strong title={cp.title}>{cp.title}</strong>
                          <span>
                            {cp.status === 'completed' && cp.best_score != null
                              ? `Meilleur score : ${cp.best_score}%`
                              : cp.quiz?.quiz_id
                                ? `${node.biome.label} · valide le quiz`
                                : `${node.biome.label} · pas de quiz`}
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
                <div className="course-map__surface">
                  <CourseMapBoardSvg
                    fullRoute={mapLayout.routePercents}
                    completedRoute={completedRoutePoints}
                  />
                </div>
                {mapNodes.map((node) => {
                  const checkpoint = node.checkpoint
                  const label =
                    checkpoint.status === 'completed'
                      ? 'Terminé'
                      : checkpoint.status === 'locked'
                        ? 'Verrouillé'
                        : 'À jouer'
                  return (
                    <button
                      key={node.id}
                      type="button"
                      className={`course-map__node course-map__node--${checkpoint.status}`}
                      data-biome={node.biome.id}
                      style={node.style}
                      onClick={() => handleSelectNode(node)}
                      disabled={checkpoint.status === 'locked'}
                      aria-label={`Niveau ${node.level} — ${checkpoint.title} — ${label}`}
                      title={`Lv ${node.level} · ${checkpoint.title}`}
                    >
                      {checkpoint.status === 'locked' ? (
                        <span className="course-map__node-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5" y="11" width="14" height="9" rx="2" />
                            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                          </svg>
                        </span>
                      ) : checkpoint.status === 'completed' ? (
                        <span className="course-map__node-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </span>
                      ) : (
                        <>
                          <span className="course-map__node-level">Lv</span>
                          <span className="course-map__node-num">{node.level}</span>
                        </>
                      )}
                    </button>
                  )
                })}
                {activePlayerNode ? (
                  <div
                    className="course-map__player"
                    style={activePlayerNode.style}
                    title="Ta position sur le parcours"
                    aria-hidden="true"
                  >
                    {user?.current_avatar_url ? (
                      <img src={user.current_avatar_url} alt="" className="course-map__player-avatar" />
                    ) : (
                      <span className="course-map__player-fallback">
                        {(user?.email || '?')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                ) : null}
                {mapNodes.length === 0 ? (
                  <div className="course-map__hint-empty" role="status">
                    Aucun point de passage sur cette carte. Choisis une autre thématique ou contacte un
                    formateur.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {selectedNode
        ? createPortal(
            <div className="course-map-modal__overlay" onClick={handleCloseNode}>
              <section className="course-map-modal card" onClick={(event) => event.stopPropagation()}>
            <div className="course-map-modal__head">
              <h2 className="section-title">
                {activeQuiz ? 'Quiz' : 'Cours'} · Lv {selectedNode.level} — {selectedNode.checkpoint.title}
              </h2>
              <button type="button" className="btn btn--secondary" onClick={handleCloseNode}>
                Fermer
              </button>
            </div>

            {!activeQuiz ? (
              <div className="stack-form">
                {loadingCourse ? (
                  <p className="muted">Chargement du cours…</p>
                ) : courseDetail ? (
                  <>
                    <article
                      className="course-map-modal__body"
                      // body_content : texte simple côté backend, on respecte les sauts de ligne.
                    >
                      {(courseDetail.body_content || '').trim() ? (
                        courseDetail.body_content
                          .split(/\n{2,}/)
                          .map((para, i) => <p key={i}>{para}</p>)
                      ) : (
                        <p className="muted">Ce cours n'a pas encore de contenu rédigé.</p>
                      )}
                    </article>
                    <label className="course-map-modal__read">
                      <input
                        type="checkbox"
                        checked={courseRead}
                        onChange={(e) => setCourseRead(e.target.checked)}
                      />
                      <span>J'ai lu le cours</span>
                    </label>
                    <div className="hero-actions">
                      <button
                        type="button"
                        className="btn btn--primary"
                        disabled={!courseRead || !selectedNode.checkpoint.quiz?.quiz_id}
                        onClick={() => void handleOpenQuiz(selectedNode.checkpoint, 'quiz')}
                      >
                        {selectedNode.checkpoint.quiz?.quiz_id
                          ? 'Lancer le quiz du cours'
                          : 'Pas de quiz pour ce cours'}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted">Cours indisponible.</p>
                )}
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
