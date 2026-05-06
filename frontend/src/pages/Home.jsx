import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

function ChipIconCourses() {
  return (
    <svg className="landing-stat-chip__icon" width="42" height="42" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="chipA" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1b17ff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#7242d0" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <path
        fill="url(#chipA)"
        d="M10 34V14l14-8 14 8v20l-14 8-14-8zm28-17.9L24 31.45 13.45 29.55v-17.1l10.55-6.05 10.55 6.05L38 29.08z"
      />
      <circle cx="24" cy="22" r="3.5" fill="#ff007a" opacity="0.9" />
    </svg>
  )
}

function ChipIconQuiz() {
  return (
    <svg className="landing-stat-chip__icon" width="42" height="42" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="chipB" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7242d0" />
          <stop offset="100%" stopColor="#ff007a" />
        </linearGradient>
      </defs>
      <path
        fill="none"
        stroke="url(#chipB)"
        strokeWidth="2.25"
        d="M16 34V14h14a5 5 0 015 5v10"
      />
      <path fill="#1b17ff" d="M12 38h26v4H12v-4zm20-26h10v22H22V12h10z" opacity="0.35" />
    </svg>
  )
}

export default function Home() {
  const { user, loading } = useAuth()

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="page landing-stack">
      <section className="landing-hero-pro" aria-labelledby="landing-heading">
        <div className="landing-hero-pro__grid">
          <div>
            <p className="landing-tagline">Apprendre. Innover. Grandir.</p>
            <h1 id="landing-heading">
              Des parcours clairs, des quiz pour valider vos idées, et un suivi visuel de votre progression.
            </h1>
            <p className="landing-lead">
              Edunova vous accompagne thématique par thématique : avancez à votre rythme, mesurez ce que vous
              avez retenu, et gardez une vue d’ensemble sur votre apprentissage.
            </p>
            <div className="hero-actions">
              {loading ? <span className="muted">Chargement…</span> : null}
              {!loading ? (
                <>
                  <Link to="/register" className="btn btn--primary">
                    Créer un compte
                  </Link>
                  <Link to="/login" className="btn btn--secondary">
                    Se connecter
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          <aside className="landing-aside-metrics">
            <div className="landing-stat-chip">
              <ChipIconCourses />
              <div>
                <strong>Parcours par thèmes</strong>
                <span>Chaque thématique se déroule comme un chemin : les étapes se débloquent au fil de votre réussite.</span>
              </div>
            </div>
            <div className="landing-stat-chip">
              <ChipIconQuiz />
              <div>
                <strong>Quiz pour s’entraîner</strong>
                <span>Des questions courtes pour vérifier vos acquis avant de passer à la suite.</span>
              </div>
            </div>
            <div className="landing-stat-chip">
              <svg className="landing-stat-chip__icon" width="42" height="42" viewBox="0 0 48 48" aria-hidden="true">
                <rect x="8" y="10" width="32" height="28" rx="4" stroke="#7242d0" strokeWidth="2" fill="none" />
                <path d="M8 17h32" stroke="#1b17ff" strokeWidth="2" opacity="0.85" />
                <circle cx="17" cy="27" r="2.5" fill="#ff007a" />
              </svg>
              <div>
                <strong>Pour les organismes</strong>
                <span>Équipes pédagogiques : créez et organisez vos contenus pour vos apprenants.</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="pillars-heading">
        <header className="landing-section__head">
          <h2 id="pillars-heading">Ce que vous y trouverez</h2>
          <p>Une expérience pensée pour apprendre sans se perdre.</p>
        </header>
        <div className="landing-pillars">
          <article className="landing-pillar">
            <p className="landing-pillar__eyebrow">Progresser</p>
            <h3>Cours structurés</h3>
            <p>Des contenus rangés dans l’ordre du parcours, pour avancer étape par étape.</p>
          </article>
          <article className="landing-pillar">
            <p className="landing-pillar__eyebrow">Se tester</p>
            <h3>Quiz motivants</h3>
            <p>Validez ce que vous avez compris avant d’ouvrir la prochaine étape.</p>
          </article>
          <article className="landing-pillar">
            <p className="landing-pillar__eyebrow">Organiser</p>
            <h3>Outils pour l’équipe</h3>
            <p>Pour préparer cours et évaluations lorsque vous animez une formation.</p>
          </article>
          <article className="landing-pillar">
            <p className="landing-pillar__eyebrow">Personnel</p>
            <h3>Votre espace</h3>
            <p>Un compte pour retrouver votre parcours et vos informations en un coup d’œil.</p>
          </article>
        </div>
      </section>

      <section className="landing-steps-wrap">
        <header className="landing-section__head" style={{ marginBottom: 'var(--space-4)' }}>
          <h2>Comment ça marche</h2>
          <p>Quelques étapes simples pour commencer.</p>
        </header>
        <ol className="landing-steps">
          <li className="landing-step">
            <h3>Créer un compte</h3>
            <p>Inscription rapide avec votre adresse e-mail.</p>
          </li>
          <li className="landing-step">
            <h3>Choisir un thème</h3>
            <p>Sélectionnez le sujet qui vous intéresse parmi les parcours proposés.</p>
          </li>
          <li className="landing-step">
            <h3>Suivre la carte</h3>
            <p>Visualisez où vous en êtes et ouvrez les étapes au bon moment.</p>
          </li>
          <li className="landing-step">
            <h3>Réussir les quiz</h3>
            <p>Répondez aux questions pour confirmer vos acquis et débloquer la suite.</p>
          </li>
        </ol>
      </section>

      <section className="landing-cta-panel">
        <h2>Prêt à commencer&nbsp;?</h2>
        <p>Créez un compte ou connectez-vous pour accéder à votre parcours.</p>
        <div className="hero-actions">
          <Link to="/register" className="btn btn--primary">
            Inscription
          </Link>
          <Link to="/login" className="btn btn--secondary">
            Connexion
          </Link>
        </div>
      </section>
    </div>
  )
}
