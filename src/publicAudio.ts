async function waitForCanPlay(audio: HTMLAudioElement): Promise<void> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return

  await new Promise<void>((resolve) => {
    const done = () => {
      audio.removeEventListener('canplay', done)
      audio.removeEventListener('error', done)
      resolve()
    }
    audio.addEventListener('canplay', done)
    audio.addEventListener('error', done)
  })
}

async function playAudio(url: string): Promise<void> {
  const audio = new Audio()
  audio.preload = 'auto'
  audio.src = url
  audio.volume = 1

  audio.load()

  await waitForCanPlay(audio)
  if (audio.error != null) {
    console.warn(`Failed to load: ${url}`)
    return
  }

  await new Promise<void>((resolve) => {
    audio.onended = () => resolve()
    audio.onerror = () => {
      console.warn(`Failed to play: ${url}`)
      resolve()
    }
    void audio.play().catch(() => {
      console.warn(`Failed to play: ${url}`)
      resolve()
    })
  })
}

export async function playSequential(urls: string[]): Promise<void> {
  for (const url of urls) {
    await playAudio(url)
  }
}

const exerciseImageModules = import.meta.glob<string>(
  '../public/png/*',
  {
    eager: true,
    import: 'default',
  },
)

const ORDERED_EXERCISE_IMAGES = Object.entries(exerciseImageModules)
  .sort(([leftPath], [rightPath]) =>
    leftPath.localeCompare(rightPath, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  )
  .map(([, url]) => url)

export const EXERCISE_NUMBERS = ORDERED_EXERCISE_IMAGES.map(
  (_, index) => index + 1,
)
export const EXERCISE_COUNT = EXERCISE_NUMBERS.length

export function exerciseImage(n: number): string {
  return ORDERED_EXERCISE_IMAGES[n - 1] ?? ''
}

export function exerciseStartSound(n: number): string {
  return `/mp3/${n}.mp3`
}

export const CHIME_SOUND = '/chime.mp3'
export const REPEAT_SOUND = '/repeat.mp3'
export const REST_SOUND = '/rest.mp3'
