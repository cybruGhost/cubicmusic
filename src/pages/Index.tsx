import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { SearchBar } from '@/components/SearchBar';
import { Player } from '@/components/Player';
import { MusicGrid } from '@/components/MusicGrid';
import { QuickPicks } from '@/components/QuickPicks';
import { MoodChips } from '@/components/MoodChips';
import { PlaylistView } from '@/components/playlists/PlaylistView';
import { PlaylistCard } from '@/components/playlists/PlaylistCard';
import { CreatePlaylistDialog } from '@/components/playlists/CreatePlaylistDialog';
import { FullscreenLyrics } from '@/components/lyrics/FullscreenLyrics';
import { LibraryView } from '@/components/LibraryView';
import { ExploreView } from '@/components/ExploreView';
import { useSearch } from '@/hooks/useSearch';
import { getPlaylists } from '@/lib/playlists';
import { getPreferredArtists, hasSelectedArtists } from '@/lib/storage';
import { UserPlaylist } from '@/types/music';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

export default function Index() {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMood, setActiveMood] = useState<string>();
  const [initialized, setInitialized] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<UserPlaylist | null>(null);
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [showLyrics, setShowLyrics] = useState(false);
  const { videos, loading, search } = useSearch();

  const loadPlaylists = useCallback(() => {
    setPlaylists(getPlaylists());
  }, []);

  useEffect(() => {
    loadPlaylists();
  }, [loadPlaylists]);

  useEffect(() => {
    if (!initialized) {
      // Use preferred artists if available
      const preferredArtists = getPreferredArtists();
      if (preferredArtists.length > 0) {
        const randomArtist = preferredArtists[Math.floor(Math.random() * preferredArtists.length)];
        search(randomArtist);
      } else {
        // Random popular artists for variety
        const defaultArtists = ['Taylor Swift', 'Drake', 'The Weeknd', 'Ed Sheeran', 'Dua Lipa', 'Bad Bunny'];
        const randomArtist = defaultArtists[Math.floor(Math.random() * defaultArtists.length)];
        search(randomArtist);
      }
      setInitialized(true);
    }
  }, [initialized, search]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setSelectedPlaylist(null);
    if (query.trim()) {
      search(query);
      setActiveMood(undefined);
    } else {
      const defaultArtists = ['Taylor Swift', 'Drake', 'The Weeknd'];
      search(defaultArtists[Math.floor(Math.random() * defaultArtists.length)]);
    }
  }, [search]);

  const handleMoodSelect = useCallback((mood: string) => {
    setActiveMood(mood);
    setSelectedPlaylist(null);
    search(`${mood} music playlist`);
  }, [search]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedPlaylist(null);
    setSearchQuery('');
  };

  const handlePlaylistSelect = (playlist: UserPlaylist) => {
    setSelectedPlaylist(playlist);
    setActiveTab('library');
  };

  const handleSignInClick = () => {
    toast.info('Sign in coming soon!');
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar 
          activeTab={activeTab} 
          onTabChange={handleTabChange}
          onPlaylistSelect={handlePlaylistSelect}
          onSignInClick={handleSignInClick}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {/* Header with Search */}
          <header className="sticky top-0 z-10 glass border-b border-border">
            <div className="px-6 py-4">
              <SearchBar onSearch={handleSearch} />
            </div>
          </header>

          {/* Content */}
          <div className="p-6 pb-28 space-y-8">
            {/* Playlist View */}
            {selectedPlaylist ? (
              <PlaylistView
                playlist={selectedPlaylist}
                onBack={() => setSelectedPlaylist(null)}
                onUpdate={loadPlaylists}
              />
            ) : activeTab === 'library' ? (
              <LibraryView 
                playlists={playlists}
                onPlaylistSelect={setSelectedPlaylist}
                onPlaylistsUpdate={loadPlaylists}
              />
            ) : activeTab === 'explore' ? (
              <ExploreView />
            ) : (
              /* Home View */
              <>
                {!searchQuery && (
                  <>
                    {/* Mood Chips */}
                    <section>
                      <MoodChips onMoodSelect={handleMoodSelect} activeMood={activeMood} />
                    </section>

                    {/* Quick Picks */}
                    {videos.length > 0 && (
                      <section>
                        <QuickPicks videos={videos} />
                      </section>
                    )}

                    {/* Main Grid */}
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

      {/* Fullscreen Lyrics */}
      <FullscreenLyrics isOpen={showLyrics} onClose={() => setShowLyrics(false)} />

      {/* Player Bar */}
      <Player onLyricsOpen={() => setShowLyrics(true)} />
    </div>
  );
}
