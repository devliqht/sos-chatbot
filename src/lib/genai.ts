import { GoogleGenAI } from '@google/genai';

interface GenAIConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

class GenAIService {
  private genai: GoogleGenAI;
  private models: GoogleGenAI['models'];

  constructor() {
    const config = this.getConfig();

    // Initialize with Vertex AI using service account credentials
    this.genai = new GoogleGenAI({
      vertexai: true,
      project: config.projectId,
      location: 'us-central1', 
      googleAuthOptions: {
        credentials: {
          private_key: config.privateKey,
          client_email: config.clientEmail,
          type: 'service_account',
        },
      },
    });

    // Initialize Gemini 2.5 Flash Lite model
    this.models = this.genai.models;
  }

  private getConfig(): GenAIConfig {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

    if (!projectId || !privateKey || !clientEmail) {
      throw new Error('Missing required Google AI credentials in environment variables');
    }

    return {
      projectId,
      privateKey,
      clientEmail,
    };
  }

  async generateResponse(prompt: string): Promise<string> {
    try {
      const result = await this.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const response = result.candidates?.[0]?.content?.parts?.[0]?.text;
      return response || 'No response generated';
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateStreamResponse(prompt: string) {
    try {
      const result = await this.models.generateContentStream({
        model: 'gemini-2.5-flash-lite',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      return result;
    } catch (error) {
      console.error('Error generating streaming AI response:', error);
      throw new Error('Failed to generate streaming AI response');
    }
  }

  async chatStream(messages: Array<{ role: 'user' | 'model'; content: string }>) {
    try {
      const contents = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const result = await this.models.generateContentStream({
        model: 'gemini-2.5-flash-lite',
        contents,
      });

      return result;
    } catch (error) {
      console.error('Error in streaming chat:', error);
      throw new Error('Failed to process streaming chat message');
    }
  }

  async chat(messages: Array<{ role: 'user' | 'model'; content: string }>) {
    try {
      const contents = messages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }],
      }));

      const result = await this.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents,
      });

      const response = result.candidates?.[0]?.content?.parts?.[0]?.text;
      return response || 'No response generated';
    } catch (error) {
      console.error('Error in chat:', error);
      throw new Error('Failed to process chat message');
    }
  }
}

export const genaiService = new GenAIService();
export default genaiService;
