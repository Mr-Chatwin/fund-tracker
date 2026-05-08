export interface FundValuation {
  fundcode: string
  name: string
  jzrq: string
  dwjz: string
  gsz: string
  gszzl: string
  gztime: string
}

// The API always calls "jsonpgz" function, so we use a queue-based approach
const pendingRequests = new Map<string, { resolve: (data: FundValuation) => void, reject: (err: any) => void }>()

function useJsonp(fundCode: string): Promise<FundValuation> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const timeout = setTimeout(() => {
      cleanup()
      pendingRequests.delete(fundCode)
      reject(new Error(`Request timeout for fund ${fundCode}`))
    }, 10000)

    pendingRequests.set(fundCode, {
      resolve: (data) => { clearTimeout(timeout); cleanup(); resolve(data) },
      reject: (err) => { clearTimeout(timeout); cleanup(); reject(err) }
    })

    function cleanup() {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }

    script.onerror = () => {
      cleanup()
      pendingRequests.delete(fundCode)
      reject(new Error(`JSONP request failed for fund ${fundCode}`))
    }

    script.src = `//fundgz.1234567.com.cn/js/${fundCode}.js?rt=${Date.now()}`
    document.head.appendChild(script)
  })
}

// Global callback function that the API calls
declare global {
  interface Window {
    jsonpgz: (data: FundValuation) => void
  }
}

// Initialize the global callback
if (typeof window !== 'undefined' && !window.jsonpgz) {
  window.jsonpgz = (data: FundValuation) => {
    const req = pendingRequests.get(data.fundcode)
    if (req) {
      pendingRequests.delete(data.fundcode)
      req.resolve(data)
    }
  }
}

export function fetchFundValuation(fundCode: string): Promise<FundValuation> {
  return useJsonp(fundCode)
}

export async function fetchAllValuations(fundCodes: string[]): Promise<Map<string, FundValuation>> {
  const results = new Map<string, FundValuation>()
  // Fetch sequentially to avoid overwhelming the API
  for (const code of fundCodes) {
    try {
      const data = await fetchFundValuation(code)
      results.set(code, data)
    } catch (e) {
      console.error(`Failed to fetch fund ${code}:`, e)
    }
  }
  return results
}
