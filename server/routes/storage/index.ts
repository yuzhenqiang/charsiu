import { resolve, join } from 'node:path'
import { readdir, stat } from 'node:fs/promises'
import { Hono } from "hono";
import mime from 'mime'

const storagePath = resolve(process.env.STORAGE_PATH!)

export const storage = new Hono()

/** 获取目录下的文件信息 */
storage.get('*', async (ctx) => {
  try {
    /** 请求地址 */
    const requestPath = ctx.req.path.slice(ctx.req.routePath.length - 2)
    /** 存储目录 */
    const storageDir = join(storagePath, requestPath)
    /** 文件名称 */
    const fileNames = await readdir(storageDir)
    /** 文件对象集合 */
    const files = await Promise.all(fileNames.map(async filename => {
      const info = await stat(join(storageDir, filename))
      const file: FileItem = {
        name: filename,
        path: join(requestPath, filename),
        size: info.size,
        createTime: info.ctimeMs,
        modifyTime: info.mtimeMs,
        isFile: info.isFile(),
        mimeType: mime.getType(filename)
      }
      return file
    }))
    return ctx.json({ path: requestPath, files: files })
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