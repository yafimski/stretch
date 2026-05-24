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

export function exerciseImage(n: number): string {
  return `/${n}.png`
}

export function exerciseStartSound(n: number): string {
  return `/${n}.mp3`
}

export const CHIME_SOUND = '/chime.mp3'
export const REPEAT_SOUND = '/repeat.mp3'
