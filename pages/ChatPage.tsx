import React from 'react';
import AIChat from '../components/AIChat';
import type { Message } from '../types';

interface ChatPageProps {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

const ChatPage: React.FC<ChatPageProps> = ({ messages, setMessages }) => {
  return <AIChat messages={messages} setMessages={setMessages} />;
};

export default ChatPage;