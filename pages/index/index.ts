import { getBgmUrl } from '../../config/audio'

const BGM_CACHE_KEY = 'bgm_file_path'
const AUTO_SCENE2_DELAY = 3000

let bgAudio: ReturnType<typeof tt.createInnerAudioContext> | null = null

function destroyBgAudio() {
  if (!bgAudio) return
  bgAudio.stop()
  bgAudio.destroy()
  bgAudio = null
}

function startBgAudio(src: string) {
  destroyBgAudio()

  bgAudio = tt.createInnerAudioContext()
  bgAudio.obeyMuteSwitch = false
  bgAudio.loop = true
  bgAudio.autoplay = true
  bgAudio.volume = 1

  bgAudio.onError((err) => {
    console.error('bgAudio error:', err.errMsg, err.errCode, 'src:', src)
  })
  bgAudio.onPlay(() => {
    console.log('bgAudio playing:', src)
  })
  bgAudio.onCanplay(() => {
    bgAudio?.play()
  })

  bgAudio.src = src
}

function downloadAndPlayBgm() {
  const url = getBgmUrl()
  if (!url) {
    console.error('请在 config/audio.ts 中配置 BGM_URL')
    return
  }

  console.log('downloading bgm:', url)
  tt.downloadFile({
    url,
    success(res) {
      if (res.statusCode !== 200) {
        console.error('download bgm failed, status:', res.statusCode)
        return
      }

      tt.saveFile({
        tempFilePath: res.tempFilePath,
        success(saveRes) {
          tt.setStorageSync(BGM_CACHE_KEY, saveRes.savedFilePath)
          startBgAudio(saveRes.savedFilePath)
        },
        fail() {
          startBgAudio(res.tempFilePath)
        },
      })
    },
    fail(err) {
      console.error('download bgm failed:', err)
    },
  })
}

function initBgAudio() {
  const cachedPath = tt.getStorageSync(BGM_CACHE_KEY) as string
  if (cachedPath) {
    startBgAudio(cachedPath)
    return
  }
  downloadAndPlayBgm()
}

Page({
  data: {
    chickenAnimating: false,
    bowlVisible: false,
    scene2Active: false,
    eggAnimating: false,
  },

  autoSceneTimer: null as ReturnType<typeof setTimeout> | null,
  transitioned: false,

  onLoad() {
    initBgAudio()
  },

  onShow() {
    if (bgAudio?.paused) {
      bgAudio.play()
    }
  },

  onReady() {
    setTimeout(() => {
      this.setData({ chickenAnimating: true })
    }, 300)
  },

  onChickenAnimationEnd() {
    this.setData({ bowlVisible: true })

    this.autoSceneTimer = setTimeout(() => {
      this.goToScene2()
    }, AUTO_SCENE2_DELAY)
  },

  onChickenTap() {
    this.goToScene2()
  },

  goToScene2() {
    if (this.transitioned) return
    this.transitioned = true

    if (this.autoSceneTimer) {
      clearTimeout(this.autoSceneTimer)
      this.autoSceneTimer = null
    }

    this.setData({ scene2Active: true })

    setTimeout(() => {
      this.setData({ eggAnimating: true })
    }, 300)
  },

  onPageTap() {
    if (bgAudio?.paused) {
      bgAudio.play()
    } else if (!bgAudio) {
      initBgAudio()
    }
  },

  onUnload() {
    if (this.autoSceneTimer) {
      clearTimeout(this.autoSceneTimer)
      this.autoSceneTimer = null
    }
    destroyBgAudio()
  },
})
