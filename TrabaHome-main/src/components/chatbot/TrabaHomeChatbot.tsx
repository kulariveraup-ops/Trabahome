import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import type { ChatMessage as ChatMessageType, ChatbotContext } from '../../types/chatbot.types.ts';
import { getActiveUserContext, processChatbotQuery } from '../../services/chatbot.service.ts';
import { getGreetingMessage } from '../../data/chatbot/chatbotResponses.ts';
import ChatbotButton from './ChatbotButton.tsx';
import ChatbotWindow from './ChatbotWindow.tsx';

export const TrabaHomeChatbot: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [context, setContext] = useState<ChatbotContext>(() => getActiveUserContext(location.pathname));
  const [messages, setMessages] = useState<ChatMessageType[]>([]);

  // Update user context whenever route changes
  useEffect(() => {
    const updated = getActiveUserContext(location.pathname);
    setContext(updated);
  }, [location.pathname]);

  // Initialize welcome message
  useEffect(() => {
    const initialGreeting = getGreetingMessage(context.role, context.userName);
    setMessages([initialGreeting]);
  }, [context.role, context.userName]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setHasUnread(false);
      }
      return next;
    });
  }, []);

  const handleRestart = useCallback(() => {
    const freshGreeting = getGreetingMessage(context.role, context.userName);
    setMessages([freshGreeting]);
  }, [context.role, context.userName]);

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMsg: ChatMessageType = {
        id: `user-${Date.now()}`,
        sender: 'user',
        text: text.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        // Natural slight delay for bot typing experience
        await new Promise((resolve) => setTimeout(resolve, 450));
        const botResponse = await processChatbotQuery(text, context);
        setMessages((prev) => [...prev, botResponse]);

        if (!isOpen) {
          setHasUnread(true);
        }
      } catch (err) {
        console.error('Chatbot error:', err);
        const errorMsg: ChatMessageType = {
          id: `err-${Date.now()}`,
          sender: 'bot',
          text: 'Sorry, I encountered an issue while processing your question. Please try again or reach out to support.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
          actions: [
            {
              label: 'Contact Support',
              route:
                context.role === 'admin'
                  ? '/admin-help'
                  : context.role === 'worker'
                  ? '/worker-help'
                  : '/homeowner-help',
              variant: 'primary'
            }
          ],
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [context, isTyping, isOpen]
  );

  return (
    <>
      <ChatbotButton
        isOpen={isOpen}
        onClick={toggleOpen}
        hasUnread={hasUnread}
      />
      <ChatbotWindow
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onRestart={handleRestart}
        messages={messages}
        isTyping={isTyping}
        onSendMessage={handleSendMessage}
        context={context}
      />
    </>
  );
};

export default TrabaHomeChatbot;
