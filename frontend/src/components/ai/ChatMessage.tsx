import { Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import type { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="px-4 py-3 bg-[#4F6EF7] text-white rounded-2xl rounded-tr-sm text-sm leading-relaxed">
            {message.content}
          </div>
          <p className="text-[10px] text-[#5A5A72] text-right mt-1 mr-1">
            {format(new Date(message.created_at), 'HH:mm')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1 max-w-[82%]">
      <div className="flex items-center gap-1.5 mb-1 ml-1">
        <Bot size={12} className="text-purple-400" />
        <span className="text-[10px] font-medium text-purple-400">Operix AI</span>
      </div>

      <div className="w-full px-5 py-4 bg-[#16161F] border border-[#2A2A3A] rounded-2xl rounded-tl-sm">
        <ReactMarkdown
          components={{
            p: ({ children }) => (
              <p className="text-sm text-[#9898B0] leading-relaxed mb-3 last:mb-0">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-[#F8F8FF] font-semibold">{children}</strong>
            ),
            ul: ({ children }) => (
              <ul className="flex flex-col gap-1.5 my-2 ml-4">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="flex flex-col gap-1.5 my-2 ml-4 list-decimal">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-sm text-[#9898B0] relative pl-4">
                <span className="absolute left-0 text-purple-400 text-xs">▸</span>
                {children}
              </li>
            ),
            table: ({ children }) => (
              <table className="w-full text-sm border-collapse my-3">{children}</table>
            ),
            thead: ({ children }) => <thead>{children}</thead>,
            tbody: ({ children }) => <tbody>{children}</tbody>,
            tr: ({ children }) => <tr>{children}</tr>,
            th: ({ children }) => (
              <th className="text-left p-2 bg-[#1C1C28] text-[#F8F8FF] text-xs font-medium border border-[#2A2A3A]">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="p-2 text-[#9898B0] text-sm border border-[#2A2A3A]">{children}</td>
            ),
            code: ({ children, className }) => {
              const isBlock = className?.includes('language-');
              if (isBlock) {
                return (
                  <code className="block bg-[#0A0A0F] p-3 rounded-lg font-mono text-xs text-cyan-400 overflow-x-auto my-2">
                    {children}
                  </code>
                );
              }
              return (
                <code className="bg-[#0A0A0F] px-1.5 py-0.5 rounded font-mono text-xs text-cyan-400">
                  {children}
                </code>
              );
            },
            h2: ({ children }) => (
              <h2 className="text-base font-semibold text-[#F8F8FF] mt-3 mb-2">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-semibold text-[#F8F8FF] mt-2 mb-1">{children}</h3>
            ),
            hr: () => <hr className="border-[#2A2A3A] my-3" />,
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>

      <p className="text-[10px] text-[#5A5A72] ml-1 mt-1">
        {format(new Date(message.created_at), 'HH:mm')}
      </p>
    </div>
  );
}
