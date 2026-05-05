const FIELD_LABELS = {
  email: 'adresse e-mail',
  password: 'mot de passe',
  role_id: 'role',
  role: 'role',
  detail: 'detail',
  non_field_errors: '',
}

function toSentence(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function normalizeMessage(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^[A-Za-z _-]+:\s*\d+$/.test(text)) return ''
  if (/^(NetworkError|TypeError: Failed to fetch)/i.test(text)) return ''
  if (/^(Connexion échouée|Inscription échouée|Quiz submit|Formateur )/i.test(text)) return ''
  return text
}

function readBackendValidation(data) {
  if (!data || typeof data !== 'object') return ''
  const entries = Object.entries(data)
    .map(([field, value]) => {
      const list = Array.isArray(value) ? value : [value]
      const cleaned = list.map((v) => String(v || '').trim()).filter(Boolean)
      if (cleaned.length === 0) return ''
      if (field === 'detail') return cleaned.join(' ')
      if (field === 'non_field_errors') return cleaned.join(' ')
      const label = FIELD_LABELS[field] ?? field.replaceAll('_', ' ')
      return label ? `${label}: ${cleaned.join(' ')}` : cleaned.join(' ')
    })
    .filter(Boolean)
  return entries.join(' ')
}

export function getReadableFormError(error, fallbackMessage = 'Une erreur est survenue. Réessayez.') {
  const backendMessage = readBackendValidation(error?.data)
  if (backendMessage) return toSentence(backendMessage)

  const status = Number(error?.status || 0)
  if (status === 400) return fallbackMessage
  if (status === 401) return 'Vous devez vous connecter pour continuer.'
  if (status === 403) return "Vous n'avez pas les droits nécessaires pour cette action."
  if (status === 404) return "L'élément demandé est introuvable."
  if (status === 409) return 'Cette action entre en conflit avec des données existantes.'
  if (status === 429) return 'Trop de tentatives. Patientez quelques instants puis réessayez.'
  if (status >= 500) return 'Le serveur rencontre un problème. Réessayez dans quelques minutes.'

  const raw = normalizeMessage(error?.message)
  if (raw) return toSentence(raw)

  return fallbackMessage
}
