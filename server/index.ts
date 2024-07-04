import { OpenAPIHono, z } from '@hono/zod-openapi'
import { storage } from './routes/storage'
import { swaggerUI } from '@hono/swagger-ui'
import { errorHandlerMiddleware } from './middleware/errorHandler'

export const app = new OpenAPIHono()


// 抛出错误，使错误能在中间件处理
app.onError((err, ctx) => { throw err })

app.use(errorHandlerMiddleware)

app.route('/storage', storage)

app.get('/swagger', swaggerUI({ url: '/doc' }))

app.doc('/doc', {
  info: {
    title: 'Charsui API',
    version: 'v1'
  },
  openapi: '3.1.0'
})

const charsuiServer = Bun.serve({
  port: 3001,
  fetch: app.fetch
})

console.log(`start charsui server on ${charsuiServer.url}`)
