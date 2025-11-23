import { useState, useCallback } from 'react';
import { ChatRequest, GenerateRequest, GenAIResponse, StreamChunk } from '@/lib/types';

interface UseGenAIOptions {
  onSuccess?: (response: string) => void;
  onError?: (error: string) => void;
  onStreamChunk?: (chunk: string) => void;
  onStreamComplete?: (fullResponse: string) => void;
}

export function useGenAI(options?: UseGenAIOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const chat = useCallback(async (request: ChatRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: GenAIResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get response');
      }

      setResponse(data.message || '');
      options?.onSuccess?.(data.message || '');

      return data.message || '';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      options?.onError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const generate = useCallback(async (request: GenerateRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: GenAIResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate response');
      }

      setResponse(data.message || '');
      options?.onSuccess?.(data.message || '');

      return data.message || '';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      options?.onError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const chatStream = useCallback(async (request: ChatRequest) => {
    setIsStreaming(true);
    setIsLoading(true);
    setError(null);
    setResponse('');

    try {
      const response = await fetch('/api/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: StreamChunk = JSON.parse(line.slice(6));

              if (data.error) {
                throw new Error(data.error);
              }

              if (data.content) {
                fullResponse += data.content;
                setResponse(fullResponse);
                options?.onStreamChunk?.(data.content);
              }

              if (data.done) {
                options?.onStreamComplete?.(fullResponse);
                options?.onSuccess?.(fullResponse);
                return fullResponse;
              }
            } catch {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      }

      return fullResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      options?.onError?.(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [options]);

  const clearResponse = useCallback(() => {
    setResponse(null);
  }, []);

  return {
    chat,
    chatStream,
    generate,
    isLoading,
    isStreaming,
    error,
    response,
    clearError,
    clearResponse,
  };
}

export default useGenAI;
