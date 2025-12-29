import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, ChevronRight, Sparkles, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setUsername, setPreferredArtists, setOnboardingComplete } from '@/lib/storage';
import { cn } from '@/lib/utils';

const SUGGESTED_ARTISTS = [
  { name: "Taylor Swift", genre: "Pop" },
  { name: "Drake", genre: "Hip-Hop" },
  { name: "The Weeknd", genre: "R&B" },
  { name: "Billie Eilish", genre: "Pop" },
  { name: "Bad Bunny", genre: "Latin" },
  { name: "Ed Sheeran", genre: "Pop" },
  { name: "Dua Lipa", genre: "Pop" },
  { name: "Kendrick Lamar", genre: "Hip-Hop" },
  { name: "Ariana Grande", genre: "Pop" },
  { name: "Post Malone", genre: "Hip-Hop" },
  { name: "SZA", genre: "R&B" },
  { name: "Travis Scott", genre: "Hip-Hop" },
  { name: "Olivia Rodrigo", genre: "Pop" },
  { name: "Bruno Mars", genre: "Pop" },
  { name: "Rihanna", genre: "R&B" },
  { name: "Kanye West", genre: "Hip-Hop" },
  { name: "Beyoncé", genre: "R&B" },
  { name: "Justin Bieber", genre: "Pop" },
  { name: "Adele", genre: "Pop" },
  { name: "Harry Styles", genre: "Pop" },
  { name: "Doja Cat", genre: "Hip-Hop" },
  { name: "Lil Baby", genre: "Hip-Hop" },
  { name: "21 Savage", genre: "Hip-Hop" },
  { name: "Morgan Wallen", genre: "Country" },
  { name: "Coldplay", genre: "Rock" },
  { name: "Imagine Dragons", genre: "Rock" },
  { name: "BTS", genre: "K-Pop" },
  { name: "BLACKPINK", genre: "K-Pop" },
  { name: "Peso Pluma", genre: "Latin" },
  { name: "Burna Boy", genre: "Afrobeats" },
];

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<'name' | 'artists'>('name');
  const [name, setName] = useState('');
  const [selectedArtists, setSelectedArtists] = useState<string[]>([]);

  const handleNameSubmit = () => {
    if (name.trim()) {
      setUsername(name.trim());
    }
    setStep('artists');
  };

  const toggleArtist = (artist: string) => {
    setSelectedArtists(prev =>
      prev.includes(artist)
        ? prev.filter(a => a !== artist)
        : [...prev, artist]
    );
  };

  const handleComplete = () => {
    setPreferredArtists(selectedArtists);
    setOnboardingComplete();
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-4"
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-primary/10 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <AnimatePresence mode="wait">
        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md text-center"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl"
            >
              <Music2 className="w-10 h-10 text-primary-foreground" />
            </motion.div>

            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome to <span className="text-gradient">C-Music</span>
            </h1>
            <p className="text-muted-foreground mb-8">
              Your personalized music experience
            </p>

            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="What should I call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-12 py-6 text-lg bg-secondary/50 border-border/50 rounded-xl"
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                />
              </div>

              <Button
                onClick={handleNameSubmit}
                className="w-full py-6 text-lg gap-2"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </Button>

              <button
                onClick={handleNameSubmit}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}

        {step === 'artists' && (
          <motion.div
            key="artists"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-3xl"
          >
            <div className="text-center mb-8">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Tell us which artists you like
              </h1>
              <p className="text-muted-foreground">
                We'll create an experience just for you
              </p>
            </div>

            {/* Artist Grid */}
            <div className="flex flex-wrap justify-center gap-2 mb-8 max-h-[50vh] overflow-y-auto p-4">
              {SUGGESTED_ARTISTS.map((artist) => {
                const isSelected = selectedArtists.includes(artist.name);
                return (
                  <motion.button
                    key={artist.name}
                    onClick={() => toggleArtist(artist.name)}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "px-4 py-2.5 rounded-full border transition-all duration-200 flex items-center gap-2",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 border-border/50 hover:border-primary/50 hover:bg-secondary"
                    )}
                  >
                    {artist.name}
                    <span className={cn(
                      "text-xs",
                      isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                    )}>
                      {artist.genre}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedArtists.length} selected
              </span>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={handleComplete}
                >
                  Skip
                </Button>
                <Button
                  onClick={handleComplete}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Get Recommendations
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Created by */}
      <div className="absolute bottom-4 text-center text-xs text-muted-foreground">
        Created by <span className="text-primary">cybrughost</span>
      </div>
    </motion.div>
  );
}
