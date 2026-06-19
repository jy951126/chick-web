import { getBgmUrl } from '../../config/audio'
import {
  getHatchVideoUrl,
  HATCH_VIDEO_CACHE_KEY,
  HATCH_VIDEO_PACK_NAME,
} from '../../config/video'

const BGM_CACHE_KEY = 'bgm_file_path'
const BGM_MUTED_KEY = 'bgm_muted'
const AUTO_SCENE2_DELAY = 3000
const FEED_APPEAR_DELAY = 500
const FEED_TILT_DELAY = 500
const FEED_IN_BOWL_ANIMATION_MS = 800
const EGG_SHAKE_START_DELAY = 1000
const EGG_FINGER_DELAY = 1000
const BAG_FINGER_DELAY = 1000
const FEED_SCATTERED_HOLD_MS = 1000
const HATCH_PROGRESS_STEP_MS = 1000

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

function copyPackHatchVideo(onSuccess: (path: string) => void, onFail: () => void) {
  const fs = tt.getFileSystemManager()
  const destPath = 'ttfile://user/hatch-4.mp4'

  fs.copyFile({
    srcPath: HATCH_VIDEO_PACK_NAME,
    destPath,
    success() {
      tt.setStorageSync(HATCH_VIDEO_CACHE_KEY, destPath)
      onSuccess(destPath)
    },
    fail(err) {
      console.error('copy pack hatch video failed:', err)
      onFail()
    },
  })
}

function downloadHatchVideo(onSuccess: (path: string) => void, onFail?: () => void) {
  const url = getHatchVideoUrl()
  if (!url) {
    console.error('请在 config/video.ts 中配置 HATCH_VIDEO_URL')
    onFail?.()
    return
  }

  tt.downloadFile({
    url,
    success(res) {
      if (res.statusCode !== 200) {
        console.error('download hatch video failed, status:', res.statusCode)
        onFail?.()
        return
      }

      tt.saveFile({
        tempFilePath: res.tempFilePath,
        success(saveRes) {
          tt.setStorageSync(HATCH_VIDEO_CACHE_KEY, saveRes.savedFilePath)
          onSuccess(saveRes.savedFilePath)
        },
        fail() {
          onSuccess(res.tempFilePath)
        },
      })
    },
    fail(err) {
      console.error('download hatch video failed:', err)
      onFail?.()
    },
  })
}

