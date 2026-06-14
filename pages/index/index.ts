import { getBgmUrl } from '../../config/audio'

const BGM_CACHE_KEY = 'bgm_file_path'
const BGM_MUTED_KEY = 'bgm_muted'
const AUTO_SCENE2_DELAY = 3000
const FEED_APPEAR_DELAY = 500
const FEED_TILT_DELAY = 500
const FEED_IN_BOWL_ANIMATION_MS = 800

let bgAudio: ReturnType<typeof tt.createInnerAudioContext> | null = null
let shouldAutoPlay = true

function destroyBgAudio() {
  if (!bgAudio) return
  bgAudio.stop()
  bgAudio.destroy()
  bgAudio = null
}

function startBgAudio(src: string, autoPlay = true) {
  destroyBgAudio()
  shouldAutoPlay = autoPlay

  bgAudio = tt.createInnerAudioContext()
  bgAudio.obeyMuteSwitch = false
  bgAudio.loop = true
  bgAudio.autoplay = autoPlay
  bgAudio.volume = 1

  bgAudio.onError((err) => {
    console.error('bgAudio error:', err.errMsg, err.errCode, 'src:', src)
  })
  bgAudio.onCanplay(() => {
    if (shouldAutoPlay) {
      bgAudio?.play()
    }
  })

  bgAudio.src = src
}

function playBgm() {
  if (!bgAudio) return
  shouldAutoPlay = true
  bgAudio.play()
}

function pauseBgm() {
  shouldAutoPlay = false
  bgAudio?.pause()
}

function copyPackAudio(onSuccess: (path: string) => void, onFail: () => void) {
  const fs = tt.getFileSystemManager()
  const destPath = 'ttfile://user/bgm.m4a'

  fs.copyFile({
    srcPath: 'audio.m4a',
    destPath,
    success() {
      tt.setStorageSync(BGM_CACHE_KEY, destPath)
      onSuccess(destPath)
    },
    fail(err) {
      console.error('copy pack audio failed:', err)
      onFail()
    },
  })
}

function downloadAndPlayBgm(autoPlay = true) {
  const url = getBgmUrl()
  if (!url) {
    console.error('请在 config/audio.ts 中配置 BGM_URL')
    return
  }

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
          startBgAudio(saveRes.savedFilePath, autoPlay)
        },
        fail() {
          startBgAudio(res.tempFilePath, autoPlay)
        },
      })
    },
    fail(err) {
      console.error('download bgm failed:', err)
    },
  })
}

function initBgAudio(autoPlay = true) {
  const cachedPath = tt.getStorageSync(BGM_CACHE_KEY) as string
  if (cachedPath) {
    startBgAudio(cachedPath, autoPlay)
    return
  }

  copyPackAudio(
    (path) => startBgAudio(path, autoPlay),
    () => downloadAndPlayBgm(autoPlay),
  )
}

Page({
  data: {
    chickenAnimating: false,
    bowlVisible: false,
    scene2Active: false,
    eggAnimating: false,
    emptyBowlVisible: false,
    feedWheatVisible: false,
    feedWheatTilting: false,
    feedInBowlAnimating: false,
    actionButtonsVisible: false,
    feedWeightVisible: false,
    fingerVisible: false,
    bgmMuted: false,
  },

  autoSceneTimer: null as ReturnType<typeof setTimeout> | null,
  transitioned: false,

  feedTimer: null as ReturnType<typeof setTimeout> | null,
  feedTiltTimer: null as ReturnType<typeof setTimeout> | null,
  feedInBowlTimer: null as ReturnType<typeof setTimeout> | null,

  onLoad() {
    const bgmMuted = !!tt.getStorageSync(BGM_MUTED_KEY)
    this.setData({ bgmMuted })
    initBgAudio(!bgmMuted)
  },

  onShow() {
    if (!this.data.bgmMuted) {
      playBgm()
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

  onEggAnimationEnd() {
    if (this.data.emptyBowlVisible) return
    this.setData({
      emptyBowlVisible: true,
      actionButtonsVisible: true,
    })
    this.startFeedSequence()
  },

  startFeedSequence() {
    this.feedTimer = setTimeout(() => {
      this.setData({ feedWheatVisible: true })
    }, FEED_APPEAR_DELAY)

    this.feedTiltTimer = setTimeout(() => {
      this.setData({ feedWheatTilting: true })

      setTimeout(() => {
        this.onFeedWheatTiltEnd()
      }, 450)
    }, FEED_APPEAR_DELAY + FEED_TILT_DELAY)
  },

  onFeedWheatTiltEnd() {
    if (!this.data.feedWheatTilting || this.data.feedInBowlAnimating) return
    this.setData({
      feedWheatVisible: false,
      feedWheatTilting: false,
      feedInBowlAnimating: true,
    })

    this.feedInBowlTimer = setTimeout(() => {
      this.onFeedInBowlAnimationEnd()
    }, FEED_IN_BOWL_ANIMATION_MS)
  },

  onFeedInBowlAnimationEnd() {
    if (this.data.feedWeightVisible) return
    this.setData({
      feedWeightVisible: true,
      fingerVisible: true,
    })
  },

  onScene2EggTap() {
    if (!this.data.fingerVisible) return
    this.setData({ fingerVisible: false })
  },

  onToggleBgm() {
    const nextMuted = !this.data.bgmMuted
    this.setData({ bgmMuted: nextMuted })
    tt.setStorageSync(BGM_MUTED_KEY, nextMuted)

    if (nextMuted) {
      pauseBgm()
      return
    }

    if (bgAudio) {
      playBgm()
      return
    }

    initBgAudio(true)
  },

  onPageTap() {
    if (this.data.bgmMuted) return
    if (!bgAudio) {
      initBgAudio(true)
      return
    }
    if (bgAudio.paused) {
      playBgm()
    }
  },

  onUnload() {
    if (this.autoSceneTimer) {
      clearTimeout(this.autoSceneTimer)
      this.autoSceneTimer = null
    }
    if (this.feedTimer) {
      clearTimeout(this.feedTimer)
      this.feedTimer = null
    }
    if (this.feedTiltTimer) {
      clearTimeout(this.feedTiltTimer)
      this.feedTiltTimer = null
    }
    if (this.feedInBowlTimer) {
      clearTimeout(this.feedInBowlTimer)
      this.feedInBowlTimer = null
    }
    destroyBgAudio()
  },
})
