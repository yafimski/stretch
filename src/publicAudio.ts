async function playAudio(url: string): Promise<void> {
  try {
    const audio = new Audio(url)
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve()
      audio.onerror = () => {
        console.warn(`Failed to play: ${url}`)
        resolve()
      }
      audio.play().catch(() => {
        console.warn(`Failed to play: ${url}`)
        resolve()
      })
    })
  } catch {
    console.warn(`Failed to play: ${url}`)
  }
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
