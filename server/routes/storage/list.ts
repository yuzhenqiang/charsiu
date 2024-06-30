import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import mime from 'mime'
import { FileItem, FileItemSchema, ResponseSchema } from "~/interface";
import { getRealPath, validStoragePath } from "~/server/utils/storage";
import { Errno } from "~/interface/errno";

const router = new OpenAPIHono()

const route = createRoute({
  path: '/',
  method: 'get',
  description: '获取目录下的文件列表',
  request: {
    query: z.object({
      source: z.string().trim().min(1).openapi({ example: '/source' }).describe('目录地址')
    })
  },
  responses: {
    200: {
      description: '返回目录下的文件列表',
      content: {
        "application/json": {
          schema: ResponseSchema.extend({
            files: FileItemSchema.array().describe('文件列表')
          })
        }
      }
    }
  }
})

router.openapi(route, async (ctx) => {
  /** 请求目录 */
  const { source } = ctx.req.valid('query')
  /** 真实目录 */
  const realSource = getRealPath(source)
  // 验证目标路径是否于存储库下
  if (!validStoragePath(realSource)) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })
  /** 文件名称 */
  const fileNames = await readdir(realSource)
  /** 文件对象集合 */
  const files = await Promise.all(fileNames.map(async filename => {
    const info = await stat(join(realSource, filename))
    const file: FileItem = {
      name: filename,
      path: join(source, filename),
      size: info.size,
      createTime: info.ctimeMs,
      modifyTime: info.mtimeMs,
      isFile: info.isFile(),
      mimeType: mime.getType(filename)
    }
    return file
  }))
  return ctx.json({ success: true, files: files })
})

export default router