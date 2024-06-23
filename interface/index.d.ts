/** 文件对象 */
interface FileItem {
  /** 文件名称 */
  name: string;
  /** 文件路径 */
  path: string;
  /** 文件大小 */
  size: number;
  /** 创建时间 */
  createTime: number;
  /** 修改时间 */
  modifyTime: number;
  /** 是否为文件 */
  isFile: boolean;
  /** 文件类型 */
  mimeType: string | null;
}