function prepareHatchVideo(onReady: (src: string) => void, onFail?: () => void) {
  const fs = tt.getFileSystemManager()
  const tryCopy = () => {
    copyPackHatchVideo(onReady, () => downloadHatchVideo(onReady, onFail))
  }

  const cachedPath = tt.getStorageSync(HATCH_VIDEO_CACHE_KEY) as string
  if (!cachedPath) {
    tryCopy()
    return
  }

  fs.access({
    path: cachedPath,
    success: () => onReady(cachedPath),
    fail: () => {
      tt.removeStorageSync(HATCH_VIDEO_CACHE_KEY)
      tryCopy()
    },
  })
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
    bgmMuted: false,
    eggShaking: false,
    eggSettled: false,
    eggCracked: false,
    fingerEggVisible: false,
    bagVisible: false,
    fingerBagVisible: false,
    bagTilting: false,
    bagTilted: false,
    feedScatteredVisible: false,
    hatchProgress50Visible: false,
    hatchProgress100Visible: false,
    hatchVideoVisible: false,
    hatchVideoSrc: '',
  },

  autoSceneTimer: null as ReturnType<typeof setTimeout> | null,
  transitioned: false,

  eggShakeTimer: null as ReturnType<typeof setTimeout> | null,
  eggFingerTimer: null as ReturnType<typeof setTimeout> | null,
  bagFingerTimer: null as ReturnType<typeof setTimeout> | null,

  feedTimer: null as ReturnType<typeof setTimeout> | null,
  feedTiltTimer: null as ReturnType<typeof setTimeout> | null,
  feedInBowlTimer: null as ReturnType<typeof setTimeout> | null,

  feedScatteredHoldTimer: null as ReturnType<typeof setTimeout> | null,
  hatchProgress50Timer: null as ReturnType<typeof setTimeout> | null,
  hatchProgress100Timer: null as ReturnType<typeof setTimeout> | null,
  hatchSequenceStarted: false,
  pendingHatchVideoSrc: '',
  hatchVideoPreparing: false,

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
      eggSettled: true,
    })
    this.startEggInteractionSequence()
  },

  startEggInteractionSequence() {
    this.eggShakeTimer = setTimeout(() => {
      this.setData({ eggShaking: true })
    }, EGG_SHAKE_START_DELAY)

    this.eggFingerTimer = setTimeout(() => {
      this.setData({ fingerEggVisible: true })
    }, EGG_SHAKE_START_DELAY + EGG_FINGER_DELAY)
  },

  onFingerEggTap() {
    if (!this.data.fingerEggVisible) return
    this.setData({
      fingerEggVisible: false,
      eggShaking: false,
      eggAnimating: false,
      eggCracked: true,
      bagVisible: true,
    })

    this.bagFingerTimer = setTimeout(() => {
      this.setData({ fingerBagVisible: true })
    }, BAG_FINGER_DELAY)
  },

  onBagTap() {
    if (!this.data.bagVisible || this.data.bagTilting) return
    this.setData({
      fingerBagVisible: false,
      bagTilting: true,
    })
    this.preloadHatchVideo()
  },

  preloadHatchVideo() {
    if (this.hatchVideoPreparing || this.pendingHatchVideoSrc) return
    this.hatchVideoPreparing = true
    console.log('preloading hatch video...')
    prepareHatchVideo(
      (src) => {
        this.pendingHatchVideoSrc = src
        this.hatchVideoPreparing = false
        console.log('hatch video ready:', src)
      },
      () => {
        this.hatchVideoPreparing = false
        console.error('hatch video prepare failed')
      },
    )
  },

  onBagTiltEnd() {
    if (!this.data.bagTilting) return
    this.setData({
      bagTilting: false,
      bagTilted: true,
      feedScatteredVisible: true,
    })

    this.feedScatteredHoldTimer = setTimeout(() => {
      this.startHatchSequence()
    }, FEED_SCATTERED_HOLD_MS)
  },

  startHatchSequence() {
    if (this.hatchSequenceStarted) return
    this.hatchSequenceStarted = true

    this.setData({
      feedScatteredVisible: false,
      bagVisible: false,
      bagTilted: false,
      hatchProgress50Visible: true,
      hatchProgress100Visible: false,
      hatchVideoVisible: false,
    })

    this.hatchProgress50Timer = setTimeout(() => {
      this.setData({
        hatchProgress50Visible: false,
        hatchProgress100Visible: true,
      })

      this.hatchProgress100Timer = setTimeout(() => {
        this.showHatchVideo()
      }, HATCH_PROGRESS_STEP_MS)
    }, HATCH_PROGRESS_STEP_MS)
  },

  showHatchVideo() {
    const playWithSrc = (src: string) => {
      console.log('show hatch video:', src)
      this.setData({
        hatchProgress100Visible: false,
        eggCracked: false,
        hatchVideoSrc: src,
        hatchVideoVisible: true,
      })
    }

    if (this.pendingHatchVideoSrc) {
      playWithSrc(this.pendingHatchVideoSrc)
      return
    }

    prepareHatchVideo(
      (src) => playWithSrc(src),
      () => console.error('showHatchVideo: no video source available'),
    )
  },

  onHatchVideoLoaded() {
    console.log('hatch video metadata loaded')
    const videoCtx = tt.createVideoContext('hatchVideo', this)
    videoCtx.play()
  },

  onHatchVideoError(e: { detail?: { errMsg?: string; errCode?: number } }) {
    console.error('hatch video error:', e.detail)
    tt.removeStorageSync(HATCH_VIDEO_CACHE_KEY)
    this.pendingHatchVideoSrc = ''
    this.hatchVideoPreparing = false
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
    this.setData({ feedWeightVisible: true })
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

  clearHatchTimers() {
    if (this.feedScatteredHoldTimer) {
      clearTimeout(this.feedScatteredHoldTimer)
      this.feedScatteredHoldTimer = null
    }
    if (this.hatchProgress50Timer) {
      clearTimeout(this.hatchProgress50Timer)
      this.hatchProgress50Timer = null
    }
    if (this.hatchProgress100Timer) {
      clearTimeout(this.hatchProgress100Timer)
      this.hatchProgress100Timer = null
    }
  },

  clearEggTimers() {
    if (this.eggShakeTimer) {
      clearTimeout(this.eggShakeTimer)
      this.eggShakeTimer = null
    }
    if (this.eggFingerTimer) {
      clearTimeout(this.eggFingerTimer)
      this.eggFingerTimer = null
    }
    if (this.bagFingerTimer) {
      clearTimeout(this.bagFingerTimer)
      this.bagFingerTimer = null
    }
  },

  onUnload() {
    if (this.autoSceneTimer) {
      clearTimeout(this.autoSceneTimer)
      this.autoSceneTimer = null
    }
    this.clearEggTimers()
    this.clearHatchTimers()
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
