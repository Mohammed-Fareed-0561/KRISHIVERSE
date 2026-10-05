import { createLogger as winstonCreateLogger, format, transports } from 'winston'
 
const { combine, timestamp, printf, colorize, errors } = format
 
const isDev = (process.env.NODE_ENV || 'development') === 'development'
 
// Handles log.info({ msg: 'text', ...meta }) pattern correctly
const objectFormat = printf(({ level, message, namespace, timestamp: ts, ...meta }) => {
  let text  = message
  let extra = meta
 
  if (typeof message === 'object' && message !== null) {
    const { msg, ...rest } = message
    text  = msg || JSON.stringify(message)
    extra = { ...meta, ...rest }
  }
 
  const ns      = namespace ? `[${namespace}] ` : ''
  const metaStr = Object.keys(extra).length ? ' ' + JSON.stringify(extra) : ''
 
  return isDev
    ? `${level}: ${ns}${text}${metaStr}`
    : JSON.stringify({ ts, level, namespace, msg: text, ...extra })
})
 
const base = winstonCreateLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: isDev
    ? combine(colorize(), objectFormat)
    : combine(timestamp(), errors({ stack: true }), objectFormat),
  transports: [new transports.Console()],
})
 
/**
 * Returns a child logger scoped to a namespace.
 * const log = createLogger('auth')
 * log.info({ msg: 'user logged in', userId })
 */
export function createLogger(namespace = 'app') {
  return base.child({ namespace })
}
 
export default base
 