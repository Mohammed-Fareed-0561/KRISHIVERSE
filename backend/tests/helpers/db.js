import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { buildApp } from '../../src/bootstrap.js'

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
 * Clear all collections between tests.
 */
export async function clearDatabase() {
  const collections = mongoose.connection.collections
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({})
  }
}