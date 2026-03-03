import OpenAI from 'openai'

const FALLBACK_RESULT = {
    sentiment: 'neutral' as const,
    tags: [] as string[],
    suggestedReply: 'Thank you for taking the time to leave a review!',
}

// Only create OpenAI client if key looks real (not a placeholder)
const apiKey = process.env.OPENAI_API_KEY
const openai = apiKey && !apiKey.startsWith('your-')
    ? new OpenAI({ apiKey })
    : null

export async function analyzeReview(text: string) {
    if (!text || text.trim().length === 0) {
        return FALLBACK_RESULT
    }

    if (!openai) {
        // OpenAI not configured — skip AI analysis silently
        return FALLBACK_RESULT
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are a professional reputation manager. Analyze the following customer review and respond in JSON.
        
        Schema:
        {
          "sentiment": "positive" | "neutral" | "negative",
          "tags": string[], // Choose up to 5 from: [price, staff, cleanliness, service, food, atmosphere, waiting_time, value, variety]
          "suggestedReply": string // Professional, 2-3 sentences, empathetic, addressed to the customer.
        }`,
                },
                {
                    role: 'user',
                    content: text,
                },
            ],
            response_format: { type: 'json_object' },
        })

        const content = response.choices[0].message.content
        if (!content) return FALLBACK_RESULT

        return JSON.parse(content) as {
            sentiment: 'positive' | 'neutral' | 'negative'
            tags: string[]
            suggestedReply: string
        }
    } catch (err) {
        console.warn('AI analysis skipped:', err instanceof Error ? err.message : err)
        return FALLBACK_RESULT
    }
}
