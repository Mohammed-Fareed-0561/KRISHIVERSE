import logger from '../utils/logger.js'
 
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status  = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'
 
  if (status >= 500) {
    logger.error({ msg: message, stack: err.stack, path: req.path, method: req.method })
  }
 
  res.status(status).json({
    status:  'error',
    message,
    ...(err.code ? { code: err.code } : {}),
  })
}
 