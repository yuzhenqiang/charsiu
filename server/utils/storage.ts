import { resolve, join } from 'node:path'

const STORAGE_PATH = resolve(process.env.STORAGE_PATH || './storage')

/** 获取真实路径 */
export const getRealPath = (relativePath: string) => join(STORAGE_PATH, relativePath)

/** 验证路径是否与存储库内 */
export const validStoragePath = (path: string) => {
  return path.indexOf(STORAGE_PATH) === 0
}