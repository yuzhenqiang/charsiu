import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { exists, rename } from 'node:fs/promises'
import { ResponseSchema } from "~/interface";
import { Errno } from "~/interface/errno";
import { getRealPath, validStoragePath } from "~/server/libs/storage";

const api = new OpenAPIHono()

const route = createRoute({
  path: '/',
  method: 'post',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            source: z.string().trim().min(1).openapi({ example: '/source' }).describe('源地址'),
            dest: z.string().trim().min(1).openapi({ example: '/dest' }).describe('目标地址')
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
  const { source, dest } = ctx.req.valid('json')
  /** 真实源路径 */
  const realSourcePath = getRealPath(source)
  /** 真实目标路径 */
  const realDestPath = getRealPath(dest)
  // 验证源路径是否于存储库下
  if (!validStoragePath(realSourcePath)) throw new HTTPException(500, { message: '源路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })
  // 验证源路径是否存在
  const isSourceExists = await exists(realSourcePath)
  if (!isSourceExists) throw new HTTPException(500, { message: '文件或目录不存在', cause: { errno: Errno.FS_Not_Exists } })
  // 验证目标路径是否于存储库下
  if (!validStoragePath(realDestPath)) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })

  await rename(realSourcePath, realDestPath)

  return ctx.json({ success: true })
})

export default api