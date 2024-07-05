import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { ResponseSchema } from "~/interface";
import { getRealPath, validStoragePath } from "~/server/libs/storage";
import { mkdir, exists } from 'node:fs/promises'
import { write } from 'bun';
import { Errno } from "~/interface/errno";

const api = new OpenAPIHono()

const route = createRoute({
  path: '/',
  method: 'post',
  description: '新增文件或目录',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            overwrite: z.enum(['Y', 'N']).describe('当文件存在时是否覆盖已有文件'),
            dest: z.string().trim().min(1).openapi({ example: '/dest' }).describe('目标目录'),
            filename: z.string().trim().min(1).openapi({ example: 'hello.txt' }).describe('文件名称'),
            blob: z.instanceof(Blob).optional().openapi({ type: 'string', format: 'binary' }).describe('文件数据')
          })
        }
      }
    }
  },
  responses: {
    200: {
      description: '操作成功',
      content: {
        'application/json': {
          schema: ResponseSchema
        }
      }
    }
  }
})

api.openapi(route, async (ctx) => {
  const { overwrite, dest, filename, blob } = ctx.req.valid('form')
  /** 真实目录 */
  const realDest = getRealPath(dest)
  // 验证目标路径是否于存储库下
  if (!validStoragePath(realDest)) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })
  const filepath = filename.split('/').at(-1)!

  if (overwrite === 'N') {
    const isExists = await exists(filepath)
    if (isExists) throw new HTTPException(500, { message: '文件或目录已存在', cause: { errno: Errno.FS_Exists } })
  }

  if (!blob) {
    await mkdir(filepath)
  } else {
    await write(filepath, blob)
  }
  return ctx.json({ success: true })
})

export default api