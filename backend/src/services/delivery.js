import { createLogger } from '../utils/logger.js'
import { isProduction } from './credentials.js'

const log = createLogger('delivery')

/**
 * Delivery adapter for verification codes and password-reset links.
 *
 * The pilot has no SMTP/SMS provider configured. Rather than ship a half-wired
 * SDK, every channel goes through this single adapter with three modes:
 *
 *   dev-response  — non-production. The route MAY include the secret in the
 *                   response body so QA can complete a flow without a provider.
 *   unconfigured  — production without a provider. The secret is never returned
 *                   and never logged; only a provider-less warning is logged.
 *   provider      — reserved for a future SMTP/SMS integration. Nothing else in
 *                   the codebase needs to change when a provider is added.
 *
 * Hard rule: this module never logs verification codes or reset tokens.
 */
export function deliveryMode() {
  return isProduction() ? 'unconfigured' : 'dev-response'
}

/** True when the current mode allows returning the secret to the client. */
export function canExposeSecret() {
  return deliveryMode() === 'dev-response'
}

/**
 * @param {{ channel: 'email'|'sms', kind: 'verification'|'password_reset', to: string }} target
 * @returns {{ mode: string, delivered: boolean }}
 */
export function deliver({ channel, kind, to }) {
  const mode = deliveryMode()

  if (mode === 'dev-response') {
    log.debug({ msg: 'auth secret exposed in response (dev mode)', channel, kind })
    return { mode, delivered: true }
  }

  log.warn({
    msg:        'auth delivery unconfigured — secret generated but not sent',
    channel,
    kind,
    // Address is intentionally omitted: no PII in operational logs.
    recipient:  'redacted',
    action:     'configure an SMTP/SMS provider to enable delivery',
  })
  return { mode, delivered: false }
}
