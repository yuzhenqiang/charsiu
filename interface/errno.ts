export enum Errno {
  Internal_Error,

  // fs
  FS_Error,
  /** 不是文件夹 */
  FS_Not_Dir,
  /** 文件或目录已存在 */
  FS_Exists,
  /** 文件或目录不存在 */
  FS_Not_Exists,
  /** 文件或目录没找到 */
  FS_Not_Found,
  /** 文件或目录无权限 */
  FS_No_Permissions,
  /** 文件或目录操作不允许 */
  FS_Not_Permitted,

  // zod
  Zod_Error,
  /** 必需参数未传递 */
  Zod_Required,
  /** 无效的参数类型 */
  Zod_Invalid_Type,
  /** 不正确的参数值 */
  Zod_Incorrect_value
}