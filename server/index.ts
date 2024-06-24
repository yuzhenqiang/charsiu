import { Hono } from 'hono'
import { storage } from './routes/storage'
import { HTTPException } from 'hono/http-exception'
import { Errno } from '../interface/errno'

export const app = new Hono()

// 错误处理
app.onError(async (err, ctx) => {
  let status = 500
  let errno = Errno.Internal_Error
  let message = '服务器内部错误'

  if (err instanceof HTTPException) {
    if (err.message) message = err.message
    if (err.cause && typeof err.cause === 'object' && 'errno' in err.cause) {
      errno = err.cause.errno as Errno
    }
    status = err.status
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

  return new Response(JSON.stringify({ message, errno }), {
    status,
    headers: {
      'content-type': 'application/json'
    }
  })
})

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.route('/storage', storage)

const charsuiServer = Bun.serve({
  port: 3001,
  fetch: app.fetch
})

console.log(`start charsui server on ${charsuiServer.url}`)
