// 抖音 video 的 src 必须以 https://、ttfile:// 或 file:// 开头，不能直接写 /xxx.mp4。
// 开发：优先 copy 包内视频到 ttfile://user/；失败时用本地静态服务。
// 上线：上传到 HTTPS，配置 HATCH_VIDEO_URL 和 request 合法域名。

export const HATCH_VIDEO_CACHE_KEY = 'hatch_video_4_path'
export const HATCH_VIDEO_PACK_NAME = '鸡破壳4.mp4'

export const HATCH_VIDEO_URL = ''
export const HATCH_VIDEO_URL_DEV = 'http://127.0.0.1:8765/鸡破壳4.mp4'

export function getHatchVideoUrl(): string {
  return HATCH_VIDEO_URL || HATCH_VIDEO_URL_DEV
}
