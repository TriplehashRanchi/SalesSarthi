// app/assessment/data.js

export const PROFILES = [
  { id: 'homemaker', label: 'Homemaker', desc: 'Building a career while managing home', icon: 'Home' },
  { id: 'retired', label: 'Retired Professional', desc: 'Starting a new chapter with purpose', icon: 'Armchair' },
  { id: 'professional', label: 'Professional', desc: 'Growing beyond your current role', icon: 'Briefcase' },
  { id: 'salaried', label: 'Salaried Employee', desc: 'Creating additional income streams', icon: 'Wallet' },
  { id: 'businessman', label: 'Businessman', desc: 'Expanding your financial portfolio', icon: 'Building' },
];

export const QUESTIONS = [
  {
    id: 1,
    text: "How much time can you dedicate weekly to building an additional income?",
    options: [
      { text: "Less than 4 hours", score: 1 },
      { text: "4-6 hours", score: 2 },
      { text: "6-10 hours", score: 3 },
      { text: "10+ hours", score: 4 },
    ],
  },
  {
    id: 2,
    text: "How satisfied are you with your current income source?",
    options: [
      { text: "Very Dissatisfied", score: 4 }, // Logic inverted based on prompt desire for change? Or prompt implies dissatisfaction = higher drive? Following your prompt: Very Dissatisfied = 4
      { text: "Dissatisfied", score: 3 },
      { text: "Neutral", score: 2 },
      { text: "Fully Satisfied", score: 1 },
    ],
  },
  {
    id: 3,
    text: "If your current income stopped today, how long could you maintain your lifestyle?",
    options: [
      { text: "Less than 1 month", score: 1 },
      { text: "1-3 months", score: 2 },
      { text: "3-6 months", score: 3 },
      { text: "6+ months", score: 4 },
    ],
  },
  {
    id: 4,
    text: "Do you have a backup plan or 2nd income source?",
    options: [
      { text: "None", score: 1 },
      { text: "Some Idea", score: 2 },
      { text: "Side Hustle Started", score: 3 },
      { text: "Fully Active", score: 4 },
    ],
  },
  {
    id: 5,
    text: "Do you love helping people improve their lives or finances?",
    options: [
      { text: "Not Interested", score: 1 },
      { text: "Somewhat", score: 2 },
      { text: "Yes", score: 3 },
      { text: "Absolutely", score: 4 },
    ],
  },
  {
    id: 6,
    text: "When do you see yourself achieving financial freedom in your current job/business?",
    options: [
      { text: "Never", score: 1 },
      { text: "10+ years", score: 2 },
      { text: "5-10 years", score: 3 },
      { text: "Less than 5 years", score: 4 },
    ],
  },
  {
    id: 7,
    text: "How confident are you about your retirement readiness?",
    options: [
      { text: "Not at all", score: 1 },
      { text: "Somewhat", score: 2 },
      { text: "Good", score: 3 },
      { text: "Fully confident", score: 4 },
    ],
  },
  {
    id: 8,
    text: "What matters most to you in life?",
    options: [
      { text: "Only Money", score: 1 },
      { text: "Family + Comfort", score: 2 },
      { text: "Growth + Respect", score: 3 },
      { text: "Freedom + Purpose", score: 4 },
    ],
  },
  {
    id: 9,
    text: "How do you manage your insurance & investments currently?",
    options: [
      { text: "I don't have any", score: 1 },
      { text: "Basic", score: 2 },
      { text: "Some planning", score: 3 },
      { text: "Fully structured", score: 4 },
    ],
  },
  {
    id: 10,
    text: "Would you like to learn a system to earn, serve, and grow through a Financial Freedom career?",
    options: [
      { text: "Not sure", score: 1 },
      { text: "Maybe", score: 2 },
      { text: "Yes", score: 3 },
      { text: "Absolutely", score: 4 },
    ],
  },
];

export const RESULTS = {
  seeker: {
    title: "Freedom Seeker",
    color: "text-orange-500",
    desc: "You dream of freedom but lack the path. You’re ready for change — the Financial Guardian career could be your doorway.",
  },
  explorer: {
    title: "Freedom Explorer",
    color: "text-green-600",
    desc: "You’ve started thinking differently. With the right system and mentor, you can fast-track your journey.",
  },
  achiever: {
    title: "Freedom Achiever",
    color: "text-blue-600",
    desc: "You’re built for impact and independence. With our guidance, you can achieve time, money, and respect freedom.",
  },
};