// 抖音小程序不支持直接播放包内音频，必须通过 HTTPS 下载后播放。
// 上线前：把 audio.m4a 上传到你的服务器/CDN，填入 BGM_URL，
// 并在开发者平台 → 开发设置 → 服务器域名 → request 合法域名 中配置该域名。

// 生产环境音频地址（上线时替换为你的 HTTPS 地址）
export const BGM_URL = ''

// 本地开发：project.config.json 中 urlCheck 设为 false，启动静态服务后使用
export const BGM_URL_DEV = 'http://127.0.0.1:8765/audio.m4a'

export function getBgmUrl(): string {
  return BGM_URL || BGM_URL_DEV
}
