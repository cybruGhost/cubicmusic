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
  Plus
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
  thumbnail?: string;
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
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  
  const debouncedSearch = useDebounce(searchQuery, 500);

  const searchArtists = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSuggestions(true);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);

    try {
      // First, check if we have local matches
      const localMatches = SUGGESTED_ARTISTS.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      );

      if (localMatches.length > 0) {
        setSearchResults(localMatches);
        setIsSearching(false);
        return;
      }

      // Try to fetch from the YouTube Music API
      const response = await fetch(
        `https://yt.omada.cafe/api/v1/search?q=${encodeURIComponent(query)}&type=artists`
      );

      if (response.ok) {
        const data = await response.json();
        console.log('API Response:', data); // For debugging
        
        if (data && data.content) {
          // Extract artist names from search results
          const artistsFromAPI: Artist[] = [];
          
          data.content.forEach((item: any) => {
            // Handle different response formats
            if (item.type === 'artist' || 
                item.category === 'Artist' || 
                item.resultType === 'artist' ||
                (item.artist && !item.videoId)) {
              
              const artistName = item.title || item.name || item.artist || item.author;
              if (artistName) {
                artistsFromAPI.push({
                  name: artistName,
                  genre: item.category || item.genre || 'Artist',
                  id: item.id || item.browseId,
                  thumbnail: item.thumbnail || item.thumbnails?.[0]?.url
                });
              }
            }
          });
          
          // If no artists found in structured way, try to extract from song results
          if (artistsFromAPI.length === 0 && data.content.length > 0) {
            const uniqueArtists = new Set<string>();
            data.content.forEach((item: any) => {
              if (item.author) {
                uniqueArtists.add(item.author);
              }
            });
            
            Array.from(uniqueArtists).slice(0, 20).forEach(artistName => {
              artistsFromAPI.push({
                name: artistName,
                genre: 'Artist',
                id: undefined
              });
            });
          }
          
          setSearchResults(artistsFromAPI.slice(0, 20));
        } else {
          // If API returns no structured results, search songs and extract artists
          const songResponse = await fetch(
            `https://yt.omada.cafe/api/v1/search?q=${encodeURIComponent(query)}&type=songs`
          );
          
          if (songResponse.ok) {
            const songData = await songResponse.json();
            const uniqueArtists = new Set<string>();
            
            if (songData && songData.content) {
              songData.content.forEach((item: any) => {
                if (item.author) {
                  uniqueArtists.add(item.author);
                }
              });
              
              const artistsFromSongs: Artist[] = Array.from(uniqueArtists)
                .slice(0, 20)
                .map(artistName => ({
                  name: artistName,
                  genre: 'Artist',
                  id: undefined
                }));
              
              setSearchResults(artistsFromSongs);
            } else {
              setSearchResults([]);
              setShowSuggestions(true);
            }
          } else {
            setSearchResults([]);
            setShowSuggestions(true);
          }
        }
      } else {
        console.error('API Error:', response.status);
        // Fallback to local search if API fails
        const fallbackResults = SUGGESTED_ARTISTS.filter(artist =>
          artist.name.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(fallbackResults);
      }
    } catch (error) {
      console.error('Error searching artists:', error);
      // Fallback to local search on error
      const fallbackResults = SUGGESTED_ARTISTS.filter(artist =>
        artist.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(fallbackResults.length > 0 ? fallbackResults : []);
      setShowSuggestions(true);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedSearch) {
      searchArtists(debouncedSearch);
    } else {
      setSearchResults([]);
      setShowSuggestions(true);
      setIsSearching(false);
    }
  }, [debouncedSearch, searchArtists]);

  const handleNameSubmit = () => {
    if (name.trim()) {
      setUsername(name.trim());
    }
    setStep('artists');
  };

  const toggleArtist = (artist: Artist) => {
    setSelectedArtists(prev => {
      const isSelected = prev.some(a => a.name === artist.name);
      if (isSelected) {
        return prev.filter(a => a.name !== artist.name);
      } else {
        return [...prev, artist];
      }
    });
  };

  const handleSearchSubmit = () => {
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
    }
  };

  const handleComplete = () => {
    // Save all selected artists
    selectedArtists.forEach(artist => {
      addPreferredArtist({
        id: artist.id,
        name: artist.name,
        genre: artist.genre,
        thumbnail: artist.thumbnail,
        selectedAt: Date.now()
      });
    });
    
    setOnboardingComplete();
    onComplete();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  const displayedArtists = searchQuery.trim() 
    ? searchResults
    : showSuggestions 
      ? SUGGESTED_ARTISTS
      : [];

  const isArtistSelected = (artistName: string) => {
    return selectedArtists.some(a => a.name === artistName);
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
            className="relative z-10 w-full max-w-3xl bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="text-center mb-8">
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Tell us which artists you like
                </h1>
                <p className="text-muted-foreground mb-6">
                  Search for your favorite artists or select from suggestions
                </p>

                {/* Search Bar with Submit Button */}
                <div className="flex gap-2 max-w-md mx-auto mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search for artists (e.g., Lauren, NF, Drake)..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="pl-12 pr-10 py-6 text-base bg-secondary/50 border-border/50 rounded-xl"
                    />
                    {searchInput && (
                      <button
                        onClick={() => {
                          setSearchInput('');
                          setSearchQuery('');
                          setShowSuggestions(true);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                      >
                        <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  <Button
                    onClick={handleSearchSubmit}
                    className="py-6 px-8 gap-2"
                    disabled={!searchInput.trim() || isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Search className="w-5 h-5" />
                    )}
                    Search
                  </Button>
                </div>
              </div>

              {/* Selected Artists List - Always visible when there are selections */}
              {selectedArtists.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 bg-primary/5 rounded-xl p-4 border border-primary/10"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      Selected Artists ({selectedArtists.length})
                    </h3>
                    <button
                      onClick={() => setSelectedArtists([])}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedArtists.map((artist) => (
                      <div
                        key={artist.name}
                        className="px-3 py-2 bg-primary/10 text-primary rounded-full flex items-center gap-2 text-sm hover:bg-primary/20 transition-colors"
                      >
                        <span className="font-medium">{artist.name}</span>
                        {artist.genre && artist.genre !== 'Artist' && (
                          <span className="text-xs bg-primary/20 px-2 py-0.5 rounded-full">
                            {artist.genre}
                          </span>
                        )}
                        <button
                          onClick={() => toggleArtist(artist)}
                          className="hover:bg-primary/30 rounded-full p-0.5 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Results/Artists Grid */}
              <div className="mb-6">
                {isSearching ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="ml-3 text-muted-foreground">Searching artists...</span>
                  </div>
                ) : (
                  <>
                    {/* Section Title */}
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-semibold text-foreground">
                        {searchQuery.trim() 
                          ? `Search Results for "${searchQuery}"`
                          : 'Popular Artists'
                        }
                      </h2>
                      {displayedArtists.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {displayedArtists.length} artists
                        </span>
                      )}
                    </div>

                    {/* Artists Grid */}
                    <div className="flex flex-wrap justify-center gap-2 max-h-[40vh] overflow-y-auto p-2">
                      {displayedArtists.length > 0 ? (
                        displayedArtists.map((artist) => {
                          const isSelected = isArtistSelected(artist.name);
                          return (
                            <motion.button
                              key={`${artist.name}-${artist.id || 'local'}`}
                              onClick={() => toggleArtist(artist)}
                              whileTap={{ scale: 0.95 }}
                              className={cn(
                                "px-4 py-3 rounded-xl border transition-all duration-200 flex items-center gap-3 min-w-[200px]",
                                isSelected
                                  ? "bg-primary text-primary-foreground border-primary shadow-lg"
                                  : "bg-secondary/50 border-border/50 hover:border-primary/50 hover:bg-secondary hover:shadow-md"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center",
                                  isSelected 
                                    ? "bg-primary-foreground/20" 
                                    : "bg-muted"
                                )}>
                                  {isSelected ? (
                                    <Check className="w-4 h-4" />
                                  ) : (
                                    <Plus className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <span className="font-medium block">{artist.name}</span>
                                  {artist.genre && (
                                    <span className={cn(
                                      "text-xs",
                                      isSelected 
                                        ? "text-primary-foreground/70" 
                                        : "text-muted-foreground"
                                    )}>
                                      {artist.genre}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          );
                        })
                      ) : searchQuery.trim() ? (
                        <div className="text-center py-8 text-muted-foreground w-full">
                          <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p className="mb-2">No artists found for "{searchQuery}"</p>
                          <p className="text-sm">Try searching for songs instead (like "{searchQuery} songs")</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-3"
                            onClick={() => {
                              setSearchInput(searchQuery + " songs");
                              handleSearchSubmit();
                            }}
                          >
                            Search for "{searchQuery}" songs
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground w-full">
                          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Search for your favorite artists above</p>
                          <p className="text-sm mt-1">Or select from popular suggestions</p>
                        </div>
                      )}
                    </div>

                    {/* Manual Add Option */}
                    {searchQuery.trim() && displayedArtists.length === 0 && (
                      <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          Can't find the artist? Add them manually:
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            const newArtist: Artist = {
                              name: searchQuery,
                              genre: 'Artist'
                            };
                            toggleArtist(newArtist);
                            setSearchInput('');
                            setSearchQuery('');
                          }}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add "{searchQuery}" as an artist
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between border-t pt-6">
                <Button
                  variant="ghost"
                  onClick={() => setStep('name')}
                  className="gap-2"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Back to Name
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      // Skip but save empty preferences
                      setOnboardingComplete();
                      onComplete();
                    }}
                  >
                    Skip for now
                  </Button>
                  <Button
                    onClick={handleComplete}
                    className="gap-2"
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {selectedArtists.length > 0 
                          ? `Continue with ${selectedArtists.length} artist${selectedArtists.length > 1 ? 's' : ''}`
                          : 'Continue without artists'
                        }
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="border-t bg-muted/20 p-4">
              <div className="text-center text-xs text-muted-foreground">
                <p className="mb-1">
                  <span className="text-primary">💡 Tip:</span> Search for artist names or songs by artists
                </p>
                <p>Example searches: "NF", "Taylor Swift", "Drake songs"</p>
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
