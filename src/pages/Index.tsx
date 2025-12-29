import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SearchBar } from '@/components/SearchBar';
import { Player } from '@/components/Player';
import { MusicGrid } from '@/components/MusicGrid';
import { QuickPicks } from '@/components/QuickPicks';
import { MoodChips } from '@/components/MoodChips';
import { FullscreenLyrics } from '@/components/lyrics/FullscreenLyrics';
import { LibraryView } from '@/components/LibraryView';
import { ExploreView } from '@/components/ExploreView';
import { RadioPage } from '@/components/Radio';
import { SettingsPage } from '@/components/SettingsPage';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { ChannelInfo } from '@/components/ChannelInfo';
import { useSearch } from '@/hooks/useSearch';
import { getPreferredArtists, hasCompletedOnboarding, getGreeting } from '@/lib/storage';
import { toast } from 'sonner';

export default function Index() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMood, setActiveMood] = useState<string>();
  const [initialized, setInitialized] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showChannel, setShowChannel] = useState<string | null>(null);
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
        const defaultArtists = ['Taylor Swift', 'Drake', 'The Weeknd', 'Ed Sheeran', 'Dua Lipa'];
        const shuffled = [...defaultArtists].sort(() => Math.random() - 0.5);
        search(shuffled.slice(0, 3).join(' '));
      }
      setInitialized(true);
    }
  }, [initialized, search, showOnboarding]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      search(query);
      setActiveMood(undefined);
    } else {
      const preferredArtists = getPreferredArtists();
      const defaultArtists = preferredArtists.length > 0 ? preferredArtists : ['Taylor Swift', 'Drake', 'The Weeknd'];
      const shuffled = [...defaultArtists].sort(() => Math.random() - 0.5);
      search(shuffled.slice(0, 3).join(' '));
    }
  }, [search]);

  const handleMoodSelect = useCallback((mood: string) => {
    setActiveMood(mood);
    search(`${mood} music playlist`);
  }, [search]);

  const handleOpenChannel = (artist: string) => {
    setShowChannel(artist);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
    setShowSettings(false);
  };

  const handleSignInClick = () => {
    toast.info('Sign in coming soon!');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setInitialized(false);
  };

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-background to-muted/20">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onSignInClick={handleSignInClick}
          onSettingsClick={() => setShowSettings(true)}
        />

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <header className="sticky top-0 z-10 backdrop-blur-xl border-b border-border/30 bg-background/80">
            <div className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1 max-w-xl">
                <SearchBar onSearch={handleSearch} />
              </div>
              <p className="text-sm text-muted-foreground hidden md:block ml-4">
                {getGreeting()} 🎶
              </p>
            </div>
          </header>

          <div className="p-6 pb-28 space-y-8">
            {showSettings ? (
              <SettingsPage onBack={() => setShowSettings(false)} />
            ) : activeTab === 'library' ? (
              <LibraryView />
            ) : activeTab === 'explore' ? (
              <ExploreView />
            ) : activeTab === 'radio' ? (
              <RadioPage />
            ) : (
              <>
                {!searchQuery && (
                  <>
                    <section>
                      <MoodChips onMoodSelect={handleMoodSelect} activeMood={activeMood} />
                    </section>

                    {videos.length > 0 && (
                      <section>
                        <QuickPicks videos={videos} />
                      </section>
                    )}

                    <section>
                      <MusicGrid
                        videos={videos.slice(8)}
                        loading={loading}
                        title="Recommended for you"
                      />
                    </section>
                  </>
                )}

                {searchQuery && (
                  <section>
                    <MusicGrid
                      videos={videos}
                      loading={loading}
                      title={`Results for "${searchQuery}"`}
                    />
                  </section>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <FullscreenLyrics isOpen={showLyrics} onClose={() => setShowLyrics(false)} />
      
      {showChannel && (
        <ChannelInfo 
          artistName={showChannel} 
          onClose={() => setShowChannel(null)} 
        />
      )}

      {/* Player Bar */}
      <Player 
        onLyricsOpen={() => setShowLyrics(true)} 
        onOpenChannel={handleOpenChannel}
      />
    </div>
  );
}
