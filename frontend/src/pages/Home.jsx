import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

/**
 * Vérité produit (pour le wording de cette page uniquement — aligné avec le code SPA) :
 * - Routes : /login, /register, /compte, /courses/ma-thematiques (carte + quiz), /admin(+ sous-routes avec garde roles)
 * - API : themes, checkpoints sur carte, soumission quiz session Django + CSRF, profils, utilisateurs admin staff, cours/quiz pour formateurs
 */

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

  const isTrainer =
    String(user?.role?.role_name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase() === 'formateur'
  const canTeam = Boolean(user?.is_staff || isTrainer)

  return (
    <div className="page landing-stack">
      <section className="landing-hero-pro" aria-labelledby="landing-heading">
        <div className="landing-hero-pro__grid">
          <div>
            <p className="landing-tagline">Apprendre. Innover. Grandir.</p>
            <h1 id="landing-heading">
              Une plateforme où le parcours compte aussi&nbsp;:&nbsp;parcours par thématiques, quizzes et tableau de bord équipe.
            </h1>
            <p className="landing-lead">
              Connectez-vous pour suivre vos cours sur une carte de progression (checkpoints débloqués au fil des réussites&nbsp;quiz),
              gérer votre compte ou, pour les équipes habilitées, administrer cours et questionnaires — le tout relié aux APIs Edunova.
            </p>
            <div className="hero-actions">
              {loading ? <span className="muted">Chargement…</span> : null}
              {!loading && user ? (
                <>
                  <Link to="/courses/ma-thematiques" className="btn btn--primary">
                    Ouvrir ma map
                  </Link>
                  <Link to="/compte" className="btn btn--secondary">
                    Mon compte
                  </Link>
                  {canTeam ? (
                    <Link to="/admin" className="btn btn--secondary">
                      Espace équipe
                    </Link>
                  ) : null}
                </>
              ) : null}
              {!loading && !user ? (
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
                <strong>Carte &amp; thématiques</strong>
                <span>Vous choisissez une thématique, la carte liste les cours dans l’ordre du parcours (points verrouillés ou disponibles).</span>
              </div>
            </div>
            <div className="landing-stat-chip">
              <ChipIconQuiz />
              <div>
                <strong>Quiz intégrés</strong>
                <span>Ouverture d&apos;un quiz depuis la carte ; résultats synchronisés côté serveur avant de poursuivre.</span>
              </div>
            </div>
            <div className="landing-stat-chip">
              <svg className="landing-stat-chip__icon" width="42" height="42" viewBox="0 0 48 48" aria-hidden="true">
                <rect x="8" y="10" width="32" height="28" rx="4" stroke="#7242d0" strokeWidth="2" fill="none" />
                <path d="M8 17h32" stroke="#1b17ff" strokeWidth="2" opacity="0.85" />
                <circle cx="17" cy="27" r="2.5" fill="#ff007a" />
              </svg>
              <div>
                <strong>Admin équipe</strong>
                <span>Liens dédiés formateurs&nbsp;/&nbsp;staff sur la carte des cours et des quiz, plus tableau de bord central.</span>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="pillars-heading">
        <header className="landing-section__head">
          <h2 id="pillars-heading">Ce que l’app livre déjà dans le navigateur</h2>
          <p>
            Quatre usages concrets reflétés par les pages et endpoints actuels — sans promesses sur des briques encore absentes de l’interface.
          </p>
        </header>
        <div className="landing-pillars">
          <article className="landing-pillar">
            <p className="landing-pillar__eyebrow">Parcourir</p>
            <h3>Cours &amp; progression</h3>
            <p>
              Sélectionnez une thématique, validez l’entrée dans la carte et suivez chaque checkpoint jusqu’aux quizzes associés.
            </p>
          </article>
          <article className="landing-pillar">
            <p className="landing-pillar__eyebrow">Réussir</p>
            <h3>Quizzes &amp; déblocage</h3>
            <p>
              Les questionnaires liés aux cours suivent vos réponses ; votre avancement sur la map reflète ces états métier renvoyés par l&apos;API.
            </p>
          </article>
          <article className="landing-pillar">
            <p className="landing-pillar__eyebrow">Administrer</p>
            <h3>Espace cours &amp; quiz</h3>
            <p>
              Les comptes formateurs et le staff peuvent accéder aux écrans d’organisation des cours et des quiz depuis le tableau de bord.
            </p>
          </article>
          <article className="landing-pillar">
            <p className="landing-pillar__eyebrow">Compte</p>
            <h3>Rôles &amp; profil</h3>
            <p>
              Inscription sécurisée, session Django, page compte lecture des informations et des habilitations liées au rôle.
            </p>
          </article>
        </div>
      </section>

      <section className="landing-steps-wrap">
        <header className="landing-section__head" style={{ marginBottom: 'var(--space-4)' }}>
          <h2>Comment votre flux se lit dans l’app</h2>
          <p>Ordre représentatif côté apprenant, du choix du thème à la validation des questionnaires.</p>
        </header>
        <ol className="landing-steps">
          <li className="landing-step">
            <h3>S’authentifier</h3>
            <p>Inscription puis connexion par session ; redirection vers les pages réservées.</p>
          </li>
          <li className="landing-step">
            <h3>Entrer dans une thématique</h3>
            <p>Sur «&nbsp;Ma map&nbsp;», liste des thèmes disponibles puis chargement des checkpoints depuis l’API.</p>
          </li>
          <li className="landing-step">
            <h3>Jouer la carte</h3>
            <p>Vue plein écran de la carte, nœuds cliquables pour ouvrir un cours ou passer au quiz suivant lorsque c’est autorisé.</p>
          </li>
          <li className="landing-step">
            <h3>Corriger et débloquer</h3>
            <p>Réponses soumises côté serveur ; retour utilisateur ; passer au point suivant quand les règles métier le permettent.</p>
          </li>
        </ol>
      </section>

      <section className="landing-cta-panel">
        <h2>Passer au concret&nbsp;: connexion ou accès équipe</h2>
        <p>
          {user
            ? 'Allez vers votre carte, votre espace personnel ou vos outils d’organisation selon vos droits.'
            : 'Créez un compte utilisateur ou connectez-vous pour voir vos thématiques et votre progression.'}
        </p>
        <div className="hero-actions">
          {!loading && user ? (
            <>
              <Link to="/courses/ma-thematiques" className="btn btn--primary">
                Ma map de cours
              </Link>
              <Link to="/compte" className="btn btn--secondary">
                Mon compte
              </Link>
            </>
          ) : null}
          {!loading && !user ? (
            <>
              <Link to="/register" className="btn btn--primary">
                Inscription
              </Link>
              <Link to="/login" className="btn btn--secondary">
                Connexion
              </Link>
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}
