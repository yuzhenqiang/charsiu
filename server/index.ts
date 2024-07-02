import { OpenAPIHono, z } from '@hono/zod-openapi'
import { storage } from './routes/storage'
import { HTTPException } from 'hono/http-exception'
import { Errno } from '../interface/errno'
import { swaggerUI } from '@hono/swagger-ui'
import { HTTPResponseError } from 'hono/types'
import { Context } from 'hono'
import { StatusCode } from 'hono/utils/http-status'

export const app = new OpenAPIHono()

type ServerError = HTTPResponseError | z.ZodError | Error;
const errorHandler = (err: ServerError, ctx: Context) => {
  let status: StatusCode = 500
  let errno = Errno.Internal_Error
  let message = '服务器内部错误'

  if (err instanceof HTTPException) {
    if (err.message) message = err.message
    if (err.cause && typeof err.cause === 'object' && 'errno' in err.cause) {
      errno = err.cause.errno as Errno
    }
    status = err.status
  }

  if (typeof err == 'object' && 'name' in err && err.name === 'ZodError') {
    status = 400
    errno = Errno.Zod_Error
    message = '请求参数错误'
  }

  if (err instanceof Error && 'code' in err && 'errno' in err) {
    switch (err.code) {
      case 'ENOENT':
        message = '找不到文件或目录'
        errno = Errno.FS_Not_Found
        break
      case 'ENOTDIR':
        message = '此路径并非文件夹'
        errno = Errno.FS_Not_Dir
        break
      case 'EPERM':
        message = '操作不允许'
        errno = Errno.FS_Not_Permitted
        break
      default:
        message = '文件系统错误'
        errno = Errno.FS_Error
    }
  }

  return ctx.res = new Response(
    JSON.stringify({ success: false, message, errno }),
    { status, headers: { 'Content-Type': 'application/json' } }
  )
}

// 错误处理
app.onError((err, ctx) => { throw err })

app.use(async (ctx, next) => {
  try {
    await next()
    if (ctx.res.status === 400 && ctx.res.headers.get('Content-Type')?.startsWith('application/json')) {
      const copy = ctx.res.clone()
      const data = await copy.json()
      if (typeof data === 'object' && typeof data.error === 'object' && data.error.name === 'ZodError') {
        throw data.error
      }
    }
  } catch (err) {
    return errorHandler(err as ServerError, ctx)
  }
})

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
