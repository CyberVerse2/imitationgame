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
      <p className="suggestions-label">💡 Need inspiration? Try asking:</p>
      <div className="question-chips">
        {suggestions.map((q) => (
          <button
            key={q.id}
            className="question-chip"
            onClick={() => onSelect(q.text)}
            disabled={disabled}
            title={q.hint}
          >
            {q.text.length > 40 ? q.text.substring(0, 37) + '...' : q.text}
          </button>
        ))}
      </div>
      
      <style jsx>{`
        .question-suggestions {
          padding: 16px;
          background: rgba(139, 92, 246, 0.05);
          border-radius: 12px;
          border: 1px dashed rgba(139, 92, 246, 0.3);
          margin-bottom: 16px;
        }
        
        .suggestions-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }
        
        .question-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .question-chip {
          background: rgba(0, 245, 255, 0.1);
          border: 1px solid rgba(0, 245, 255, 0.3);
          color: var(--neon-cyan);
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .question-chip:hover:not(:disabled) {
          background: rgba(0, 245, 255, 0.2);
          transform: translateY(-1px);
        }
        
        .question-chip:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
