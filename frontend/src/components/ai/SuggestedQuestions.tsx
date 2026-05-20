import { AlertTriangle, Clock, TrendingUp, Users, FileText, BarChart2, type LucideIcon } from 'lucide-react';

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

interface Suggestion {
  question: string;
  icon: LucideIcon;
  iconColor: string;
}

const SUGGESTIONS: Suggestion[] = [
  { question: 'Which projects are at risk this week?', icon: AlertTriangle, iconColor: '#F59E0B' },
  { question: 'Who has the most overdue tasks?', icon: Clock, iconColor: '#EF4444' },
  { question: 'Show me team efficiency this month', icon: TrendingUp, iconColor: '#22C55E' },
  { question: 'Which employee needs support right now?', icon: Users, iconColor: '#A855F7' },
  { question: 'Generate a project summary', icon: FileText, iconColor: '#4F6EF7' },
  { question: 'What should I focus on today?', icon: BarChart2, iconColor: '#06B6D4' },
];

export default function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
      {SUGGESTIONS.map((suggestion) => {
        const Icon = suggestion.icon;
        return (
          <button
            key={suggestion.question}
            onClick={() => onSelect(suggestion.question)}
            className="flex items-start gap-2.5 p-3.5 cursor-pointer rounded-xl border border-[#2A2A3A] bg-[#16161F] hover:border-purple-500/50 hover:bg-[#1C1C28] transition-all duration-200 text-left group"
          >
            <Icon size={15} style={{ color: suggestion.iconColor }} className="flex-shrink-0 mt-0.5" />
            <span className="text-xs text-[#9898B0] group-hover:text-[#F8F8FF] transition-colors">
              {suggestion.question}
            </span>
          </button>
        );
      })}
    </div>
  );
}
