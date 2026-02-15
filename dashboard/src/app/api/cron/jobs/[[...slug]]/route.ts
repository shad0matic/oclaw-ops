
import {NextRequest, NextResponse} from 'next/server'

const GATEWAY_URL = 'http://127.0.0.1:18789/api/cron/jobs'
const GATEWAY_TOKEN = process.env.OPENCLAW_GW_TOKEN

if (!GATEWAY_TOKEN) {
	console.error('OPENCLAW_GW_TOKEN is not set')
}

async function proxyRequest(req: NextRequest, path: string) {
	const headers = new Headers(req.headers)
	headers.set('Authorization', `Bearer ${GATEWAY_TOKEN}`)
	headers.delete('host')
	headers.delete('referer')

	const url = `${GATEWAY_URL}${path}`
	console.log(`[Cron API Proxy] Forwarding ${req.method} to ${url}`)

	try {
		const response = await fetch(url, {
			method: req.method,
			headers,
			body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
			// @ts-ignore
			duplex: 'half',
		})

		const responseHeaders = new Headers(response.headers)
		// Ensure we don't leak internal headers
		responseHeaders.delete('server')

		return new NextResponse(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: responseHeaders,
		})
	} catch (error) {
		console.error(`[Cron API Proxy] Error forwarding request to ${url}:`, error)
		return new NextResponse('Internal Server Error', {status: 500})
	}
}

export async function GET(
	req: NextRequest,
	{params}: {params: Promise<{slug?: string[]}>},
) {
	const { slug } = await params;
	const path = slug ? `/${slug.join('/')}` : ''
	return proxyRequest(req, path)
}

export async function POST(
	req: NextRequest,
	{params}: {params: Promise<{slug?: string[]}>},
) {
	const { slug } = await params;
	const path = slug ? `/${slug.join('/')}` : ''
	return proxyRequest(req, path)
}

export async function PATCH(
	req: NextRequest,
	{params}: {params: Promise<{slug?: string[]}>},
) {
	const { slug } = await params;
	const path = slug ? `/${slug.join('/')}` : ''
	return proxyRequest(req, path)
}

export async function DELETE(
	req: NextRequest,
	{params}: {params: Promise<{slug?: string[]}>},
) {
	const { slug } = await params;
	const path = slug ? `/${slug.join('/')}` : ''
	return proxyRequest(req, path)
}
