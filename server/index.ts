import { Hono } from 'hono'
import { storage } from './routes/storage'

export const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!' + Bun.env.STORE_PATH)
})

app.route('/storage', storage)

const charsuiServer = Bun.serve({
  port: 3001,
  fetch: app.fetch
})

console.log(`start charsui server on ${charsuiServer.url}`)
