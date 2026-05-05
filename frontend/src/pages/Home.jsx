import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'

export default function Home() {
  const { user, loading } = useAuth()

  return (
    <div className="page">
      <section className="home-hero">
        <div className="home-hero__content">
          <p className="page-header__eyebrow">Plateforme Edunova</p>
          <h1>Un espace d’apprentissage moderne, clair et rapide.</h1>
          <p className="lead">
            Gérez votre compte, consultez vos accès et pilotez les utilisateurs depuis
            une interface unifiée pensée pour desktop et mobile.
          </p>
          <div className="hero-actions">
            {loading ? <span className="muted">Chargement...</span> : null}
            {!loading && user ? (
              <>
                <Link to="/compte" className="btn btn--primary">
                  Ouvrir mon espace
                </Link>
                {user.is_staff ? (
                  <Link to="/admin" className="btn btn--secondary">
                    Tableau admin
                  </Link>
                ) : null}
              </>
            ) : null}
            {!loading && !user ? (
              <>
                <Link to="/login" className="btn btn--primary">
                  Se connecter
                </Link>
                <Link to="/register" className="btn btn--secondary">
                  Créer un compte
                </Link>
              </>
            ) : null}
          </div>
        </div>
        <aside className="home-hero__aside">
          <div className="feature-pill">Accès sécurisé</div>
          <div className="feature-pill">Navigation intuitive</div>
          <div className="feature-pill">Vue staff dédiée</div>
        </aside>
      </section>

      <div className="tile-grid tile-grid--modern">
        <article className="tile">
          <span className="tile__tag">Parcours</span>
          <div className="tile__icon">01</div>
          <h3>Onboarding fluide</h3>
          <p>
            Inscription simple avec rôle par défaut côté backend et gestion des
            accès automatique.
          </p>
        </article>
        <article className="tile">
          <span className="tile__tag">Expérience</span>
          <div className="tile__icon">02</div>
          <h3>Espace personnel lisible</h3>
          <p>
            Les informations importantes sont visibles en un coup d’oeil, avec accès
            direct aux actions principales.
          </p>
        </article>
        <article className="tile">
          <span className="tile__tag">Administration</span>
          <div className="tile__icon">03</div>
          <h3>Contrôle des comptes</h3>
          <p>
            Le staff dispose d’une vue paginée claire pour suivre les utilisateurs et
            leurs statuts.
          </p>
        </article>
        <article className="tile">
          <span className="tile__tag">Design System</span>
          <div className="tile__icon">04</div>
          <h3>Interface cohérente</h3>
          <p>
            Composants homogènes, contrastes renforcés et interactions visuelles
            modernes sur toutes les pages.
          </p>
        </article>
      </div>

      <section className="home-strip">
        <p className="home-strip__label">Pourquoi Edunova</p>
        <p className="home-strip__text">
          Une base solide pour ton application : authentification, rôles, dashboard et
          UX cohérente dans le thème couleur.
        </p>
      </section>
    </div>
  )
}
