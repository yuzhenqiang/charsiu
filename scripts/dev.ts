import { app } from '../server'


const charsuiServer = Bun.serve({
  port: 3000,
  fetch: app.fetch
})

console.log(`start charsui server on ${charsuiServer.url}`)
