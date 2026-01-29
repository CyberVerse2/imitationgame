'use client';

import { questionBank } from '@/lib/questions';

interface QuestionSuggestionsProps {
  onSelect: (text: string) => void;
  disabled?: boolean;
}

export default function QuestionSuggestions({ onSelect, disabled }: QuestionSuggestionsProps) {
  // Get first 6 questions as suggestions
  const suggestions = questionBank.slice(0, 6);
  
  return (
    <div className="question-suggestions">
      <div className="text-label mb-3">Suggested Queries</div>
      <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-2">
        {suggestions.map((q) => (
          <button
            key={q.id}
            className="flex-shrink-0 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-900 text-xs font-medium text-zinc-400 hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)] transition-all"
            onClick={() => onSelect(q.text)}
            disabled={disabled}
            title={q.hint}
          >
            {q.text.length > 30 ? q.text.substring(0, 27) + '...' : q.text}
          </button>
        ))}
      </div>
    </div>
  );
}
