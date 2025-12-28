import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MoodChipsProps {
  onMoodSelect: (mood: string) => void;
  activeMood?: string;
}

const moods = [
  { id: 'relax', label: 'Relax', emoji: '😌', gradient: 'from-green-500/20 to-emerald-500/20' },
  { id: 'energise', label: 'Energise', emoji: '⚡', gradient: 'from-yellow-500/20 to-orange-500/20' },
  { id: 'focus', label: 'Focus', emoji: '🎯', gradient: 'from-blue-500/20 to-indigo-500/20' },
  { id: 'party', label: 'Party', emoji: '🎉', gradient: 'from-pink-500/20 to-purple-500/20' },
  { id: 'sad', label: 'Sad', emoji: '😢', gradient: 'from-slate-500/20 to-gray-500/20' },
  { id: 'romance', label: 'Romance', emoji: '💕', gradient: 'from-rose-500/20 to-pink-500/20' },
  { id: 'workout', label: 'Work out', emoji: '💪', gradient: 'from-red-500/20 to-orange-500/20' },
  { id: 'chill', label: 'Chill', emoji: '🌙', gradient: 'from-violet-500/20 to-purple-500/20' },
];

export function MoodChips({ onMoodSelect, activeMood }: MoodChipsProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Moods</h2>
      <div className="flex flex-wrap gap-3">
        {moods.map((mood, index) => {
          const isActive = activeMood === mood.label.toLowerCase();
          return (
            <motion.button
              key={mood.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onMoodSelect(mood.label.toLowerCase())}
              className={cn(
                "relative px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 overflow-hidden",
                "border backdrop-blur-sm",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                  : `bg-gradient-to-r ${mood.gradient} border-border/50 text-foreground hover:border-primary/50 hover:scale-105`
              )}
            >
              <span className="relative z-10 flex items-center gap-2">
                <span className="text-base">{mood.emoji}</span>
                <span>{mood.label}</span>
              </span>
              {isActive && (
                <motion.div
                  layoutId="mood-active"
                  className="absolute inset-0 bg-primary -z-0"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
