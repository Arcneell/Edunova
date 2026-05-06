import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getBadges, getMyBadges } from '../api/user/badges.js'
import { listAllCosmetics, purchaseAndEquipCosmetic } from '../api/user/cosmetics.js'
import { getProfile } from '../api/user/me.js'
import { getRanks } from '../api/user/ranks.js'
import { useAuth } from '../hooks/useAuth.js'

function formatNumber(n) {
  return new Intl.NumberFormat('fr-FR').format(Number(n) || 0)
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}

const StarIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
    <path
      d="M12 2.5l2.95 6.31 6.55.74-4.9 4.62 1.32 6.83L12 17.7l-5.92 3.3 1.32-6.83-4.9-4.62 6.55-.74L12 2.5z"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
)

function Stars({ count = 0 }) {
  const filled = Math.max(0, Math.min(3, Number(count) || 0))
  return (
    <span className="rank-stars" aria-label={`${filled} étoile${filled > 1 ? 's' : ''}`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`rank-stars__s${i <= filled ? ' is-on' : ''}`}>
          <StarIcon filled={i <= filled} />
        </span>
      ))}
    </span>
  )
}

const IconXp = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L4.5 13.5h6L10 22l8.5-11.5h-6L13 2z" />
  </svg>
)
const IconCoin = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4" />
  </svg>
)
const IconFlame = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2.5s4.5 4 4.5 8.5a4.5 4.5 0 01-9 0c0-2 1-3.5 1-3.5S9 9 9.5 10c0-3 2.5-7.5 2.5-7.5z" />
    <path d="M8 16a4 4 0 008 0" />
  </svg>
)
const IconMedal = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="15" r="6" />
    <path d="M8 12.5L5 3h5l2 5M16 12.5L19 3h-5l-2 5" />
  </svg>
)

