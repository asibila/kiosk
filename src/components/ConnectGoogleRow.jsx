// Profile row: connect a Google identity to the signed-in account.
//
// Linking is only possible while signed in, and the API requires the Google
// email to match the account email — so this turns "Google refuses this email
// because a password account exists" into a one-time, deliberate step.
import { useEffect, useState } from 'react'
import { fetchAuthProviders, googleLinkUrl } from '../api.js'
import { useI18n } from '../i18n.jsx'

export default function ConnectGoogleRow({ from = '/app' }) {
  const { t } = useI18n()
  const [linked, setLinked] = useState(null) // null while loading

  useEffect(() => {
    let cancelled = false

    fetchAuthProviders()
      .then((data) => {
        if (!cancelled) setLinked(Boolean(data?.google))
      })
      .catch(() => {
        if (!cancelled) setLinked(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="profile-provider">
      <div className="profile-provider-row">
        <span className="profile-provider-name">Google</span>
        {linked === null ? (
          <span className="profile-note">{t('admin.loading')}</span>
        ) : linked ? (
          <span className="chip selected">{t('auth.googleLinked')}</span>
        ) : (
          <a className="btn secondary" href={googleLinkUrl(from)}>
            {t('auth.connectGoogle')}
          </a>
        )}
      </div>
      {!linked && <p className="profile-note">{t('auth.connectHint')}</p>}
    </div>
  )
}
