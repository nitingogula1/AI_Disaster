import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, MapPin } from 'lucide-react';
import { api } from '../../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  map_data?: any;
}

export default function ChatPanel({ isOpen, onClose, onMapHighlight }: { isOpen: boolean; onClose: () => void; onMapHighlight?: (geojson: any) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    content: 'Hello! I am SentinelAid Chatbot. I can help you search for historical disaster events, cyclone tracks, historical flood extents, and estimate population exposure. How can I assist you today?'
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId] = useState(() => Math.random().toString(36).substring(2, 15));
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2, 15),
      role: 'user',
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    
    try {
      const apiMessages = [...messages.filter(m => m.role !== 'system'), userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));
      
      const response = await api.post('/chat', {
        messages: apiMessages,
        conversation_id: conversationId
      });
      
      const data = response.data.data;
      
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 15),
        role: 'assistant',
        content: data.message,
        map_data: data.map_data
      }]);
      
      if (data.action === 'map_highlight' && data.map_data && onMapHighlight) {
        onMapHighlight(data.map_data);
      }
      
    } catch (error: any) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(36).substring(2, 15),
        role: 'assistant',
        content: `Error: ${error.response?.data?.detail || error.message || 'Failed to communicate with AI.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 w-96 h-[500px] bg-surface border border-border rounded-lg shadow-xl flex flex-col z-[100] overflow-hidden">
      <div className="bg-nav-primary px-4 py-3 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-primary" />
          <h3 className="text-white font-semibold text-sm">Disaster Intelligence Chat</h3>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-surface border border-border text-text-primary'}`}>
              <div className="flex items-center gap-1.5 mb-1 opacity-70 text-xs font-semibold">
                {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                {msg.role === 'user' ? 'You' : 'SentinelAid AI'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              
              {msg.map_data && (
                <button 
                  onClick={() => onMapHighlight && onMapHighlight(msg.map_data)}
                  className="mt-2 text-xs flex items-center gap-1 text-primary-light hover:text-primary transition-colors bg-primary/10 px-2 py-1 rounded"
                >
                  <MapPin size={12} />
                  View on Map
                </button>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-muted flex items-center gap-2">
              <Bot size={14} className="animate-pulse" />
              <div className="flex space-x-1">
                <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 bg-surface border-t border-border">
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about disasters or populations..."
            className="flex-1 bg-background border border-border text-text-primary text-sm rounded px-3 py-2 outline-none focus:border-primary transition-colors"
            disabled={isLoading}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white p-2 rounded transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
