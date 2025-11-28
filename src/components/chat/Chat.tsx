'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGenAI } from '@/hooks/useGenAI';
import { Loader2, Send, Bot, User, ChevronDown } from 'lucide-react';
import { MessageRenderer } from '@/components/ui/message-renderer';
import Image from 'next/image';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isStreaming?: boolean;
}

interface Route {
  id: string;
  routeName: string;
  description: string;
  endpoint: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('default');
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const streamingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const apiKey = localStorage.getItem('apiKey');

        if (apiKey) {
          const response = await fetch('/api/admin/routes', {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setRoutes(data.routes || []);
          }
        }
      } catch (error) {
        console.error('Failed to load routes:', error);
      } finally {
        setLoadingRoutes(false);
      }
    };
    loadRoutes();
  }, []);

  const scrollToBottom = useCallback(
    (force = false, instant = false) => {
      if (force || !isUserScrolling) {
        messagesEndRef.current?.scrollIntoView({
          behavior: instant ? 'instant' : 'smooth',
        });
        setShowScrollButton(false);
      }
    },
    [isUserScrolling]
  );

  const debouncedScrollToBottom = useCallback(() => {
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }
    streamingTimeoutRef.current = setTimeout(() => {
      if (!isUserScrolling) {
        scrollToBottom();
      }
    }, 50);
  }, [isUserScrolling, scrollToBottom]);

  const { chatStream, isLoading, isStreaming, error } = useGenAI({
    onStreamChunk: chunk => {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];

        if (
          lastMessage &&
          lastMessage.role === 'assistant' &&
          lastMessage.isStreaming
        ) {
          lastMessage.content += chunk;
        }

        return newMessages;
      });
      debouncedScrollToBottom();
    },
    onStreamComplete: fullResponse => {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];

        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.isStreaming = false;
          lastMessage.content = fullResponse;
        }

        return newMessages;
      });
    },
    onError: error => {
      console.error('Streaming chat error:', error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];

        if (
          lastMessage &&
          lastMessage.role === 'assistant' &&
          lastMessage.isStreaming
        ) {
          lastMessage.content =
            'Sorry, there was an error processing your message.';
          lastMessage.isStreaming = false;
        }

        return newMessages;
      });
    },
  });

  const handleScroll = useCallback(() => {
    const scrollArea = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (scrollArea) {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

      setShowScrollButton(!isAtBottom);

      if (!isAtBottom) {
        setIsUserScrolling(true);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false);
        }, 2000);
      } else {
        setIsUserScrolling(false);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      }
    }
  }, []);

  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]'
    );
    if (scrollArea) {
      scrollArea.addEventListener('scroll', handleScroll);
      return () => scrollArea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    if (!isStreaming && !isUserScrolling) {
      const timeout = setTimeout(() => scrollToBottom(), 100);
      return () => clearTimeout(timeout);
    }
  }, [messages.length, isStreaming, isUserScrolling, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        setTimeout(() => scrollToBottom(true, true), 10);
      }
    }
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString() + '-user',
      content: input.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    const assistantMessage: Message = {
      id: Date.now().toString() + '-assistant',
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    const currentInput = input;
    setInput('');

    if (textareaRef.current) {
      textareaRef.current.style.height = '40px';
    }

    setIsUserScrolling(false);
    setShowScrollButton(false);

    setTimeout(() => scrollToBottom(true, true), 50);
    setTimeout(() => scrollToBottom(true), 200);

    try {
      let endpoint = '/api/chat-stream';

      if (selectedRoute !== 'default') {
        const selectedRouteData = routes.find(r => r.id === selectedRoute);
        if (selectedRouteData) {
          endpoint = selectedRouteData.endpoint;
        }
      }

      await chatStream({
        message: currentInput,
        context:
          'You are a helpful AI assistant. Provide concise, accurate, and friendly responses.',
        endpoint,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const autoResizeTextarea = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.min(Math.max(40, scrollHeight), 128);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [input, autoResizeTextarea]);

  const formatMessageContent = (content: string, isStreaming: boolean) => {
    if (isStreaming && content === '') {
      return (
        <div className='flex items-center space-x-1'>
          <div className='w-2 h-2 bg-current rounded-full animate-bounce'></div>
          <div
            className='w-2 h-2 bg-current rounded-full animate-bounce'
            style={{ animationDelay: '0.1s' }}
          ></div>
          <div
            className='w-2 h-2 bg-current rounded-full animate-bounce'
            style={{ animationDelay: '0.2s' }}
          ></div>
        </div>
      );
    }

    return <MessageRenderer content={content} isStreaming={isStreaming} />;
  };

  const getSelectedRouteName = () => {
    if (selectedRoute === 'default') return 'Apollo';
    const route = routes.find(r => r.id === selectedRoute);
    return route ? route.routeName : 'Apollo';
  };

  return (
    <main className='flex h-[calc(100vh-3.5rem)] flex-col p-4'>
      <Card className='py-0 flex flex-col h-full border-border gap-0'>
        <div className='border-b border-border px-4 py-3 flex items-center gap-4'>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='font-medium'>
              AI Chatbot
            </Badge>
            <Separator orientation='vertical' className='mx-2 h-6' />
          </div>
          <div className='flex-1'>
            <Select
              value={selectedRoute}
              onValueChange={setSelectedRoute}
              disabled={loadingRoutes}
            >
              <SelectTrigger className='w-[280px]'>
                <SelectValue placeholder='Select a chatbot' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='default'>
                  <div className='flex flex-col items-start'>
                    <span className='font-medium'>Apollo</span>
                    <span className='text-xs text-muted-foreground'>
                      Gemini 2.5 Flash Lite
                    </span>
                  </div>
                </SelectItem>
                {routes.map(route => (
                  <SelectItem key={route.id} value={route.id}>
                    <div className='flex flex-col items-start'>
                      <span className='font-medium'>{route.routeName}</span>
                      <span className='text-xs text-muted-foreground'>
                        {route.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <CardContent className='flex-1 flex flex-col p-0 min-h-0 relative'>
          <ScrollArea
            className='flex-1 p-4 overflow-y-auto'
            ref={scrollAreaRef}
          >
            <div className='space-y-6'>
              {messages.length === 0 && (
                <div className='text-center text-muted-foreground py-12'>
                  <Bot className='h-12 w-12 mx-auto mb-4 text-muted-foreground/50' />
                  <h3 className='text-lg font-medium mb-2'>
                    Start a conversation
                  </h3>
                  <p className='text-sm'>Chat with {getSelectedRouteName()}</p>
                </div>
              )}

              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user'
                      ? 'flex-row-reverse space-x-reverse'
                      : ''
                  }`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <User className='h-4 w-4' />
                    ) : (
                      <Image
                        src='/logo.svg'
                        alt='Apollo'
                        width={16}
                        height={16}
                        className='h-4 w-4'
                      />
                    )}
                  </div>

                  <div
                    className={`flex-1 max-w-[80%] ${
                      message.role === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    <div
                      className={`inline-block rounded-lg px-4 py-3 text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <div className='whitespace-pre-wrap break-words leading-relaxed'>
                          {message.content}
                        </div>
                      ) : (
                        formatMessageContent(
                          message.content,
                          message.isStreaming || false
                        )
                      )}
                    </div>

                    <div
                      className={`text-xs text-muted-foreground mt-1 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {message.isStreaming && (
                        <span className='ml-2 text-primary'>Streaming...</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {showScrollButton && (
            <Button
              size='sm'
              variant='secondary'
              className='absolute bottom-20 right-6 z-10 rounded-full'
              onClick={() => scrollToBottom(true)}
            >
              <ChevronDown className='h-4 w-4 mr-1' />
              Scroll to bottom
            </Button>
          )}

          {error && (
            <div className='mx-4 mb-4'>
              <div className='text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3'>
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          <div className='border-t p-4 flex-shrink-0'>
            <div className='flex items-end space-x-3'>
              <div className='flex-1 relative'>
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    autoResizeTextarea();
                  }}
                  onKeyDown={handleKeyPress}
                  placeholder='Type your message... (Press Enter to send, Shift+Enter for new line)'
                  disabled={isLoading}
                  className='min-h-[40px] max-h-32 resize-none pr-12 overflow-hidden border-input focus:ring-2 focus:ring-ring focus:border-ring'
                  rows={1}
                />
                {isStreaming && (
                  <div className='absolute right-3 top-3'>
                    <div className='flex space-x-1'>
                      <div className='w-1 h-1 bg-primary rounded-full animate-bounce'></div>
                      <div
                        className='w-1 h-1 bg-primary rounded-full animate-bounce'
                        style={{ animationDelay: '0.1s' }}
                      ></div>
                      <div
                        className='w-1 h-1 bg-primary rounded-full animate-bounce'
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size='icon'
                className='shrink-0'
              >
                {isLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Send className='h-4 w-4' />
                )}
              </Button>
            </div>

            <div className='text-xs text-muted-foreground mt-2 text-center flex items-center justify-center space-x-2'>
              {isStreaming ? (
                'AI is typing...'
              ) : (
                <>
                  <span>
                    Chatting with {getSelectedRouteName()} • Shift+Enter for new
                    line, Enter to send
                  </span>
                  {input.includes('\n') && (
                    <span className='bg-muted px-2 py-1 rounded text-xs'>
                      {input.split('\n').length} lines
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
