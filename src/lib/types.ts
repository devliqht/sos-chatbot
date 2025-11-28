export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GenAIResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface StreamResponse {
  content: string;
  done: boolean;
  error?: string;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  error?: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: string;
  endpoint?: string;
}

export interface GenerateRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}
