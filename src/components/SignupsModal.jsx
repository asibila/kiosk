// Admin-only dialog: the accounts created most recently. `GET /users` returns
// full rows (including createdAt) only to an admin; everyone else gets id+name.
import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { localeFor } from '../facetTypes.js'
import { useI18n } from '../i18n.jsx'
import SimpleModal from './SimpleModal.jsx'

const LIMIT = 20

export default function SignupsModal({ onClose }) {
  const { language, t } = useI18n()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    api
      .list('users')
      .then((rows) => {
        if (cancelled) return
        const sorted = [...rows].sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
        )
        setUsers(sorted.slice(0, LIMIT))
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const formatter = new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  let body
  if (error) {
    body = <p className="login-error">{error}</p>
  } else if (users === null) {
    body = <p className="profile-note">{t('admin.loading')}</p>
  } else if (users.length === 0) {
    body = <p className="profile-note">{t('admin.noSignups')}</p>
  } else {
    body = (
      <ul className="signup-list">
        {users.map((user) => (
          <li key={user.id}>
            <span className="signup-row-name">{user.name}</span>
            <span className="signup-row-email">{user.email}</span>
            <span className="signup-row-date">
              {user.createdAt ? formatter.format(new Date(user.createdAt)) : ''}
            </span>
            {user.role === 'ADMIN' && (
              <span className="listing-status">{t('admin.adminBadge')}</span>
            )}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <SimpleModal
      title={t('admin.signupsTitle')}
      body={body}
      footer={
        <button type="button" className="btn primary" onClick={onClose}>
          {t('common.close')}
        </button>
      }
      onClose={onClose}
    />
  )
}
