import { resolve, join } from 'node:path'
import { readdir, stat, mkdir, exists, rename, rm, cp } from 'node:fs/promises'
import { Context, Hono } from "hono";
import mime from 'mime'
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { write } from 'bun';
import { HTTPException } from 'hono/http-exception'
import { Errno } from '../../../interface/errno';

const STORAGE_PATH = resolve(process.env.STORAGE_PATH || './storage')

export const storage = new Hono()
/** 获取真实目录路径 */
const getRealPath = (relativePath: string) => join(STORAGE_PATH, relativePath)
const validStoragePath = (path: string) => {
  return path.indexOf(STORAGE_PATH) === 0
}


/** 获取目录下的文件列表 */
storage.get('/list', zValidator('query', z.object({ source: z.string().min(1) })), async (ctx) => {
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
  return ctx.json({ source: source, files: files })
})

// 新增文件或目录
storage.post('/create', zValidator('form', z.object({ overwrite: z.enum(['Y', 'N']), dest: z.string().min(1), filename: z.string().min(1), blob: z.instanceof(Blob).optional() })), async (ctx) => {
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
  return ctx.json({ message: '操作成功' })
})

// 修改文件或目录名，或移动位置
storage.post('/move', zValidator('json', z.object({ source: z.string().min(1), dest: z.string().min(1) })), async (ctx) => {
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

  return ctx.json({ message: '操作成功' })
})

// 删除文件或目录
storage.post('/delete', zValidator('json', z.object({ dest: z.string().min(1) })), async (ctx) => {
  /** 目标文件夹 */
  const { dest } = ctx.req.valid('json')
  /** 真实目录 */
  const realDest = getRealPath(dest)
  // 验证目标路径是否于存储库下
  if (!validStoragePath(realDest)) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })

  await rm(realDest, { recursive: true })
  return ctx.json({ message: '操作成功' })
})

// 复制文件或目录
storage.post('/copy', zValidator('json', z.object({ source: z.string().min(1), dest: z.string().min(1) })), async (ctx) => {
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
  return ctx.json({ message: '操作成功' })
})
