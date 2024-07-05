import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { ResponseSchema } from "~/interface";
import { Errno } from "~/interface/errno";
import { getRealPath, validStoragePath } from "~/server/libs/storage";
import { rm } from 'node:fs/promises'

const api = new OpenAPIHono()

const route = createRoute({
  path: '/',
  method: 'post',
  request: {
    body: {
      content: {
        'application/json': {
          schema:  z.object({
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
  /** 目标文件夹 */
  const { dest } = ctx.req.valid('json')
  /** 真实目录 */
  const realDest = getRealPath(dest)
  // 验证目标路径是否于存储库下
  if (!validStoragePath(realDest)) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })

  await rm(realDest, { recursive: true })
  return ctx.json({ success: true })
})

export default api
