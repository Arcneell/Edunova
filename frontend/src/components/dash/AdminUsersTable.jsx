import { BrandBadge } from './BrandBadge.jsx'
import { StatusPill } from './StatusPill.jsx'

export function AdminUsersTable({ rows }) {
  return (
    <table className="dash-table">
      <thead>
        <tr>
          <th scope="col">ID</th>
          <th scope="col">E-mail</th>
          <th scope="col">Rôle</th>
          <th scope="col">Actif</th>
          <th scope="col">Staff</th>
          <th scope="col">Inscription</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.user_id}>
            <td>
              <span className="dash-table__id">{row.user_id}</span>
            </td>
            <td className="dash-table__email">{row.email}</td>
            <td>
              <BrandBadge variant="purple">{row.role?.role_name ?? '—'}</BrandBadge>
            </td>
            <td>
              <StatusPill variant={row.is_active ? 'blue' : 'muted'}>
                {row.is_active ? 'Oui' : 'Non'}
              </StatusPill>
            </td>
            <td>
              <StatusPill variant={row.is_staff ? 'pink' : 'muted'}>
                {row.is_staff ? 'Oui' : 'Non'}
              </StatusPill>
            </td>
            <td className="dash-table__date">
              {row.date_joined ? new Date(row.date_joined).toLocaleString('fr-FR') : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
