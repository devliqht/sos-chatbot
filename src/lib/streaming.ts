export interface StreamHandler {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

export class StreamProcessor {
  private decoder = new TextDecoder();
  private buffer = '';

  async processStream(
    response: Response,
    handler: StreamHandler
  ): Promise<string> {
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        this.buffer += this.decoder.decode(value, { stream: true });
        const lines = this.buffer.split('\n');

        // Keep the last potentially incomplete line in buffer
        this.buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.content) {
                fullText += data.content;
                handler.onChunk?.(data.content);
              }

              if (data.done) {
                handler.onComplete?.(fullText);
                return fullText;
              }
            } catch {
              // Skip malformed JSON
              continue;
            }
          }
        }
      }

      handler.onComplete?.(fullText);
      return fullText;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown streaming error');
      handler.onError?.(err);
      throw err;
    } finally {
      reader.releaseLock();
    }
  }

  reset() {
    this.buffer = '';
  }
}

export function createStreamResponse(
  generator: AsyncGenerator<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }, void, unknown>
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;

          if (text) {
            const data = `data: ${JSON.stringify({
              content: text,
              done: false
            })}\n\n`;

            controller.enqueue(encoder.encode(data));
          }
        }

        // Send completion signal
        const doneData = `data: ${JSON.stringify({
          content: '',
          done: true
        })}\n\n`;

        controller.enqueue(encoder.encode(doneData));
        controller.close();
      } catch (error) {
        const errorData = `data: ${JSON.stringify({
          error: error instanceof Error ? error.message : 'Streaming failed',
          done: true
        })}\n\n`;

        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export async function* simulateTypingEffect(
  text: string,
  delay: number = 50
): AsyncGenerator<string, void, unknown> {
  for (let i = 0; i < text.length; i++) {
    yield text[i];
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

export function debounceStream<T>(
  callback: (value: T) => void,
  delay: number = 100
): (value: T) => void {
  let timeoutId: NodeJS.Timeout;
  let latestValue: T;

  return (value: T) => {
    latestValue = value;

    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(latestValue);
    }, delay);
  };
}
