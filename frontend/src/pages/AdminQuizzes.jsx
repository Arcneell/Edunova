import { useEffect, useMemo, useState } from 'react'
import {
  getFormateurQuestionAnswers,
  getFormateurQuizQuestions,
  getFormateurQuizzes,
} from '../api/user/formateur.js'
export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuizId, setSelectedQuizId] = useState('')
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadQuizzes() {
      setLoading(true)
      setError('')
      try {
        const data = await getFormateurQuizzes()
        const list = Array.isArray(data) ? data : []
        setQuizzes(list)
        setSelectedQuizId(String(list[0]?.quiz_id ?? ''))
      } catch (e) {
        const message = e?.data?.detail || e?.message || 'Impossible de charger les quiz.'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    void loadQuizzes()
  }, [])

  useEffect(() => {
    async function loadQuestions() {
      if (!selectedQuizId) {
        setQuestions([])
        return
      }
      setLoadingQuestions(true)
      setError('')
      try {
        const rawQuestions = await getFormateurQuizQuestions(Number(selectedQuizId))
        const hydrated = await Promise.all(
          rawQuestions.map(async (question) => {
            const answers = await getFormateurQuestionAnswers(question.question_id)
            const correct = (answers || []).find((answer) => answer.is_correct)
            return {
              id: question.question_id,
              label: question.question_content,
              answers: (answers || []).map((answer) => answer.label_answer),
              correct: correct ? correct.label_answer : '—',
            }
          }),
        )
        setQuestions(hydrated)
      } catch (e) {
        const message =
          e?.data?.detail || e?.message || 'Impossible de charger les questions/reponses.'
        setError(message)
        setQuestions([])
      } finally {
        setLoadingQuestions(false)
      }
    }
    void loadQuestions()
  }, [selectedQuizId])

  const quiz = useMemo(
    () => quizzes.find((q) => String(q.quiz_id) === String(selectedQuizId)) ?? null,
    [quizzes, selectedQuizId],
  )

  return (
    <div className="page">
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
                disabled={loading || quizzes.length === 0}
              >
                {quizzes.map((item) => (
                  <option key={item.quiz_id} value={item.quiz_id}>
                    Quiz #{item.quiz_id} · score min {item.min_score_to_pass}%
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading ? <p className="muted">Chargement des quiz...</p> : null}
          {error ? <p className="error">{error}</p> : null}
          {!loading && !error && quizzes.length === 0 ? (
            <p className="dash-empty">Aucun quiz en base pour ce formateur.</p>
          ) : null}
          <p className="hint">
            Les quiz, questions et réponses affichés proviennent de la base de données.
          </p>
        </article>

        <article>
          <h2 className="section-title">Questions / Réponses</h2>
          {loadingQuestions ? <p className="muted">Chargement des questions...</p> : null}
          {!loadingQuestions && !quiz ? (
            <p className="dash-empty">Aucun quiz sélectionné.</p>
          ) : null}
          {!loadingQuestions && quiz ? (
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
                  {questions.map((question) => (
                    <tr key={question.id}>
                      <td>{question.id}</td>
                      <td>{question.label}</td>
                      <td>{question.answers.join(' · ')}</td>
                      <td>
                        <span className="dash-pill dash-pill--blue">{question.correct}</span>
                      </td>
                    </tr>
                  ))}
                  {questions.length === 0 ? (
                    <tr>
                      <td colSpan={4}>Aucune question pour ce quiz.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </article>
      </section>
    </div>
  )
}
