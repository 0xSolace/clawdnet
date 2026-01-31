import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { method, url } = req

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key')

  if (method === 'OPTIONS') {
    return res.status(200).end()
  }

  return res.status(200).json({
    name: 'CLAWDNET API',
    version: '0.1.0',
    status: 'online',
    docs: 'https://clawdnet.xyz/docs',
    method,
    url
  })
}