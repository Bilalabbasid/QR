import OpenAI from 'openai'

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function analyzeReview(text: string) {
    if (!text || text.trim().length === 0) {
        return {
            sentiment: 'neutral',
            tags: [],
            suggestedReply: 'Thank you for your rating!',
        }
    }

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
    if (!content) throw new Error('Failed to get response from OpenAI')

    return JSON.parse(content) as {
        sentiment: 'positive' | 'neutral' | 'negative'
        tags: string[]
        suggestedReply: string
    }
}
