// ─── AI Proxy Service ─────────────────────────────────────
// Communicates with the optional FastAPI AI proxy.
// Falls back gracefully if the proxy isn't deployed.

const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || ''

interface ChatRequest {
  messages: { role: 'user' | 'assistant' | 'system'; content: string }[]
  model?: string
  system_prompt?: string
}

export async function streamChat(
  req: ChatRequest,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!AI_PROXY_URL) {
    // Fallback: return a helpful message explaining AI proxy not configured
    const fallback =
      '**AI Proxy not configured.**\n\nTo enable AI responses, deploy the AI proxy and set `VITE_AI_PROXY_URL` in your `.env` file.\n\n```\nVITE_AI_PROXY_URL=http://localhost:8081\n```\n\nThe AI proxy is a small FastAPI service that securely forwards requests to OpenAI / Anthropic / Ollama.'
    for (const char of fallback) {
      onChunk(char)
      await new Promise((r) => setTimeout(r, 5))
    }
    return fallback
  }

  const res = await fetch(`${AI_PROXY_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  })

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`AI Proxy error ${res.status}: ${err}`)
  }

  const reader = res.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') break
        try {
          const parsed = JSON.parse(data)
          const text = parsed.choices?.[0]?.delta?.content || parsed.text || ''
          if (text) {
            fullText += text
            onChunk(text)
          }
        } catch {
          // raw text fallback
          if (data) {
            fullText += data
            onChunk(data)
          }
        }
      }
    }
  }

  return fullText
}

export async function analyzeFile(
  filePath: string,
  prompt?: string,
): Promise<{ summary: string; extracted_text: string }> {
  if (!AI_PROXY_URL) {
    return {
      summary: 'AI Proxy not configured. Set VITE_AI_PROXY_URL to enable file analysis.',
      extracted_text: '',
    }
  }

  const res = await fetch(`${AI_PROXY_URL}/api/analyze-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_path: filePath, prompt }),
  })

  if (!res.ok) throw new Error(`Analysis failed: ${res.statusText}`)
  return res.json()
}