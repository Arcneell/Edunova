import { useCallback, useEffect, useMemo, useState } from 'react'
import { listAdminUsers } from '../api/user/adminUsers.js'
import {
  AdminUsersTable,
  DashAlert,
  DashHero,
  DashLayout,
  DashPanel,
  DashStatGrid,
  DashTableSkeleton,
  PaginationBar,
  StatCard,
} from '../components/dash/index.js'

function stripOrigin(url) {
  try {
    const u = new URL(url)
    return `${u.pathname}${u.search}`
  } catch {
    return url
  }
}

function pageFromPath(path) {
  if (!path) return null
  try {
    const u = new URL(path, window.location.origin)
    const p = u.searchParams.get('page')
    return p ? Number(p) : 1
  } catch {
    return null
  }
}

export default function AdminUsers() {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (pageNum) => {
    setErr(null)
    setLoading(true)
    try {
      const res = await listAdminUsers({ page: pageNum })
      setData(res)
    } catch (ex) {
      const detail =
        ex.data?.detail ||
        (typeof ex.data === 'object' ? JSON.stringify(ex.data) : ex.message)
      setErr(detail || 'Erreur chargement')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement liste async au changement de page
    void load(page)
  }, [page, load])

  const results = data?.results ?? []
  const nextPath = data?.next ? stripOrigin(data.next) : null
  const prevPath = data?.previous ? stripOrigin(data.previous) : null

  const pageStats = useMemo(() => {
    const activeOnPage = results.filter((r) => r.is_active).length
    const staffOnPage = results.filter((r) => r.is_staff).length
    return { activeOnPage, staffOnPage }
  }, [results])

  const pending = loading && data == null && !err

  return (
    <DashLayout>
      <DashHero eyebrow="Espace admin" title="Gestion des utilisateurs">
        <p>
          Vue d’ensemble des comptes enregistrés, avec indicateurs immédiats et
          navigation paginée pour faciliter l’administration.
        </p>
      </DashHero>

      <DashStatGrid>
        <StatCard
          variant="blue"
          label="Total comptes"
          value={pending ? '…' : data?.count != null ? data.count : '—'}
        />
        <StatCard
          variant="purple"
          label="Actifs (page)"
          value={pending ? '…' : `${pageStats.activeOnPage} / ${results.length}`}
        />
        <StatCard
          variant="pink"
          label="Staff (page)"
          value={pending ? '…' : `${pageStats.staffOnPage} / ${results.length}`}
        />
      </DashStatGrid>

      {err ? <DashAlert>{err}</DashAlert> : null}

      <DashPanel
        title="Annuaire utilisateurs"
        meta={
          <>
            Page {page}
            {data?.count != null ? ` · ${data.count} au total` : ''}
          </>
        }
        footer={
          <PaginationBar
            page={page}
            prevDisabled={!prevPath}
            nextDisabled={!nextPath}
            onPrev={() => {
              const p = pageFromPath(prevPath)
              if (p != null) setPage(p)
              else setPage((x) => Math.max(1, x - 1))
            }}
            onNext={() => {
              const p = pageFromPath(nextPath)
              if (p != null) setPage(p)
              else setPage((x) => x + 1)
            }}
          />
        }
      >
        {loading ? (
          <DashTableSkeleton rows={4} />
        ) : results.length === 0 ? (
          <p className="dash-empty">Aucun utilisateur sur cette page.</p>
        ) : (
          <AdminUsersTable rows={results} />
        )}
      </DashPanel>
    </DashLayout>
  )
}