export default function Compte() {
  const { user, refreshMe } = useAuth()
  const [profile, setProfile] = useState(null)
  const [ranks, setRanks] = useState([])
  const [myBadges, setMyBadges] = useState([])
  const [allBadges, setAllBadges] = useState([])
  const [avatars, setAvatars] = useState([])
  const [equipping, setEquipping] = useState(null)
  const [errEquip, setErrEquip] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [prof, rks, mb, ab, cos] = await Promise.all([
        getProfile().catch(() => null),
        getRanks().catch(() => []),
        getMyBadges().catch(() => []),
        getBadges().catch(() => []),
        listAllCosmetics().catch(() => []),
      ])
      setProfile(prof)
      setRanks(Array.isArray(rks) ? rks : [])
      setMyBadges(Array.isArray(mb) ? mb : [])
      setAllBadges(Array.isArray(ab) ? ab : [])
      setAvatars((Array.isArray(cos) ? cos : []).filter((c) => c.cosmetic_category === 'avatar_face'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const id = window.setTimeout(() => {
      void loadAll()
    }, 0)
    return () => window.clearTimeout(id)
  }, [user, loadAll])

  async function handleEquip(cosmeticId) {
    setEquipping(cosmeticId)
    setErrEquip(null)
    try {
      await purchaseAndEquipCosmetic(cosmeticId)
      await refreshMe()
      await loadAll()
    } catch (e) {
      setErrEquip(e.data?.detail ?? "Erreur lors de l'équipement.")
    } finally {
      setEquipping(null)
    }
  }

  // Calcul XP / progression vers le prochain rang.
  const xp = Number(profile?.total_xp ?? 0)
  const sortedRanks = useMemo(
    () => [...ranks].sort((a, b) => (a.xp_threshold ?? 0) - (b.xp_threshold ?? 0)),
    [ranks],
  )
  const currentRank = useMemo(() => {
    if (profile?.rank) return profile.rank
    // Fallback : déduire à partir des seuils.
    let best = null
    for (const r of sortedRanks) {
      if (xp >= (r.xp_threshold ?? 0)) best = r
    }
    return best
  }, [profile, sortedRanks, xp])
  const nextRank = useMemo(() => {
    return sortedRanks.find((r) => (r.xp_threshold ?? 0) > xp) ?? null
  }, [sortedRanks, xp])

  const xpFloor = Number(currentRank?.xp_threshold ?? 0)
  const xpCeil = Number(nextRank?.xp_threshold ?? xpFloor)
  const progressSpan = Math.max(1, xpCeil - xpFloor)
  const progressDone = Math.max(0, Math.min(progressSpan, xp - xpFloor))
  const progressPct = nextRank ? Math.round((progressDone / progressSpan) * 100) : 100
  const xpToNext = nextRank ? Math.max(0, xpCeil - xp) : 0

  // Fusion badges gagnés / catalogue pour afficher l’ensemble.
  const earnedById = useMemo(() => {
    const m = new Map()
    for (const b of myBadges) m.set(b.badge_id, b)
    return m
  }, [myBadges])
  const badgeRows = useMemo(() => {
    return allBadges.map((b) => ({
      ...b,
      earned: earnedById.has(b.badge_id),
      earned_at: earnedById.get(b.badge_id)?.earned_at ?? null,
    }))
  }, [allBadges, earnedById])

  const avatarUrl = profile?.current_avatar_url || user?.current_avatar_url || ''
  const roleName = user?.role?.role_name ?? '—'
  const wallet = Number(profile?.wallet_balance ?? 0)
  const streak = Number(profile?.current_streak ?? 0)

  return (
    <div className="page">
      <section className="profile-hero profile-hero--rich">
        <p className="page-header__eyebrow">Profil</p>

        <div className="profile-hero__main">
          <div className="profile-hero__avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" />
            ) : (
              <span aria-hidden="true">{(user?.email ?? '?').slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div className="profile-hero__id">
            <h1 className="profile-hero__email">{user?.email ?? '—'}</h1>
            <div className="profile-hero__meta">
              <span className="chip chip--role">{roleName}</span>
              {currentRank ? (
                <span className="chip chip--rank">
                  <Stars count={currentRank.stars} />
                  <span>{currentRank.label}</span>
                </span>
              ) : null}
              {user?.is_staff ? <span className="chip chip--staff">Équipe Edunova</span> : null}
            </div>
          </div>
        </div>

        <div className="profile-hero__xp">
          <div className="xp-bar__head">
            <span className="xp-bar__label">
              {currentRank ? currentRank.label : 'Sans rang'}
              {nextRank ? <span className="muted"> → {nextRank.label}</span> : null}
            </span>
            <span className="xp-bar__value">{formatNumber(xp)} XP</span>
          </div>
          <div
            className="xp-bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div className="xp-bar__fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="xp-bar__hint">
            {nextRank
              ? `Encore ${formatNumber(xpToNext)} XP avant ${nextRank.label} (${progressPct}%)`
              : 'Rang maximum atteint — bravo !'}
          </p>
        </div>
      </section>

      <section className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--xp"><IconXp /></span>
          <div>
            <p className="stat-card__label">Expérience</p>
            <p className="stat-card__value">{formatNumber(xp)} <span>XP</span></p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--coin"><IconCoin /></span>
          <div>
            <p className="stat-card__label">Pièces</p>
            <p className="stat-card__value">{formatNumber(wallet)}</p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--flame"><IconFlame /></span>
          <div>
            <p className="stat-card__label">Série</p>
            <p className="stat-card__value">
              {formatNumber(streak)} <span>jour{streak > 1 ? 's' : ''}</span>
            </p>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--medal"><IconMedal /></span>
          <div>
            <p className="stat-card__label">Badges</p>
            <p className="stat-card__value">
              {formatNumber(myBadges.length)}
              {allBadges.length ? <span> / {allBadges.length}</span> : null}
            </p>
          </div>
        </article>
      </section>

      <article className="card profile-card">
        <h2 className="section-title">Informations</h2>
        <dl className="kv kv--modern">
          <dt>E-mail</dt>
          <dd>{user?.email ?? '—'}</dd>
          <dt>Rôle</dt>
          <dd>{roleName}</dd>
          <dt>Membre de l&apos;équipe Edunova</dt>
          <dd>{user?.is_staff ? 'Oui' : 'Non'}</dd>
          <dt>Rang actuel</dt>
          <dd>
            {currentRank ? (
              <span className="inline-rank">
                <Stars count={currentRank.stars} />
                <span>{currentRank.label}</span>
                <span className="muted">· seuil {formatNumber(currentRank.xp_threshold)} XP</span>
              </span>
            ) : (
              '—'
            )}
          </dd>
        </dl>
        {user?.is_staff ? (
          <div className="hero-actions account-actions">
            <Link to="/admin" className="btn btn--primary">
              Ouvrir l’espace équipe
            </Link>
          </div>
        ) : null}
      </article>

      <article className="card profile-card">
        <h2 className="section-title">Mes rangs</h2>
        <p className="muted avatar-card__lead">
          Progression à travers les paliers. Le rang évolue automatiquement avec votre XP.
        </p>
        {sortedRanks.length === 0 ? (
          <p className="muted" style={{ fontSize: '0.875rem' }}>Aucun rang configuré.</p>
        ) : (
          <ul className="rank-list">
            {sortedRanks.map((r) => {
              const reached = xp >= (r.xp_threshold ?? 0)
              const isCurrent = currentRank?.rank_id === r.rank_id
              return (
                <li
                  key={r.rank_id}
                  className={`rank-list__item${reached ? ' is-reached' : ''}${isCurrent ? ' is-current' : ''}`}
                >
                  <Stars count={r.stars} />
                  <div className="rank-list__body">
                    <p className="rank-list__label">{r.label}</p>
                    <p className="rank-list__threshold">{formatNumber(r.xp_threshold)} XP</p>
                  </div>
                  <span className="rank-list__state">
                    {isCurrent ? 'Actuel' : reached ? 'Atteint' : 'À venir'}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </article>

      <article className="card profile-card">
        <h2 className="section-title">
          Mes badges
          <span className="muted" style={{ fontWeight: 400, marginLeft: '0.5rem' }}>
            {myBadges.length} / {allBadges.length || myBadges.length}
          </span>
        </h2>
        {badgeRows.length === 0 && myBadges.length === 0 ? (
          <p className="muted" style={{ fontSize: '0.875rem' }}>
            {loading ? 'Chargement…' : 'Aucun badge disponible pour le moment.'}
          </p>
        ) : (
          <ul className="badge-grid">
            {(badgeRows.length ? badgeRows : myBadges.map((b) => ({ ...b, earned: true }))).map((b) => (
              <li
                key={b.badge_id}
                className={`badge-tile${b.earned ? ' is-earned' : ' is-locked'}`}
                title={b.earned ? `Obtenu le ${formatDate(b.earned_at)}` : 'Pas encore obtenu'}
              >
                <div className="badge-tile__icon">
                  {b.icon_url ? <img src={b.icon_url} alt="" /> : <IconMedal />}
                </div>
                <p className="badge-tile__name">{b.badge_name}</p>
                <p className="badge-tile__date">
                  {b.earned ? formatDate(b.earned_at) || 'Obtenu' : 'À débloquer'}
                </p>
              </li>
            ))}
          </ul>
        )}
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
              const isEquipped = a.cosmetic_asset_url === avatarUrl
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
