import 'dotenv/config'
import { main } from './src/bootstrap.js'

main().catch((error) => {
  console.error('Failed to start KrishiVerse backend:', error)
  process.exit(1)
})

