import { resolve, join } from 'node:path'
import { readdir, stat } from 'node:fs/promises'
import { Context, Hono } from "hono";
import mime from 'mime'

export const storage = new Hono()

/** 解析请求的目录 */
const getStoragePath = (ctx: Context) => ctx.req.path.slice(ctx.req.routePath.length - 2)
/** 获取真实目录路径 */
const getRealDir = (relativePath: string) => join(process.env.STORAGE_PATH!, relativePath)



/** 获取目录下的文件信息 */
storage.get('*', async (ctx) => {
  try {
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
  } catch (err) {
    console.log(err)
    if (err instanceof Error && 'code' in err) {
      let message: string
      switch (err.code) {
        case 'ENOENT':
          message = '找不到目录'
          break
        case 'ENOTDIR':
          message = '此路径并非文件夹'
          break
        default:
          message = '文件系统错误'
      }
      return ctx.json({ code: 201, message: message })
    }
    throw err
  }
})