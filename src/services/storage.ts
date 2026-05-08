const STORAGE_KEY = 'MY_FUNDS'
const DEFAULT_FUNDS = ['161725', '005827']

export function getFundCodes(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch {
    // ignore parse errors
  }
  return [...DEFAULT_FUNDS]
}

export function saveFundCodes(codes: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes))
}

export function addFundCode(code: string): string[] {
  const codes = getFundCodes()
  if (!codes.includes(code)) {
    codes.push(code)
    saveFundCodes(codes)
  }
  return codes
}

export function removeFundCode(code: string): string[] {
  const codes = getFundCodes().filter(c => c !== code)
  saveFundCodes(codes)
  return codes
}
