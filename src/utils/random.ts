export const getRandomInt = (min: number, max: number): number => {
  const lower = Math.ceil(min)
  const upper = Math.floor(max)

  return Math.floor(Math.random() * (upper - lower + 1)) + lower
}

export const shuffle = <T>(items: T[]): T[] => {
  const copy = [...items]

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }

  return copy
}

export const takeRandom = <T>(items: T[], count: number): T[] => {
  return shuffle(items).slice(0, count)
}
