import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { buildApp } from '../../src/bootstrap.js'
import { resetAuthAttempts } from '../../src/middleware/authRateLimit.js'

let mongoServer

/**
 * Start an in-memory MongoDB and return a supertest-ready app instance.
 */
export async function setupTestApp() {
  process.env.NODE_ENV = 'test'
  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())
  return buildApp()
}

/**
 * Stop the in-memory MongoDB and drop all data.
 */
export async function teardownTestApp() {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  if (mongoServer) {
    await mongoServer.stop()
    mongoServer = undefined
  }
}

/**
 * Clear all collections between tests, including in-memory auth attempt and
 * cooldown counters (they are process-wide state, not database state).
 */
export async function clearDatabase() {
  const collections = mongoose.connection.collections
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
  resetAuthAttempts()
}