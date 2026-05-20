import { Bot } from 'lucide-react';

export default function TypingIndicator() {
  return (
    <div className="flex flex-col items-start gap-1 max-w-[82%]">
      <div className="flex items-center gap-1.5 mb-1 ml-1">
        <Bot size={12} className="text-purple-400" />
        <span className="text-[10px] font-medium text-purple-400">Operix AI</span>
      </div>

      <div className="px-5 py-4 bg-[#16161F] border border-[#2A2A3A] rounded-2xl rounded-tl-sm">
        <div className="flex items-center gap-1.5 py-1">
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce-delay-150" />
          <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce-delay-300" />
        </div>
      </div>
    </div>
  );
}
