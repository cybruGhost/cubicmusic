import { cn } from '@/lib/utils';

interface MoodChipsProps {
  onMoodSelect: (mood: string) => void;
  activeMood?: string;
}

const moods = [
  { id: 'relax', label: 'Relax', emoji: '😌' },
  { id: 'energise', label: 'Energise', emoji: '⚡' },
  { id: 'focus', label: 'Focus', emoji: '🎯' },
  { id: 'party', label: 'Party', emoji: '🎉' },
  { id: 'sad', label: 'Sad', emoji: '😢' },
  { id: 'romance', label: 'Romance', emoji: '💕' },
  { id: 'workout', label: 'Work out', emoji: '💪' },
  { id: 'chill', label: 'Chill', emoji: '🌙' },
];

export function MoodChips({ onMoodSelect, activeMood }: MoodChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {moods.map((mood) => (
        <button
          key={mood.id}
          onClick={() => onMoodSelect(mood.label.toLowerCase())}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
            activeMood === mood.label.toLowerCase()
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-accent"
          )}
        >
          <span className="mr-1.5">{mood.emoji}</span>
          {mood.label}
        </button>
      ))}
    </div>
  );
}
