
import React, { useState, useRef, useEffect } from 'react';
import type { Message } from '../types';
import { getAIChatResponse } from '../services/geminiService';
import { BrainIcon } from '../constants';

interface AIChatProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const AIChat: React.FC<AIChatProps> = ({ messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now(), text: input, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }],
      }));
      const aiResponseText = await getAIChatResponse(history, input);
      const aiMessage: Message = { id: Date.now() + 1, text: aiResponseText, sender: 'ai' };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI chat failed:", error);
      const errorMessage: Message = { id: Date.now() + 1, text: "Sorry, I'm having trouble connecting. Please try again later.", sender: 'ai' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg flex flex-col h-[85vh] animate-fade-in">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
        <BrainIcon className="w-6 h-6 text-violet-500 dark:text-violet-400" />
        <h2 className="text-xl font-bold">AI Study Buddy</h2>
      </div>
      <div className="flex-grow p-4 overflow-y-auto space-y-4">
        {messages.map(message => (
          <div key={message.id} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
            {message.sender === 'ai' && (
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                <BrainIcon className="w-5 h-5 text-white" />
              </div>
            )}
            <div className={`max-w-md p-3 rounded-xl text-white ${message.sender === 'user' ? 'bg-blue-500 rounded-br-none' : 'bg-gray-600 dark:bg-gray-700 rounded-bl-none'}`}>
              <p>{message.text}</p>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                    <BrainIcon className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="max-w-md p-3 rounded-xl bg-gray-700 dark:bg-gray-800 rounded-bl-none">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-150"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce delay-300"></div>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask for a summary, an explanation, or a study plan..."
            className="flex-grow p-3 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading} className="px-6 py-3 bg-violet-600 text-white rounded-lg font-semibold hover:bg-violet-700 transition-colors disabled:bg-violet-800 disabled:cursor-not-allowed">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;