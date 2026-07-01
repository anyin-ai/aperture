import { type NextRequest, NextResponse } from 'next/server'

// Proxy every /api/* request to the FastAPI backend, preserving the exact path
// (including trailing slashes, which the backend's routes depend on) and query
// string. BACKEND_URL is read at runtime so the same image works across envs.
export const dynamic = 'force-dynamic'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

async function proxy(req: NextRequest) {
  const target = `${BACKEND_URL}${req.nextUrl.pathname}${req.nextUrl.search}`

  const headers = new Headers(req.headers)
  headers.delete('host')
  headers.delete('content-length') // recomputed from the forwarded body
  headers.delete('accept-encoding') // take an uncompressed upstream response

  const init: RequestInit = { method: req.method, headers, redirect: 'manual' }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer()
  }

  let resp: Response
  try {
    resp = await fetch(target, init)
  } catch {
    return NextResponse.json({ detail: 'Backend unreachable' }, { status: 502 })
  }

  const respHeaders = new Headers(resp.headers)
  respHeaders.delete('content-encoding')
  respHeaders.delete('content-length')
  respHeaders.delete('transfer-encoding')
  // 204/205/304 are "null body" statuses — passing any body (even an empty
  // ArrayBuffer) makes the Response constructor throw, which 500s the proxy.
  // This is what broke every DELETE (the backend returns 204). Forward null.
  const nullBody = resp.status === 204 || resp.status === 205 || resp.status === 304
  const body = nullBody ? null : await resp.arrayBuffer()
  return new NextResponse(body, { status: resp.status, headers: respHeaders })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
export const OPTIONS = proxy
export const HEAD = proxy
