import { z } from "@hono/zod-openapi";
import { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { HTTPResponseError, Next } from "hono/types";
import { StatusCode } from "hono/utils/http-status";
import { Errno } from "~/interface/errno";

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

export const errorHandlerMiddleware = async (ctx: Context, next: Next) => {
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
}