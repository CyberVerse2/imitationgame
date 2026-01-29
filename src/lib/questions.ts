// Curated question prompts for interrogators
// Designed to reveal differences between human and AI responses

export interface Question {
  id: number;
  category: string;
  text: string;
  hint: string;
}

export const questionBank: Question[] = [
  {
    id: 1,
    category: 'personal',
    text: "What's the most embarrassing thing that's ever happened to you?",
    hint: 'Personal experiences often reveal authenticity',
  },
  {
    id: 2,
    category: 'creative',
    text: "Make up a short joke that you've never heard before.",
    hint: 'Creativity and humor can be telling',
  },
  {
    id: 3,
    category: 'philosophical',
    text: 'What does happiness mean to you, personally?',
    hint: 'Abstract concepts reveal thinking patterns',
  },
  {
    id: 4,
    category: 'memory',
    text: "Describe your earliest childhood memory in detail.",
    hint: 'Specific memories can reveal authenticity',
  },
  {
    id: 5,
    category: 'opinion',
    text: "What's something everyone loves but you secretly hate?",
    hint: 'Controversial opinions can be revealing',
  },
  {
    id: 6,
    category: 'sensory',
    text: "Describe the last meal you really enjoyed. What made it special?",
    hint: 'Sensory details show lived experience',
  },
  {
    id: 7,
    category: 'emotional',
    text: "What's something small that annoys you more than it should?",
    hint: 'Petty annoyances are very human',
  },
  {
    id: 8,
    category: 'creative',
    text: "If you could have dinner with anyone, living or dead, who and why?",
    hint: 'Choice and reasoning reveal personality',
  },
  {
    id: 9,
    category: 'hypothetical',
    text: "You're stuck in an elevator for 3 hours. What do you do?",
    hint: 'Reactions to scenarios show personality',
  },
  {
    id: 10,
    category: 'introspective',
    text: "What's a belief you held strongly but later changed your mind about?",
    hint: 'Genuine self-reflection is hard to fake',
  },
];

export function getRandomQuestions(count = 5): Question[] {
  const shuffled = [...questionBank].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const categories = [
  { id: 'all', label: 'All Questions' },
  { id: 'personal', label: 'Personal' },
  { id: 'creative', label: 'Creative' },
  { id: 'philosophical', label: 'Philosophical' },
  { id: 'memory', label: 'Memory' },
  { id: 'opinion', label: 'Opinion' },
  { id: 'sensory', label: 'Sensory' },
  { id: 'emotional', label: 'Emotional' },
  { id: 'hypothetical', label: 'Hypothetical' },
  { id: 'introspective', label: 'Introspective' },
];
