import { z } from '@hono/zod-openapi'
import { Errno } from './errno'

export const FileItemSchema = z.object({
  name: z.string().describe('文件名称').openapi({ example: 'hello.txt' }),
  path: z.string().describe('文件路径').openapi({ example: '/folder1/hello.txt' }),
  size: z.number().describe('文件大小').openapi({ example: 2046 }),
  createTime: z.number().describe('创建时间').openapi({ example: Date.now() }),
  modifyTime: z.number().describe('修改时间').openapi({ example: Date.now() }),
  isFile: z.boolean().describe('是否为文件').openapi({ example: true }),
  mimeType: z.string().or(z.null()).describe('文件类型').openapi({ example: 'text/plain"' })
})

export type FileItem = z.infer<typeof FileItemSchema>

export const ResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional()
})

export const ResponseErrorSchema = ResponseSchema.extend({
  errno: z.nativeEnum(Errno)
})