import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createFormateurAnswer,
  createFormateurQuestion,
  createFormateurQuiz,
  deleteFormateurAnswer,
  deleteFormateurQuestion,
  deleteFormateurQuiz,
  getFormateurQuestionAnswers,
  getFormateurQuizQuestions,
  getFormateurQuizzes,
  updateFormateurAnswer,
  updateFormateurQuestion,
  updateFormateurQuiz,
} from '../api/user/formateur.js'
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

async function loadQuestionsWithAnswers(quizId) {
  const raw = await getFormateurQuizQuestions(quizId)
  const list = Array.isArray(raw) ? raw : []
  return Promise.all(
    list.map(async (q) => ({
      question_id: q.question_id,
      question_content: q.question_content || '',
      xp_value: Number(q.xp_value) || 0,
      answers: await getFormateurQuestionAnswers(q.question_id).then((a) => (Array.isArray(a) ? a : [])),
    })),
  )
}

function QuizSettingsInner({ quiz, onQuizUpdated, onQuizDeleted }) {
  const [coins_on_success, setCoins] = useState(() => Number(quiz.coins_on_success) || 0)
  const [min_score_to_pass, setScore] = useState(() => Number(quiz.min_score_to_pass) || 0)
  const [quizErr, setQuizErr] = useState('')
  const [savingQuiz, setSavingQuiz] = useState(false)

  async function handleSaveQuiz(event) {
    event.preventDefault()
    const coins = Number(coins_on_success)
    const score = Number(min_score_to_pass)
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setQuizErr('Le score minimal doit être entre 0 et 100.')
      return
    }
    if (!Number.isFinite(coins) || coins < 0) {
      setQuizErr('Les pièces doivent être un nombre positif ou zéro.')
      return
    }
    setSavingQuiz(true)
    setQuizErr('')
    try {
      await updateFormateurQuiz(quiz.quiz_id, {
        coins_on_success: Math.floor(coins),
        min_score_to_pass: Math.floor(score),
      })
      await onQuizUpdated()
    } catch (e) {
      setQuizErr(formatApiError(e.data) || e?.message || 'Mise à jour du quiz impossible.')
    } finally {
      setSavingQuiz(false)
    }
  }

  async function handleDeleteQuiz() {
    if (!window.confirm('Supprimer ce quiz et tout son contenu (questions/réponses) ?')) return
    setQuizErr('')
    try {
      await deleteFormateurQuiz(quiz.quiz_id)
      await onQuizDeleted()
    } catch (e) {
      setQuizErr(formatApiError(e.data) || e?.message || 'Suppression impossible.')
    }
  }

  return (
    <form className="stack-form quiz-settings-form" onSubmit={handleSaveQuiz}>
      {quizErr ? <p className="error">{quizErr}</p> : null}
      <label>
        Pièces attribuées si réussi
        <input
          type="number"
          min={0}
          value={coins_on_success}
          onChange={(e) => setCoins(e.target.value)}
        />
      </label>
      <label>
        Score minimal pour valider (0 à 100)
        <input
          type="number"
          min={0}
          max={100}
          value={min_score_to_pass}
          onChange={(e) => setScore(e.target.value)}
        />
      </label>
      <div className="hero-actions">
        <button type="submit" className="btn btn--primary" disabled={savingQuiz}>
          {savingQuiz ? 'Enregistrement…' : 'Enregistrer le quiz'}
        </button>
        <button type="button" className="btn btn--secondary" onClick={handleDeleteQuiz}>
          Supprimer ce quiz
        </button>
      </div>
    </form>
  )
}

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [questionIndex, setQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [error, setError] = useState('')
  const [panelError, setPanelError] = useState('')
  const [newQuizOpen, setNewQuizOpen] = useState(false)
  const [newQuizForm, setNewQuizForm] = useState({ coins_on_success: 50, min_score_to_pass: 70 })
  const [creatingQuiz, setCreatingQuiz] = useState(false)
  const [newQuestionOpen, setNewQuestionOpen] = useState(false)
  const [newQuestionForm, setNewQuestionForm] = useState({ question_content: '', xp_value: 10 })
  const [savingQuestion, setSavingQuestion] = useState(false)
  const [editQuestion, setEditQuestion] = useState(null)
  const [editAnswer, setEditAnswer] = useState(null)
  const [newAnswerForQuestion, setNewAnswerForQuestion] = useState(null)

  const refreshQuizzes = useCallback(async (selectId) => {
    const data = await getFormateurQuizzes()
    const list = Array.isArray(data) ? data : []
    setQuizzes(list)
    if (selectId != null) {
      setSelectedQuizId(String(selectId))
      return
    }
    setSelectedQuizId((prev) => {
      if (prev && list.some((q) => String(q.quiz_id) === String(prev))) return prev
      return list[0] ? String(list[0].quiz_id) : ''
    })
  }, [])

  useEffect(() => {
    async function run() {
      setLoading(true)
      setError('')
      try {
        await refreshQuizzes(null)
      } catch (e) {
        setError(formatApiError(e.data) || e?.message || 'Impossible de charger les quiz.')
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [refreshQuizzes])

  const selectedQuiz = useMemo(
    () => quizzes.find((q) => String(q.quiz_id) === String(selectedQuizId)) ?? null,
    [quizzes, selectedQuizId],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialiser l’index à chaque nouveau quiz sélectionné
    setQuestionIndex(0)
  }, [selectedQuizId])

  const reloadQuestions = useCallback(
    async (opts = {}) => {
      const { goToLastQuestion = false } = opts
      if (!selectedQuizId) {
        setQuestions([])
        return
      }
      setLoadingQuestions(true)
      setPanelError('')
      try {
        const next = await loadQuestionsWithAnswers(Number(selectedQuizId))
        setQuestions(next)
        if (goToLastQuestion && next.length > 0) {
          setQuestionIndex(next.length - 1)
        } else {
          setQuestionIndex((i) => (next.length === 0 ? 0 : Math.min(i, next.length - 1)))
        }
      } catch (e) {
        setPanelError(formatApiError(e.data) || e?.message || 'Chargement des questions impossible.')
        setQuestions([])
      } finally {
        setLoadingQuestions(false)
      }
    },
    [selectedQuizId],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- rechargement questions/quiz sélectionné
    void reloadQuestions()
  }, [reloadQuestions])

  async function handleCreateQuiz(event) {
    event.preventDefault()
    const coins = Number(newQuizForm.coins_on_success)
    const score = Number(newQuizForm.min_score_to_pass)
    if (!Number.isFinite(score) || score < 0 || score > 100) {
      setPanelError('Score minimal invalide.')
      return
    }
    if (!Number.isFinite(coins) || coins < 0) {
      setPanelError('Pièces invalides.')
      return
    }
    setCreatingQuiz(true)
    setPanelError('')
    try {
      const created = await createFormateurQuiz({
        coins_on_success: Math.floor(coins),
        min_score_to_pass: Math.floor(score),
      })
      setNewQuizOpen(false)
      await refreshQuizzes(created.quiz_id)
    } catch (e) {
      setPanelError(formatApiError(e.data) || e?.message || 'Création du quiz impossible.')
    } finally {
      setCreatingQuiz(false)
    }
  }

  async function handleCreateQuestion(event) {
    event.preventDefault()
    if (!selectedQuizId) return
    const text = newQuestionForm.question_content.trim()
    if (!text) {
      setPanelError('L’énoncé est requis.')
      return
    }
    setSavingQuestion(true)
    setPanelError('')
    try {
      await createFormateurQuestion(Number(selectedQuizId), {
        question_content: text,
        xp_value: Math.max(0, Number(newQuestionForm.xp_value) || 0),
      })
      setNewQuestionForm({ question_content: '', xp_value: 10 })
      setNewQuestionOpen(false)
      await reloadQuestions({ goToLastQuestion: true })
    } catch (e) {
      setPanelError(formatApiError(e.data) || e?.message || 'Création de la question impossible.')
    } finally {
      setSavingQuestion(false)
    }
  }

  async function handleUpdateQuestion(event) {
    event.preventDefault()
    if (!editQuestion) return
    const text = editQuestion.question_content.trim()
    if (!text) {
      setPanelError('L’énoncé est requis.')
      return
    }
    setSavingQuestion(true)
    setPanelError('')
    try {
      await updateFormateurQuestion(editQuestion.question_id, {
        question_content: text,
        xp_value: Math.max(0, Number(editQuestion.xp_value) || 0),
      })
      setEditQuestion(null)
      await reloadQuestions()
    } catch (e) {
      setPanelError(formatApiError(e.data) || e?.message || 'Mise à jour impossible.')
    } finally {
      setSavingQuestion(false)
    }
  }

  async function handleDeleteQuestion(q) {
    if (!window.confirm('Supprimer cette question et ses réponses ?')) return
    setPanelError('')
    try {
      await deleteFormateurQuestion(q.question_id)
      await reloadQuestions()
    } catch (e) {
      setPanelError(formatApiError(e.data) || e?.message || 'Suppression impossible.')
    }
  }

  async function handleCreateAnswer(event) {
    event.preventDefault()
    if (!newAnswerForQuestion) return
    const label = newAnswerForQuestion.label_answer.trim()
    if (!label) {
      setPanelError('Le libellé est requis.')
      return
    }
    setPanelError('')
    try {
      await createFormateurAnswer(newAnswerForQuestion.questionId, {
        label_answer: label,
        is_correct: Boolean(newAnswerForQuestion.is_correct),
      })
      setNewAnswerForQuestion(null)
      await reloadQuestions()
    } catch (e) {
      setPanelError(formatApiError(e.data) || e?.message || 'Création de la réponse impossible.')
    }
  }

  async function handleUpdateAnswer(event) {
    event.preventDefault()
    if (!editAnswer) return
    const label = editAnswer.label_answer.trim()
    if (!label) {
      setPanelError('Le libellé est requis.')
      return
    }
    setPanelError('')
    try {
      await updateFormateurAnswer(editAnswer.answer_id, {
        label_answer: label,
        is_correct: Boolean(editAnswer.is_correct),
      })
      setEditAnswer(null)
      await reloadQuestions()
    } catch (e) {
      setPanelError(formatApiError(e.data) || e?.message || 'Mise à jour impossible.')
    }
  }

  async function handleDeleteAnswer(answerId) {
    if (!window.confirm('Supprimer cette réponse ?')) return
    setPanelError('')
    try {
      await deleteFormateurAnswer(answerId)
      await reloadQuestions()
    } catch (e) {
      setPanelError(formatApiError(e.data) || e?.message || 'Suppression impossible.')
    }
  }

  const activeQuestion = questions.length > 0 ? questions[questionIndex] : null

  return (
    <div className="page">
      <header className="page-header page-header--split">
        <div className="page-header__intro">
          <p className="page-header__eyebrow">Administration</p>
          <h1>Gestion des quiz</h1>
          <p className="page-header__lead">
            Créez des quiz (seuil et récompense), ajustez-les puis éditez les questions une par une avec la navigation
            ci-dessous pour plus de clarté.
          </p>
        </div>
        <div className="page-header__actions">
          <button type="button" className="btn btn--primary" onClick={() => setNewQuizOpen(true)} disabled={loading}>
            Nouveau quiz
          </button>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}
      {panelError ? <p className="error">{panelError}</p> : null}

      <section className="card admin-grid admin-quizz-shell">
        <article>
          <h2 className="section-title">Quiz</h2>
          <div className="stack-form">
            <label>
              Sélectionner un quiz
              <select
                value={selectedQuizId}
                onChange={(e) => setSelectedQuizId(e.target.value)}
                disabled={loading || quizzes.length === 0}
              >
                {quizzes.map((item) => (
                  <option key={item.quiz_id} value={item.quiz_id}>
                    Quiz #{item.quiz_id} · seuil {item.min_score_to_pass}% · {item.coins_on_success} pièces
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading ? <p className="muted">Chargement des quiz…</p> : null}
          {!loading && quizzes.length === 0 ? (
            <p className="dash-empty">Aucun quiz pour l’instant. Créez-en un avec le bouton ci-dessus.</p>
          ) : null}

          {selectedQuiz ? (
            <QuizSettingsInner
              key={selectedQuiz.quiz_id}
              quiz={selectedQuiz}
              onQuizUpdated={() => refreshQuizzes(selectedQuiz.quiz_id)}
              onQuizDeleted={() => refreshQuizzes(null)}
            />
          ) : null}
        </article>

        <article>
          <div className="admin-quizz-questions-head">
            <h2 className="section-title">Questions / réponses</h2>
            {selectedQuizId ? (
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => {
                  setPanelError('')
                  setNewQuestionOpen((o) => !o)
                }}
                disabled={loadingQuestions}
              >
                {newQuestionOpen ? 'Fermer le formulaire' : 'Ajouter une question'}
              </button>
            ) : null}
          </div>

          {loadingQuestions ? <p className="muted">Chargement des questions…</p> : null}

          {selectedQuizId && newQuestionOpen ? (
            <form className="stack-form card quiz-nested-card" onSubmit={handleCreateQuestion}>
              <h3 className="section-title">Nouvelle question</h3>
              <label>
                Énoncé
                <textarea
                  rows={3}
                  value={newQuestionForm.question_content}
                  onChange={(e) =>
                    setNewQuestionForm((f) => ({ ...f, question_content: e.target.value }))
                  }
                  required
                />
              </label>
              <label>
                XP
                <input
                  type="number"
                  min={0}
                  value={newQuestionForm.xp_value}
                  onChange={(e) => setNewQuestionForm((f) => ({ ...f, xp_value: e.target.value }))}
                />
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn--primary" disabled={savingQuestion}>
                  {savingQuestion ? 'Création…' : 'Ajouter'}
                </button>
              </div>
            </form>
          ) : null}

          {!loadingQuestions && !selectedQuizId ? (
            <p className="dash-empty">Sélectionnez un quiz dans la colonne de gauche.</p>
          ) : null}

          {selectedQuizId && questions.length > 0 ? (
            <div className="quiz-q-pager" role="navigation" aria-label="Pagination des questions">
              <button
                type="button"
                className="dash-pager__btn"
                disabled={questionIndex <= 0}
                onClick={() => setQuestionIndex((i) => Math.max(0, i - 1))}
              >
                Question précédente
              </button>
              <span className="dash-pager__info quiz-q-pager__status">
                Question <strong>{questionIndex + 1}</strong> sur <strong>{questions.length}</strong>
                <span className="muted quiz-q-pager__id">
                  {' '}
                  (id&nbsp;#{activeQuestion?.question_id})
                </span>
              </span>
              <label className="quiz-q-jump">
                <span className="muted">Aller à</span>
                <select
                  value={questionIndex}
                  onChange={(e) => setQuestionIndex(Number(e.target.value))}
                  aria-label="Choisir la question à afficher"
                >
                  {questions.map((qu, idx) => (
                    <option key={qu.question_id} value={idx}>
                      Question {idx + 1} — #{qu.question_id}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="dash-pager__btn dash-pager__btn--primary"
                disabled={questionIndex >= questions.length - 1}
                onClick={() =>
                  setQuestionIndex((i) => Math.min(questions.length - 1, i + 1))
                }
              >
                Question suivante
              </button>
            </div>
          ) : null}

          <div className="quiz-question-list">
            {activeQuestion ? (
              <div key={activeQuestion.question_id} className="card quiz-nested-card quiz-nested-card--active">
                <div className="quiz-question-row">
                  <div className="quiz-question-summary">
                    <p className="muted">
                      Question #{activeQuestion.question_id} · {activeQuestion.xp_value} XP
                    </p>
                    <p className="quiz-question-summary__body">{activeQuestion.question_content}</p>
                  </div>
                  <div className="hero-actions quiz-question-actions">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => setEditQuestion({ ...activeQuestion })}
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => handleDeleteQuestion(activeQuestion)}
                    >
                      Supprimer
                    </button>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() =>
                        setNewAnswerForQuestion({
                          questionId: activeQuestion.question_id,
                          label_answer: '',
                          is_correct: false,
                        })
                      }
                    >
                      Ajouter une réponse
                    </button>
                  </div>
                </div>

                {newAnswerForQuestion?.questionId === activeQuestion.question_id ? (
                  <form className="stack-form" onSubmit={handleCreateAnswer}>
                    <h4 className="section-title">Nouvelle réponse</h4>
                    <label>
                      Libellé
                      <input
                        type="text"
                        value={newAnswerForQuestion.label_answer}
                        onChange={(e) =>
                          setNewAnswerForQuestion((f) =>
                            f ? { ...f, label_answer: e.target.value } : f,
                          )
                        }
                        required
                      />
                    </label>
                    <label className="hint stack-form__checkbox">
                      <input
                        type="checkbox"
                        checked={newAnswerForQuestion.is_correct}
                        onChange={(e) =>
                          setNewAnswerForQuestion((f) =>
                            f ? { ...f, is_correct: e.target.checked } : f,
                          )
                        }
                      />
                      Réponse correcte
                    </label>
                    <div className="hero-actions">
                      <button type="submit" className="btn btn--primary">
                        Enregistrer la réponse
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => setNewAnswerForQuestion(null)}
                      >
                        Annuler
                      </button>
                    </div>
                  </form>
                ) : null}

                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Réponse</th>
                        <th>Correcte</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeQuestion.answers || []).map((a) => (
                        <tr key={a.answer_id}>
                          <td>{a.answer_id}</td>
                          <td>{a.label_answer}</td>
                          <td>{a.is_correct ? 'Oui' : 'Non'}</td>
                          <td>
                            <div className="dash-table-actions">
                              <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={() =>
                                  setEditAnswer({
                                    answer_id: a.answer_id,
                                    question_id: activeQuestion.question_id,
                                    label_answer: a.label_answer,
                                    is_correct: Boolean(a.is_correct),
                                  })
                                }
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                className="btn btn--secondary"
                                onClick={() => handleDeleteAnswer(a.answer_id)}
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(activeQuestion.answers || []).length === 0 ? (
                        <tr>
                          <td colSpan={4}>Aucune réponse · ajoutez-en au moins une correcte.</td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
            {!loadingQuestions && selectedQuizId && questions.length === 0 ? (
              <p className="dash-empty">Ce quiz n’a pas encore de questions.</p>
            ) : null}
          </div>
        </article>
      </section>

      {newQuizOpen ? (
        <ModalOverlayPortal
          role="dialog"
          aria-modal="true"
          aria-label="Nouveau quiz"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creatingQuiz) setNewQuizOpen(false)
          }}
        >
          <div
            className="course-map-modal card course-map-modal--narrow"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="course-map-modal__head">
              <h2 className="section-title">Nouveau quiz</h2>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => !creatingQuiz && setNewQuizOpen(false)}
                disabled={creatingQuiz}
              >
                Fermer
              </button>
            </div>
            <form className="stack-form" onSubmit={handleCreateQuiz}>
              <label>
                Pièces si réussi
                <input
                  type="number"
                  min={0}
                  value={newQuizForm.coins_on_success}
                  onChange={(e) => setNewQuizForm((f) => ({ ...f, coins_on_success: e.target.value }))}
                />
              </label>
              <label>
                Score minimal (0–100)
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newQuizForm.min_score_to_pass}
                  onChange={(e) => setNewQuizForm((f) => ({ ...f, min_score_to_pass: e.target.value }))}
                />
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn--primary" disabled={creatingQuiz}>
                  {creatingQuiz ? 'Création…' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlayPortal>
      ) : null}

      {editQuestion ? (
        <ModalOverlayPortal
          role="dialog"
          aria-modal="true"
          aria-label="Modifier question"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingQuestion) setEditQuestion(null)
          }}
        >
          <div className="course-map-modal card" onClick={(ev) => ev.stopPropagation()}>
            <div className="course-map-modal__head">
              <h2 className="section-title">Question #{editQuestion.question_id}</h2>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => !savingQuestion && setEditQuestion(null)}
                disabled={savingQuestion}
              >
                Fermer
              </button>
            </div>
            <form className="stack-form" onSubmit={handleUpdateQuestion}>
              <label>
                Énoncé
                <textarea
                  rows={4}
                  value={editQuestion.question_content}
                  onChange={(e) =>
                    setEditQuestion((q) => (q ? { ...q, question_content: e.target.value } : q))
                  }
                  required
                />
              </label>
              <label>
                XP
                <input
                  type="number"
                  min={0}
                  value={editQuestion.xp_value}
                  onChange={(e) =>
                    setEditQuestion((q) => (q ? { ...q, xp_value: e.target.value } : q))
                  }
                />
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn--primary" disabled={savingQuestion}>
                  {savingQuestion ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlayPortal>
      ) : null}

      {editAnswer ? (
        <ModalOverlayPortal
          role="dialog"
          aria-modal="true"
          aria-label="Modifier réponse"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditAnswer(null)
          }}
        >
          <div
            className="course-map-modal card course-map-modal--narrow"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="course-map-modal__head">
              <h2 className="section-title">Réponse #{editAnswer.answer_id}</h2>
              <button type="button" className="btn btn--secondary" onClick={() => setEditAnswer(null)}>
                Fermer
              </button>
            </div>
            <form className="stack-form" onSubmit={handleUpdateAnswer}>
              <label>
                Libellé
                <input
                  type="text"
                  value={editAnswer.label_answer}
                  onChange={(e) =>
                    setEditAnswer((a) => (a ? { ...a, label_answer: e.target.value } : a))
                  }
                  required
                />
              </label>
              <label className="hint stack-form__checkbox">
                <input
                  type="checkbox"
                  checked={editAnswer.is_correct}
                  onChange={(e) =>
                    setEditAnswer((a) => (a ? { ...a, is_correct: e.target.checked } : a))
                  }
                />
                Réponse correcte
              </label>
              <div className="hero-actions">
                <button type="submit" className="btn btn--primary">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </ModalOverlayPortal>
      ) : null}
    </div>
  )
}
