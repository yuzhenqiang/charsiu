import { join } from 'node:path'
import { readdir, stat, mkdir, exists } from 'node:fs/promises'
import { Context, Hono } from "hono";
import mime from 'mime'
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { write } from 'bun';
import { HTTPException } from 'hono/http-exception'
import { Errno } from '../../../interface/errno';

export const storage = new Hono()

/** 解析请求的目录 */
const getStoragePath = (ctx: Context) => ctx.req.path.slice(ctx.req.routePath.length - 2)
/** 获取真实目录路径 */
const getRealDir = (relativePath: string) => join(process.env.STORAGE_PATH!, relativePath)



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