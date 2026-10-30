/**
 * Centralized Indian Standard Time (IST) Date and Time Utilities
 * Timezone: Asia/Kolkata (UTC+05:30)
 */

export const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Safely parse date inputs to a JavaScript Date object, ensuring naive ISO strings
 * from backend SQLite/Pydantic (without timezone offset) are correctly treated as UTC.
 *
 * @param {string|number|Date|null|undefined} input
 * @returns {Date|null}
 */
export function parseDateUTC(input) {
  if (input === null || input === undefined || input === '') {
    return null
  }
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input
  }
  if (typeof input === 'number') {
    const d = new Date(input)
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof input === 'string') {
    let str = input.trim()
    if (!str) return null

    // If format is 'YYYY-MM-DD HH:mm:ss...', replace space with 'T'
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(str)) {
      str = str.replace(' ', 'T')
    }

    // If it is an ISO date-time without timezone offset (no Z and no +/-HH:mm),
    // append 'Z' so ECMAScript parses it as UTC rather than local time.
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str)) {
      str += 'Z'
    }

    const d = new Date(str)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/**
 * Format a timestamp into date and time in Indian Standard Time (Asia/Kolkata).
 * Default output: "30 Oct 2026, 5:30 pm"
 *
 * @param {string|number|Date|null|undefined} input
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDateTimeIST(input, options = {}) {
  const d = parseDateUTC(input)
  if (!d) return '—'

  const defaultOptions = {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }

  return new Intl.DateTimeFormat('en-IN', {
    ...defaultOptions,
    ...options,
  }).format(d)
}

/**
 * Format a timestamp into date only in Indian Standard Time (Asia/Kolkata).
 * Default output: "30 Oct 2026" (or "30 October 2026" if month: 'long')
 *
 * @param {string|number|Date|null|undefined} input
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDateIST(input, options = {}) {
  const d = parseDateUTC(input)
  if (!d) return '—'

  const defaultOptions = {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }

  return new Intl.DateTimeFormat('en-IN', {
    ...defaultOptions,
    ...options,
  }).format(d)
}

/**
 * Format a timestamp into time only in Indian Standard Time (Asia/Kolkata).
 * Default output: "5:30 pm"
 *
 * @param {string|number|Date|null|undefined} input
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatTimeIST(input, options = {}) {
  const d = parseDateUTC(input)
  if (!d) return '—'

  const defaultOptions = {
    timeZone: IST_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }

  return new Intl.DateTimeFormat('en-IN', {
    ...defaultOptions,
    ...options,
  }).format(d)
}

/**
 * Format relative time or IST date if more than 24 hours ago.
 *
 * @param {string|number|Date|null|undefined} input
 * @returns {string}
 */
export function formatRelativeOrIST(input) {
  const d = parseDateUTC(input)
  if (!d) return '—'

  const diffMs = Date.now() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)

  if (diffSec < 60) {
    return 'just now'
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  return formatDateTimeIST(d)
}
