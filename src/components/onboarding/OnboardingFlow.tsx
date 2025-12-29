import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music2, ChevronRight, Sparkles, User, Search, X } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [customArtists, setCustomArtists] = useState<string[]>([]);

  // Filter artists based on search
  const filteredArtists = useMemo(() => {
    if (!searchQuery.trim()) {
      return SUGGESTED_ARTISTS;
    }
    
    const query = searchQuery.toLowerCase();
    return SUGGESTED_ARTISTS.filter(artist => 
      artist.name.toLowerCase().includes(query) ||
      artist.genre.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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

  const addCustomArtist = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const artistName = searchQuery.trim();
      
      // Check if already exists in suggested artists
      const existsInSuggested = SUGGESTED_ARTISTS.some(
        artist => artist.name.toLowerCase() === artistName.toLowerCase()
      );
      
      // Check if already exists in custom artists
      const existsInCustom = customArtists.some(
        artist => artist.toLowerCase() === artistName.toLowerCase()
      );
      
      // Check if already selected
      const alreadySelected = selectedArtists.some(
        artist => artist.toLowerCase() === artistName.toLowerCase()
      );
      
      if (!existsInSuggested && !existsInCustom && !alreadySelected) {
        // Add to custom artists
        setCustomArtists(prev => [...prev, artistName]);
        // Select it
        setSelectedArtists(prev => [...prev, artistName]);
      } else if (!alreadySelected) {
        // If it exists in suggestions but not selected, select it
        const existingArtist = SUGGESTED_ARTISTS.find(
          artist => artist.name.toLowerCase() === artistName.toLowerCase()
        );
        if (existingArtist && !selectedArtists.includes(existingArtist.name)) {
          setSelectedArtists(prev => [...prev, existingArtist.name]);
        }
      }
      
      // Clear search
      setSearchQuery('');
    }
  };

  const removeCustomArtist = (artist: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomArtists(prev => prev.filter(a => a !== artist));
    setSelectedArtists(prev => prev.filter(a => a !== artist));
  };

  const handleComplete = () => {
    // Combine selected artists from suggested and custom
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
                disabled={!name.trim()}
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
            className="relative z-10 w-full max-w-3xl max-h-[90vh] flex flex-col"
          >
            <div className="text-center mb-6">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Tell us which artists you like
              </h1>
              <p className="text-muted-foreground">
                Search or browse artists. Press Enter to add custom artists.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search artists or type a custom artist and press Enter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={addCustomArtist}
                className="pl-12 py-5 text-base bg-secondary/50 border-border/50 rounded-xl"
              />
            </div>

            {/* Selected Artists Preview */}
            {selectedArtists.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  Selected Artists ({selectedArtists.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {selectedArtists.map(artist => {
                    // Check if it's a custom artist
                    const isCustom = customArtists.includes(artist);
                    return (
                      <motion.div
                        key={artist}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="px-3 py-2 rounded-full bg-primary/20 text-primary border border-primary/30 flex items-center gap-2"
                      >
                        {artist}
                        {isCustom && (
                          <button
                            onClick={() => toggleArtist(artist)}
                            className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center hover:bg-primary/50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Artist Grid */}
            <div className="flex-1 overflow-y-auto pr-2 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {/* Custom Artists First */}
                {customArtists.map((artist) => {
                  const isSelected = selectedArtists.includes(artist);
                  return (
                    <motion.button
                      key={`custom-${artist}`}
                      onClick={() => toggleArtist(artist)}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "p-4 rounded-xl border transition-all duration-200 flex flex-col items-start justify-between",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 border-border/50 hover:border-primary/50 hover:bg-secondary"
                      )}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className="font-medium text-left break-words">{artist}</span>
                        <button
                          onClick={(e) => removeCustomArtist(artist, e)}
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center",
                            isSelected
                              ? "bg-primary-foreground/20 hover:bg-primary-foreground/30"
                              : "bg-secondary hover:bg-secondary/80"
                          )}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      <span className={cn(
                        "text-xs mt-2 self-start",
                        isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        Custom Artist
                      </span>
                    </motion.button>
                  );
                })}

                {/* Filtered Suggested Artists */}
                {filteredArtists.map((artist) => {
                  const isSelected = selectedArtists.includes(artist.name);
                  return (
                    <motion.button
                      key={artist.name}
                      onClick={() => toggleArtist(artist.name)}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "p-4 rounded-xl border transition-all duration-200 flex flex-col items-start",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 border-border/50 hover:border-primary/50 hover:bg-secondary"
                      )}
                    >
                      <span className="font-medium text-left mb-2 break-words">{artist.name}</span>
                      <span className={cn(
                        "text-xs",
                        isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}>
                        {artist.genre}
                      </span>
                    </motion.button>
                  );
                })}

                {/* Empty State */}
                {filteredArtists.length === 0 && customArtists.length === 0 && (
                  <div className="col-span-3 text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      No artists found for "{searchQuery}"
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                      Press Enter to add it as a custom artist
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <button
                onClick={() => setStep('name')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back
              </button>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={handleComplete}
                >
                  Skip
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={selectedArtists.length === 0}
                  className="gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {selectedArtists.length > 0 
                    ? `Continue with ${selectedArtists.length} artist${selectedArtists.length > 1 ? 's' : ''}`
                    : 'Get Recommendations'}
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
