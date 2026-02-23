import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const { searchParams } = new URL(request.url)
    const tag = searchParams.get('tag')
    const secret = searchParams.get('secret')

    // Secure secret protection
    const systemSecret = process.env.REVALIDATION_SECRET
    if (!systemSecret || systemSecret.length < 16 || secret !== systemSecret) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    if (tag) {
        revalidateTag(tag)
        return NextResponse.json({ revalidated: true, now: Date.now() })
    }

    return NextResponse.json({ message: 'Missing tag' }, { status: 400 })
}
