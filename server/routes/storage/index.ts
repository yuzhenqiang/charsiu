import { resolve, join } from 'node:path'
import { readdir, stat, mkdir, exists, rename, rm, cp } from 'node:fs/promises'
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import mime from 'mime'
import { write } from 'bun';
import { HTTPException } from 'hono/http-exception'
import { Errno } from '../../../interface/errno';
import { FileItem, FileItemSchema, ResponseSchema } from '../../../interface';

const STORAGE_PATH = resolve(process.env.STORAGE_PATH || './storage')

export const storage = new OpenAPIHono()
/** 获取真实目录路径 */
const getRealPath = (relativePath: string) => join(STORAGE_PATH, relativePath)
const validStoragePath = (path: string) => {
  return path.indexOf(STORAGE_PATH) === 0
}

storage.openapi(
  createRoute({
    method: 'get',
    path: '/list',
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
  }),
  async (ctx) => {
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
  }
)

storage.openapi(
  createRoute({
    path: '/create',
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
  }),
  async (ctx) => {
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
  }
)

storage.openapi(
  createRoute({
    path: '/move',
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
  }),
  async (ctx) => {
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
  }
)

storage.openapi(
  createRoute({
    path: '/delete',
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
  }),
  async (ctx) => {
    /** 目标文件夹 */
    const { dest } = ctx.req.valid('json')
    /** 真实目录 */
    const realDest = getRealPath(dest)
    // 验证目标路径是否于存储库下
    if (!validStoragePath(realDest)) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })
  
    await rm(realDest, { recursive: true })
    return ctx.json({ success: true })
  }
)

storage.openapi(
  createRoute({
    path: '/copy',
    method: 'post',
    description: '复制文件或目录',
    request: {
      body: {
        content: {
          'application/json': {
            schema:  z.object({
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
  }),
  async (ctx) => {
    const { source, dest } = ctx.req.valid('json')
    /** 真实源路径 */
    const realSource = getRealPath(source)
    // 验证源路径是否于存储库下
    if (!validStoragePath(realSource)) throw new HTTPException(500, { message: '源路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })
    // 验证源路径是否存在
    const isSourceExists = await exists(realSource)
    if (!isSourceExists) throw new HTTPException(500, { message: '文件或目录不存在', cause: { errno: Errno.FS_Not_Exists } })
    /** 目标路径 */
    const realDest = getRealPath(dest)
    // 验证目标路径是否于存储库下
    if (!validStoragePath(realDest)) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })
    // 验证目标路径是否存在
    const isDestExists = await exists(realDest)
    if (isDestExists) throw new HTTPException(500, { message: '文件或目录已存在', cause: { errno: Errno.FS_Exists } })
  
    await cp(realSource, realDest, { recursive: true })
    return ctx.json({ success: true })
  }  
)
