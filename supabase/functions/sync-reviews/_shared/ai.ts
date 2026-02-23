// Shared AI analysis helper for Edge Functions
const openaiKey = Deno.env.get('OPENAI_API_KEY')!

export interface AIAnalysisResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  tags: string[]
  suggestedReply: string
}

export async function analyzeReviewWithAI(reviewText: string): Promise<AIAnalysisResult> {
  if (!reviewText?.trim()) {
    return { sentiment: 'neutral', tags: [], suggestedReply: '' }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You analyze customer reviews. Return JSON with:
- sentiment: "positive" | "neutral" | "negative"
- tags: string[] (max 5 short topic tags)
- suggestedReply: string (professional, empathetic reply under 100 words)`,
        },
        {
          role: 'user',
          content: `Analyze this review: "${reviewText}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  })

  if (!response.ok) {
    const err = await response.json()
    throw new Error(`OpenAI error: ${err.error?.message}`)
  }

  const data = await response.json()
  const result = JSON.parse(data.choices[0].message.content)

  return {
    sentiment: result.sentiment ?? 'neutral',
    tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
    suggestedReply: result.suggestedReply ?? '',
  }
}
