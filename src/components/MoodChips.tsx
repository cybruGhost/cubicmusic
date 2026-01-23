import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface MoodChipsProps {
  onMoodSelect: (mood: string) => void;
  activeMood?: string;
}

const moods = [
  { id: 'relax', label: 'Relax', emoji: '😌', query: 'relaxing chill music playlist', gradient: 'from-green-500/20 to-emerald-500/20' },
  { id: 'energise', label: 'Energise', emoji: '⚡', query: 'energetic upbeat workout music', gradient: 'from-yellow-500/20 to-orange-500/20' },
  { id: 'focus', label: 'Focus', emoji: '🎯', query: 'focus study concentration music', gradient: 'from-blue-500/20 to-indigo-500/20' },
  { id: 'party', label: 'Party', emoji: '🎉', query: 'party dance club hits', gradient: 'from-pink-500/20 to-purple-500/20' },
  { id: 'sad', label: 'Sad', emoji: '😢', query: 'sad emotional songs playlist', gradient: 'from-slate-500/20 to-gray-500/20' },
  { id: 'romance', label: 'Romance', emoji: '💕', query: 'romantic love songs playlist', gradient: 'from-rose-500/20 to-pink-500/20' },
  { id: 'workout', label: 'Work out', emoji: '💪', query: 'workout gym motivation music', gradient: 'from-red-500/20 to-orange-500/20' },
  { id: 'chill', label: 'Chill', emoji: '🌙', query: 'chill vibes lofi beats', gradient: 'from-violet-500/20 to-purple-500/20' },
  { id: 'happy', label: 'Happy', emoji: '😊', query: 'happy feel good songs', gradient: 'from-amber-500/20 to-yellow-500/20' },
  { id: 'sleep', label: 'Sleep', emoji: '😴', query: 'sleep relaxation ambient music', gradient: 'from-indigo-500/20 to-blue-500/20' },
];

export function MoodChips({ onMoodSelect, activeMood }: MoodChipsProps) {
  const handleMoodClick = (mood: typeof moods[0]) => {
    // Pass the specific search query for this mood
    onMoodSelect(mood.query);
  };

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Moods</h2>
      <div className="flex flex-wrap gap-3">
        {moods.map((mood, index) => {
          const isActive = activeMood === mood.query;
          return (
            <motion.button
              key={mood.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleMoodClick(mood)}
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
