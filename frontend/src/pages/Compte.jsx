import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { equipCosmetic, listAllCosmetics } from '../api/user/cosmetics.js'
import { useAuth } from '../hooks/useAuth.js'

export default function Compte() {
  const { user, refreshMe } = useAuth()
  const [avatars, setAvatars] = useState([])
  const [equipping, setEquipping] = useState(null)
  const [errEquip, setErrEquip] = useState(null)

  const loadAvatars = useCallback(async () => {
    try {
      const all = await listAllCosmetics()
      setAvatars(all.filter((c) => c.cosmetic_category === 'avatar_face'))
    } catch {
      // silently ignore — section reste vide
    }
  }, [])

  useEffect(() => {
    if (user) loadAvatars()
  }, [user, loadAvatars])

  async function handleEquip(cosmeticId) {
    setEquipping(cosmeticId)
    setErrEquip(null)
    try {
      await equipCosmetic(cosmeticId)
      await refreshMe()
      await loadAvatars()
    } catch (e) {
      setErrEquip(e.data?.detail ?? "Erreur lors de l'équipement.")
    } finally {
      setEquipping(null)
    }
  }

  return (
    <div className="page">
      <section className="profile-hero">
        <p className="page-header__eyebrow">Profil</p>
        <h1>Mon compte</h1>
        <p className="page-header__lead">
          Retrouvez vos informations de compte et vos accès dans une vue simplifiée.
        </p>
      </section>

      <article className="card profile-card">
        <h2 className="section-title">Informations</h2>
        {user ? (
          <dl className="kv kv--modern">
            <dt>E-mail</dt>
            <dd>{user.email}</dd>
            <dt>Rôle</dt>
            <dd>{user.role?.role_name ?? '—'}</dd>
            <dt>Équipe staff</dt>
            <dd>{user.is_staff ? 'Oui' : 'Non'}</dd>
          </dl>
        ) : null}
        <p className="hint">
          La déconnexion et la navigation restent disponibles depuis la barre du haut.
        </p>
        {user?.is_staff ? (
          <div className="hero-actions account-actions">
            <Link to="/admin" className="btn btn--primary">
              Ouvrir l’administration
            </Link>
          </div>
        ) : null}
      </article>

      <article className="card profile-card avatar-card">
        <h2 className="section-title">Avatar</h2>
        <p className="muted avatar-card__lead">
          Choisissez votre avatar parmi tous les avatars disponibles.
        </p>

        {avatars.length === 0 ? (
          <p className="muted" style={{ fontSize: '0.875rem' }}>
            Aucun avatar disponible.
          </p>
        ) : (
          <div className="avatar-picker">
            {avatars.map((a) => {
              const isEquipped = a.cosmetic_asset_url === user?.current_avatar_url
              return (
                <button
                  key={a.cosmetic_id}
                  type="button"
                  className={`avatar-picker__item${isEquipped ? ' avatar-picker__item--active' : ''}`}
                  onClick={() => !isEquipped && handleEquip(a.cosmetic_id)}
                  disabled={equipping === a.cosmetic_id || isEquipped}
                  title={isEquipped ? 'Avatar actuel' : `Équiper "${a.cosmetic_name}"`}
                >
                  <img
                    src={a.cosmetic_asset_url}
                    alt={a.cosmetic_name}
                    className="avatar-picker__img"
                  />
                  {isEquipped ? (
                    <span className="avatar-picker__check" aria-hidden="true">✓</span>
                  ) : null}
                </button>
              )
            })}
          </div>
        )}

        {errEquip ? (
          <p className="error" style={{ marginTop: '0.75rem' }}>{errEquip}</p>
        ) : null}
      </article>
    </div>
  )
}
