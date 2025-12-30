import { useState, useEffect, useCallback } from 'react';
import { Search } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Sidebar } from '@/components/Sidebar';
import { Player } from '@/components/Player';
import { MusicGrid } from '@/components/MusicGrid';
import { QuickPicks } from '@/components/QuickPicks';
import { MoodChips } from '@/components/MoodChips';
import { FullscreenLyrics } from '@/components/lyrics/FullscreenLyrics';
import { LibraryView } from '@/components/LibraryView';
import { ExploreView } from '@/components/ExploreView';
import { SettingsPage } from '@/components/SettingsPage';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { SearchPage } from '@/components/SearchPage';
import { ChannelInfo } from '@/components/ChannelInfo';
import { useSearch } from '@/hooks/useSearch';
import { getPreferredArtists, hasCompletedOnboarding, getGreeting } from '@/lib/storage';
import { toast } from 'sonner';

export default function Index() {
  const [activeTab, setActiveTab] = useState('home');
  const [activeMood, setActiveMood] = useState<string>();
  const [initialized, setInitialized] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [channelArtist, setChannelArtist] = useState<string | null>(null);
  const { videos, loading, search } = useSearch();

  // Check onboarding on mount
  useEffect(() => {
    if (!hasCompletedOnboarding()) {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    if (!initialized && !showOnboarding) {
      const preferredArtists = getPreferredArtists();
      if (preferredArtists.length > 0) {
        const shuffled = [...preferredArtists].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 3);
        search(selected.join(' '));
      } else {
        const defaultArtists = ['Taylor Swift', 'Drake', 'The Weeknd', 'Ed Sheeran', 'Dua Lipa', 'Bad Bunny', 'BTS', 'Billie Eilish'];
        const shuffled = [...defaultArtists].sort(() => Math.random() - 0.5);
        search(shuffled.slice(0, 3).join(' '));
      }
      setInitialized(true);
    }
  }, [initialized, search, showOnboarding]);

  const handleMoodSelect = useCallback((mood: string) => {
    setActiveMood(mood);
    search(`${mood} music playlist`);
  }, [search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setShowSettings(false);
  };

  const handleSignInClick = () => {
    toast.info('Sign in coming soon!');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setInitialized(false);
  };

  const handleOpenChannel = (artistName: string) => {
    setChannelArtist(artistName);
  };

  // Show onboarding
  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div 
      className="h-screen flex flex-col overflow-hidden"
      style={{
        background: 'var(--dynamic-bg, var(--gradient-hero))'
      }}
    >
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSignInClick={handleSignInClick}
          onSettingsClick={() => setShowSettings(true)}
          autoClose
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Header with Search Icon */}
          <header className="sticky top-0 z-10 backdrop-blur-xl border-b border-border/30">
            <div className="px-6 py-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-foreground">
                {getGreeting()} 🎶
              </p>
              
              <button
                onClick={() => setShowSearch(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary/80 hover:bg-secondary rounded-xl transition-all group"
              >
                <Search className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors hidden sm:inline">Search music...</span>
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="p-6 pb-28 space-y-8">
            {showSettings ? (
              <SettingsPage onBack={() => setShowSettings(false)} />
            ) : activeTab === 'library' ? (
              <LibraryView onOpenChannel={handleOpenChannel} />
            ) : activeTab === 'explore' ? (
              <ExploreView />
            ) : (
              /* Home View */
              <>
                {/* Mood Chips */}
                <section>
                  <MoodChips onMoodSelect={handleMoodSelect} activeMood={activeMood} />
                </section>

                {/* Quick Picks */}
                {videos.length > 0 && (
                  <section>
                    <QuickPicks videos={videos} onOpenChannel={handleOpenChannel} />
                  </section>
                )}

                {/* Main Grid */}
                <section>
                  <MusicGrid
                    videos={videos.slice(8)}
                    loading={loading}
                    title="Recommended for you"
                    onOpenChannel={handleOpenChannel}
                  />
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Fullscreen Lyrics */}
      <FullscreenLyrics isOpen={showLyrics} onClose={() => setShowLyrics(false)} />

      {/* Search Page */}
      <AnimatePresence>
        {showSearch && (
          <SearchPage 
            onClose={() => setShowSearch(false)} 
            onOpenChannel={handleOpenChannel}
          />
        )}
      </AnimatePresence>

      {/* Channel Info Modal */}
      <AnimatePresence>
        {channelArtist && (
          <ChannelInfo 
            artistName={channelArtist} 
            onClose={() => setChannelArtist(null)} 
          />
        )}
      </AnimatePresence>

      {/* Player Bar */}
      <Player 
        onLyricsOpen={() => setShowLyrics(true)} 
        onOpenChannel={handleOpenChannel}
      />
    </div>
  );
}
