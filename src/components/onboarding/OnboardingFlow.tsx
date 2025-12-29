import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music2, 
  ChevronRight, 
  Sparkles, 
  User, 
  Search,
  X,
  Loader2,
  Check,
  Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setUsername, addPreferredArtist, setOnboardingComplete } from '@/lib/storage';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';

interface Artist {
  name: string;
  genre?: string;
  id?: string;
}

const SUGGESTED_ARTISTS: Artist[] = [
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
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Search for artists
  const searchArtists = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Try YouTube Music API
      const response = await fetch(
        `https://yt.omada.cafe/api/v1/search?q=${encodeURIComponent(query)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const artists: Artist[] = [];
        const seen = new Set<string>();

        if (data?.content) {
          // Extract artists from results
          data.content.forEach((item: any) => {
            // From channel type
            if (item.type === 'channel' && item.author && !seen.has(item.author)) {
              seen.add(item.author);
              artists.push({
                name: item.author,
                genre: 'Artist',
                id: item.authorId
              });
            }
            
            // From video type (author field)
            if (item.type === 'video' && item.author && !seen.has(item.author)) {
              seen.add(item.author);
              artists.push({
                name: item.author,
                genre: 'Artist',
                id: item.authorId
              });
            }
            
            // From other types with artist/author info
            if (item.artist && !seen.has(item.artist)) {
              seen.add(item.artist);
              artists.push({
                name: item.artist,
                genre: 'Artist',
                id: item.browseId
              });
            }
          });
        }
        
        // Filter out duplicates and limit results
        setSearchResults(artists.slice(0, 15));
      }
    } catch (error) {
      console.error('Search error:', error);
      // Fallback: show local matches
      const localMatches = SUGGESTED_ARTISTS.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 15);
      setSearchResults(localMatches);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Auto-search on type
  useEffect(() => {
    if (debouncedSearch) {
      searchArtists(debouncedSearch);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [debouncedSearch, searchArtists]);

  const handleNameSubmit = () => {
    if (name.trim()) {
      setUsername(name.trim());
    }
    setStep('artists');
  };

  const toggleArtist = (artistName: string) => {
    setSelectedArtists(prev =>
      prev.includes(artistName)
        ? prev.filter(a => a !== artistName)
        : [...prev, artistName]
    );
  };

  const addCustomArtist = (artist: Artist) => {
    if (!selectedArtists.includes(artist.name)) {
      setSelectedArtists(prev => [...prev, artist.name]);
    }
  };

  const handleComplete = () => {
    // Save selected artists
    const artistsToSave = selectedArtists.map(artistName => {
      const existing = SUGGESTED_ARTISTS.find(a => a.name === artistName) || 
                      searchResults.find(a => a.name === artistName);
      
      return {
        id: existing?.id,
        name: artistName,
        genre: existing?.genre || 'Artist',
        selectedAt: Date.now()
      };
    });
    
    artistsToSave.forEach(artist => addPreferredArtist(artist));
    setOnboardingComplete();
    onComplete();
  };

  // Filter suggested artists based on search
  const filteredSuggested = searchQuery
    ? SUGGESTED_ARTISTS.filter(artist =>
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !searchResults.some(r => r.name === artist.name)
      )
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-background flex items-center justify-center p-4"
    >
      {/* Simplified background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />

      <AnimatePresence mode="wait">
        {step === 'name' && (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md text-center"
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
              <Music2 className="w-8 h-8 text-primary-foreground" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome to <span className="text-primary">C-Music</span>
            </h1>
            <p className="text-muted-foreground mb-6">
              Your personalized music experience
            </p>

            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="What should I call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 py-5 text-base bg-secondary/30 border-border/50 rounded-lg"
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                />
              </div>

              <Button
                onClick={handleNameSubmit}
                className="w-full py-5 gap-2"
              >
                Continue
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'artists' && (
          <motion.div
            key="artists"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-2xl"
          >
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 via-card to-purple-500/10 border border-border/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Tell us which artists you like
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We'll create an experience just for you
                  </p>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/50 border-border/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search Results */}
              <AnimatePresence>
                {(searchResults.length > 0 || filteredSuggested.length > 0) && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4"
                  >
                    <div className="flex flex-wrap gap-2 mb-4">
                      {searchResults.map((artist) => (
                        <motion.button
                          key={artist.name}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => addCustomArtist(artist)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm",
                            selectedArtists.includes(artist.name)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background/50 border-border/50 hover:border-primary/50"
                          )}
                        >
                          <span className="font-medium">{artist.name}</span>
                          {selectedArtists.includes(artist.name) && (
                            <Check className="w-3 h-3" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Selected Artists */}
              {selectedArtists.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-muted-foreground mb-2">
                    Selected ({selectedArtists.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtists.map((artist) => (
                      <motion.div
                        key={artist}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm"
                      >
                        <span className="font-medium">{artist}</span>
                        <button
                          onClick={() => toggleArtist(artist)}
                          className="ml-1 hover:bg-primary-foreground/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Artists Grid */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-3">
                  Search for artists above or select from suggestions
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_ARTISTS.map((artist) => {
                    const isSelected = selectedArtists.includes(artist.name);
                    return (
                      <motion.button
                        key={artist.name}
                        onClick={() => toggleArtist(artist.name)}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background/50 border-border/50 hover:border-primary/50"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span className="font-medium">{artist.name}</span>
                        <span className="text-xs opacity-70">{artist.genre}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Manual Add Option */}
              {searchQuery && searchResults.length === 0 && filteredSuggested.length === 0 && !isSearching && (
                <div className="mb-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">
                    Can't find the artist?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (searchQuery.trim()) {
                        setSelectedArtists(prev => [...prev, searchQuery]);
                        setSearchQuery('');
                      }
                    }}
                    className="gap-2"
                  >
                    <Heart className="w-3 h-3" />
                    Add "{searchQuery}" as artist
                  </Button>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-border/50">
                <Button
                  variant="ghost"
                  onClick={() => setStep('name')}
                  size="sm"
                >
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleComplete}
                    size="sm"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="gap-2"
                    disabled={isSearching}
                    size="sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    {selectedArtists.length > 0
                      ? `Continue with ${selectedArtists.length} artist${selectedArtists.length > 1 ? 's' : ''}`
                      : 'Continue without artists'
                    }
                  </Button>
                </div>
              </div>
            </div>

            {/* Created by */}
            <div className="text-center text-xs text-muted-foreground mt-4">
              Created by <span className="text-primary">cybrughost</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
