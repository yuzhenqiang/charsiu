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

/** 解析请求的目录 */
const getStoragePath = (ctx: Context) => ctx.req.path.slice(ctx.req.routePath.length - 2)
/** 获取真实目录路径 */
const getRealDir = (relativePath: string) => join(STORAGE_PATH, relativePath)



/** 获取目录下的文件信息 */
storage.get('*', async (ctx) => {
  /** 请求目录 */
  const storagePath = getStoragePath(ctx)
  /** 真实目录 */
  const realDir = getRealDir(storagePath)
  /** 文件名称 */
  const fileNames = await readdir(realDir)
  /** 文件对象集合 */
  const files = await Promise.all(fileNames.map(async filename => {
    const info = await stat(join(realDir, filename))
    const file: FileItem = {
      name: filename,
      path: join(storagePath, filename),
      size: info.size,
      createTime: info.ctimeMs,
      modifyTime: info.mtimeMs,
      isFile: info.isFile(),
      mimeType: mime.getType(filename)
    }
    return file
  }))
  return ctx.json({ path: storagePath, files: files })
})

// 新增文件或目录
storage.post('*', zValidator('form', z.object({ overwrite: z.enum(['Y', 'N']), name: z.string().min(1), file: z.instanceof(File).optional() })), async (ctx) => {
  /** 请求目录 */
  const storagePath = getStoragePath(ctx)
  /** 真实目录 */
  const realDir = getRealDir(storagePath)
  const { overwrite, name, file } = ctx.req.valid('form')

  /** 相对路径 */
  const relativeFilepath = join(storagePath, name)
  /** 真实路径 */
  const realFilepath = join(realDir, name)

  if (overwrite === 'N') {
    const isExists = await exists(realFilepath)
    if (isExists) throw new HTTPException(500, { message: '文件或目录已存在', cause: { errno: Errno.FS_Exists } })
  }

  if (!file) {
    await mkdir(realFilepath)
  } else {
    await write(realFilepath, file)
  }
  return ctx.json({ path: relativeFilepath, message: '操作成功' })
})

// 修改文件或目录名，或移动位置
storage.put('*', zValidator('json', z.object({ source: z.string().min(1), dest: z.string().min(1) })), async (ctx) => {
  /** 请求目录 */
  const storagePath = getStoragePath(ctx)
  /** 真实目录 */
  const realDir = getRealDir(storagePath)
  const { source, dest } = ctx.req.valid('json')
  /** 源路径 */
  const sourcePath = join(realDir, source)
  // 验证源路径是否于存储库下
  if (sourcePath.indexOf(STORAGE_PATH) !== 0) throw new HTTPException(500, { message: '源路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })
  // 验证源路径是否存在
  const isSourceExists = await exists(sourcePath)
  if (!isSourceExists) throw new HTTPException(500, { message: '文件或目录不存在', cause: { errno: Errno.FS_Not_Exists } })
  /** 目标路径 */
  const destPath = join(realDir, dest)
  // 验证目标路径是否于存储库下
  if (destPath.indexOf(STORAGE_PATH) !== 0) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })

  await rename(sourcePath, destPath)

  return ctx.json({ path: destPath, message: '操作成功' })
})

// 删除文件或目录
storage.delete('*', zValidator('json', z.object({ dest: z.string().min(1) })), async (ctx) => {
  /** 请求目录 */
  const storagePath = getStoragePath(ctx)
  /** 真实目录 */
  const realDir = getRealDir(storagePath)

  const { dest } = ctx.req.valid('json')
  /** 目标路径 */
  const destPath = join(realDir, dest)
  // 验证目标路径是否于存储库下
  if (destPath.indexOf(STORAGE_PATH) !== 0) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })

  await rm(destPath, { recursive: true })
  return ctx.json({ path: destPath, message: '操作成功' })
})

// 复制文件或目录
storage.on('copy', '*', zValidator('json', z.object({ source: z.string().min(1), dest: z.string().min(1) })), async (ctx) => {
  /** 请求目录 */
  const storagePath = getStoragePath(ctx)
  /** 真实目录 */
  const realDir = getRealDir(storagePath)
  const { source, dest } = ctx.req.valid('json')
  /** 源路径 */
  const sourcePath = join(realDir, source)
  // 验证源路径是否于存储库下
  if (sourcePath.indexOf(STORAGE_PATH) !== 0) throw new HTTPException(500, { message: '源路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })
  // 验证源路径是否存在
  const isSourceExists = await exists(sourcePath)
  if (!isSourceExists) throw new HTTPException(500, { message: '文件或目录不存在', cause: { errno: Errno.FS_Not_Exists } })
  /** 目标路径 */
  const destPath = join(realDir, dest)
  // 验证目标路径是否于存储库下
  if (destPath.indexOf(STORAGE_PATH) !== 0) throw new HTTPException(500, { message: '目标路径无操作权限', cause: { errno: Errno.FS_No_Permissions } })
  // 验证目标路径是否存在
  const isDestExists = await exists(destPath)
  if (isDestExists) throw new HTTPException(500, { message: '文件或目录已存在', cause: { errno: Errno.FS_Exists } })

  await cp(sourcePath, destPath, { recursive: true })
  return ctx.json({ path: destPath, message: '操作成功' })
})
