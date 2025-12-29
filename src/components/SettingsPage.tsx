import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Palette, 
  Music2, 
  Download, 
  User, 
  Sparkles,
  Volume2,
  Moon,
  Sun,
  Heart,
  Github,
  Save,
  X,
  Plus,
  Search,
  Check,
  Trash2,
  AlertCircle,
  RefreshCw,
  Smartphone,
  VolumeX,
  Upload,
  Play,
  Clock,
  BarChart3,
  Music,
  Radio,
  Settings as SettingsIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  getSettings, 
  saveSettings, 
  getUsername, 
  setUsername, 
  getPreferredArtists,
  addPreferredArtist,
  removePreferredArtist,
  setPreferredArtists,
  clearUserData,
  getStats,
  getDownloads,
  clearHistory,
  getPersonalizedGreeting,
  getRecommendationWeights,
  exportPreferences,
  UserSettings,
  ArtistData,
  getHistory,
  getFavorites
} from '@/lib/storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SettingsPageProps {
  onBack: () => void;
}

type RecommendationAlgorithm = 'personalized' | 'mixed' | 'exploration';
type QuickPickMode = 'mashup' | 'last-played' | 'most-played';
type ThemeMode = 'dynamic' | 'dark' | 'light';
type DownloadQuality = 'low' | 'medium' | 'high';

export function SettingsPage({ onBack }: SettingsPageProps) {
  // Load all data from storage
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [name, setName] = useState(getUsername() || '');
  const [selectedArtists, setSelectedArtists] = useState<ArtistData[]>(getPreferredArtists());
  const [newArtistName, setNewArtistName] = useState('');
  const [isAddingArtist, setIsAddingArtist] = useState(false);
  const [stats, setStats] = useState(getStats());
  const [downloads, setDownloads] = useState(getDownloads());
  const [greeting] = useState(getPersonalizedGreeting());
  const [recommendationWeights, setRecommendationWeights] = useState(getRecommendationWeights());
  const [history, setHistory] = useState(getHistory());
  const [favorites, setFavorites] = useState(getFavorites());

  // Refresh data when settings change
  useEffect(() => {
    const updatedSettings = getSettings();
    setSettings(updatedSettings);
    setRecommendationWeights(getRecommendationWeights());
  }, [settings]);

  // Refresh other data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getStats());
      setDownloads(getDownloads());
      setSelectedArtists(getPreferredArtists());
      setHistory(getHistory());
      setFavorites(getFavorites());
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const updateSettings = (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(updates);
    toast.success('Settings updated');
  };

  const handleSaveName = () => {
    if (name.trim()) {
      setUsername(name.trim());
      toast.success('Name updated');
    } else {
      toast.error('Name cannot be empty');
    }
  };

  const handleAddArtist = () => {
    if (!newArtistName.trim()) {
      toast.error('Please enter an artist name');
      return;
    }

    const artistExists = selectedArtists.some(a => 
      a.name.toLowerCase() === newArtistName.toLowerCase().trim()
    );
    
    if (artistExists) {
      toast.error('Artist already exists');
      return;
    }

    const newArtist: ArtistData = {
      name: newArtistName.trim(),
      genre: 'Artist',
      selectedAt: Date.now(),
      playCount: 0
    };

    addPreferredArtist(newArtist);
    setSelectedArtists(getPreferredArtists());
    setNewArtistName('');
    setIsAddingArtist(false);
    toast.success(`Added "${newArtistName.trim()}"`);
  };

  const handleRemoveArtist = (artistName: string) => {
    removePreferredArtist(artistName);
    setSelectedArtists(getPreferredArtists());
    toast.success(`Removed "${artistName}"`);
  };

  const handleClearAllArtists = () => {
    if (selectedArtists.length === 0) {
      toast.info('No artists to clear');
      return;
    }

    if (confirm(`Are you sure you want to remove all ${selectedArtists.length} artists?`)) {
      setPreferredArtists([]);
      setSelectedArtists([]);
      toast.success('All artists cleared');
    }
  };

  const handleClearHistory = () => {
    if (history.length === 0) {
      toast.info('No history to clear');
      return;
    }

    if (confirm('Are you sure you want to clear your listening history?')) {
      clearHistory();
      setHistory(getHistory());
      setStats(getStats());
      toast.success('History cleared');
    }
  };

  const handleClearAllData = () => {
    if (confirm('⚠️ ARE YOU SURE?\n\nThis will delete ALL your data:\n• Favorite artists\n• Listening history\n• Play counts\n• Settings\n• Username\n\nThis action cannot be undone!')) {
      clearUserData();
      setSettings(getSettings());
      setSelectedArtists([]);
      setName('');
      setStats(getStats());
      setDownloads([]);
      setHistory([]);
      setFavorites([]);
      toast.success('All data cleared. Page will refresh.');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleExportData = () => {
    try {
      const data = exportPreferences();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `c-music-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Backup exported successfully');
    } catch (error) {
      toast.error('Failed to export backup');
    }
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm('Import will overwrite your current settings. Continue?')) {
      event.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate and apply imported data
      if (data.username && typeof data.username === 'string') {
        setUsername(data.username);
        setName(data.username);
      }
      
      if (data.preferredArtists && Array.isArray(data.preferredArtists)) {
        setPreferredArtists(data.preferredArtists);
        setSelectedArtists(data.preferredArtists);
      }
      
      if (data.settings && typeof data.settings === 'object') {
        saveSettings(data.settings);
        setSettings(getSettings());
      }
      
      toast.success('Backup imported successfully');
    } catch (error) {
      toast.error('Invalid backup file format');
    }

    event.target.value = '';
  };

  const handleResetSettings = () => {
    if (confirm('Reset all settings to default values?')) {
      const defaultSettings: UserSettings = {
        theme: 'dynamic',
        dynamicThemeIntensity: 0.5,
        autoPlay: true,
        crossfade: false,
        showLyrics: true,
        downloadQuality: 'high',
        recommendationAlgorithm: 'personalized',
        defaultQuickPickMode: 'mashup'
      };
      
      saveSettings(defaultSettings);
      setSettings(defaultSettings);
      toast.success('Settings reset to default');
    }
  };

  // Calculate stats
  const downloadCount = downloads.length;
  const favoriteCount = favorites.length;
  const historyCount = history.length;
  const artistCount = selectedArtists.length;
  const totalPlays = stats.totalPlays;
  
  // Calculate listening time (assuming 3.5 minutes per song)
  const totalMinutes = Math.floor(totalPlays * 3.5);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return (
    <div className="min-h-full space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <SettingsIcon className="w-6 h-6 text-primary" />
              Settings
            </h1>
            <p className="text-sm text-muted-foreground">{greeting}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExportData}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetSettings}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Stats Overview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Your Music Stats</h2>
            </div>
            <div className="text-xs text-muted-foreground px-3 py-1 bg-primary/10 rounded-full">
              Live
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-4 h-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{totalPlays}</div>
              </div>
              <div className="text-sm text-muted-foreground">Total Plays</div>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{hours}h {minutes}m</div>
              </div>
              <div className="text-sm text-muted-foreground">Listening Time</div>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-4 h-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{artistCount}</div>
              </div>
              <div className="text-sm text-muted-foreground">Favorite Artists</div>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Download className="w-4 h-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{downloadCount}</div>
              </div>
              <div className="text-sm text-muted-foreground">Downloads</div>
            </div>
          </div>

          <Separator className="my-6 bg-border/50" />

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Music className="w-4 h-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{favoriteCount}</div>
              </div>
              <div className="text-sm text-muted-foreground">Favorite Songs</div>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-4 h-4 text-primary" />
                <div className="text-2xl font-bold text-primary">{historyCount}</div>
              </div>
              <div className="text-sm text-muted-foreground">Recent Plays</div>
            </div>
          </div>
        </motion.section>

        {/* Profile Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
              <Button 
                onClick={handleSaveName} 
                size="sm" 
                className="gap-2"
                disabled={!name.trim()}
              >
                <Save className="w-4 h-4" />
                Save
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Your name appears in greetings and personalization
            </p>
          </div>
        </motion.section>

        {/* Appearance Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>
          
          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <Label className="text-foreground mb-3 block">Theme Mode</Label>
              <div className="flex gap-2">
                {(['dynamic', 'dark', 'light'] as ThemeMode[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSettings({ theme })}
                    className={cn(
                      "flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all flex flex-col items-center justify-center gap-2",
                      settings.theme === theme
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-accent"
                    )}
                  >
                    {theme === 'dynamic' && <Sparkles className="w-5 h-5" />}
                    {theme === 'dark' && <Moon className="w-5 h-5" />}
                    {theme === 'light' && <Sun className="w-5 h-5" />}
                    <span className="capitalize">{theme}</span>
                  </button>
                ))}
              </div>
            </div>

            {settings.theme === 'dynamic' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-foreground">Dynamic Intensity</Label>
                    <p className="text-sm text-muted-foreground">
                      How strongly colors adapt to album art
                    </p>
                  </div>
                  <span className="text-sm font-medium text-primary">
                    {Math.round(settings.dynamicThemeIntensity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.dynamicThemeIntensity * 100]}
                  onValueChange={([v]) => updateSettings({ dynamicThemeIntensity: v / 100 })}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Subtle</span>
                  <span>Vibrant</span>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Playback Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Music2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Playback</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <Label className="text-foreground cursor-pointer">Auto-play</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically play similar tracks
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.autoPlay}
                onCheckedChange={(checked) => updateSettings({ autoPlay: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <Label className="text-foreground cursor-pointer">Crossfade</Label>
                  <p className="text-sm text-muted-foreground">
                    Smooth transitions between tracks
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.crossfade}
                onCheckedChange={(checked) => updateSettings({ crossfade: checked })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <VolumeX className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <Label className="text-foreground cursor-pointer">Show Lyrics</Label>
                  <p className="text-sm text-muted-foreground">
                    Display lyrics when available
                  </p>
                </div>
              </div>
              <Switch
                checked={settings.showLyrics}
                onCheckedChange={(checked) => updateSettings({ showLyrics: checked })}
              />
            </div>
          </div>
        </motion.section>

        {/* Recommendations Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Recommendations</h2>
          </div>
          
          <div className="space-y-6">
            {/* Algorithm Preference */}
            <div className="space-y-3">
              <Label className="text-foreground">Recommendation Style</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'personalized', label: 'Personalized', desc: 'Based on your taste' },
                  { value: 'mixed', label: 'Mixed', desc: 'Balance of favorites & new' },
                  { value: 'exploration', label: 'Discovery', desc: 'Find new artists' }
                ] as const).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => updateSettings({ recommendationAlgorithm: value })}
                    className={cn(
                      "p-3 rounded-lg text-sm transition-all flex flex-col items-center text-center",
                      settings.recommendationAlgorithm === value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-accent"
                    )}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-xs opacity-80 mt-1">{desc}</span>
                  </button>
                ))}
              </div>
              
              {/* Current Weights */}
              <div className="bg-primary/5 rounded-lg p-3 mt-2">
                <div className="text-xs text-muted-foreground mb-1">Current weights:</div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <div className="font-medium text-primary">Artists</div>
                    <div>{Math.round(recommendationWeights.artistWeight * 100)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-primary">History</div>
                    <div>{Math.round(recommendationWeights.historyWeight * 100)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-primary">Stats</div>
                    <div>{Math.round(recommendationWeights.statsWeight * 100)}%</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-primary">Explore</div>
                    <div>{Math.round(recommendationWeights.explorationWeight * 100)}%</div>
                  </div>
                </div>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Quick Picks Mode */}
            <div className="space-y-3">
              <Label className="text-foreground">Quick Picks Default</Label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'mashup', label: '🎲 Mashup', desc: 'Smart mix' },
                  { value: 'last-played', label: '▶ Last Played', desc: 'Recently played' },
                  { value: 'most-played', label: '🔁 Most Played', desc: 'Your favorites' }
                ] as const).map(({ value, label, desc }) => (
                  <button
                    key={value}
                    onClick={() => updateSettings({ defaultQuickPickMode: value })}
                    className={cn(
                      "p-3 rounded-lg text-sm transition-all flex flex-col items-center text-center",
                      settings.defaultQuickPickMode === value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-accent"
                    )}
                  >
                    <span className="font-medium">{label}</span>
                    <span className="text-xs opacity-80 mt-1">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Favorite Artists */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Favorite Artists</Label>
                  <p className="text-sm text-muted-foreground">
                    {artistCount} artist{artistCount !== 1 ? 's' : ''} selected
                  </p>
                </div>
                <div className="flex gap-2">
                  {artistCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllArtists}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8"
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingArtist(true)}
                    className="h-8 gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Artist
                  </Button>
                </div>
              </div>

              {/* Add Artist Input */}
              {isAddingArtist && (
                <div className="flex gap-2">
                  <Input
                    value={newArtistName}
                    onChange={(e) => setNewArtistName(e.target.value)}
                    placeholder="Enter artist name"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddArtist()}
                    autoFocus
                  />
                  <Button onClick={handleAddArtist} size="sm">
                    Add
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingArtist(false);
                      setNewArtistName('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {/* Artists List */}
              {artistCount === 0 ? (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                  <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No favorite artists yet</p>
                  <p className="text-sm mt-1">Add artists to personalize your experience</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {selectedArtists.map((artist) => (
                    <div
                      key={artist.name}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{artist.name}</div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {artist.genre && artist.genre !== 'Artist' && (
                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                              {artist.genre}
                            </span>
                          )}
                          {artist.playCount && artist.playCount > 0 && (
                            <span>{artist.playCount} play{artist.playCount !== 1 ? 's' : ''}</span>
                          )}
                          {artist.selectedAt && (
                            <span>
                              Added {new Date(artist.selectedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArtist(artist.name)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Downloads Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Downloads</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-foreground mb-3 block">Download Quality</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as DownloadQuality[]).map((quality) => (
                  <button
                    key={quality}
                    onClick={() => updateSettings({ downloadQuality: quality })}
                    className={cn(
                      "p-3 rounded-lg text-sm font-medium capitalize transition-all",
                      settings.downloadQuality === quality
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-accent"
                    )}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Storage Info</div>
                  <div className="text-xs text-muted-foreground">
                    {downloadCount} track{downloadCount !== 1 ? 's' : ''} downloaded
                  </div>
                </div>
                <div className="text-sm font-medium text-primary">
                  ~{Math.round(downloadCount * 5)} MB
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Data Management */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-6 border border-destructive/20 bg-destructive/5"
        >
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">Data Management</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Manage your data and preferences. Be careful with destructive actions.
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleClearHistory}
                className="justify-start gap-2 h-auto py-3"
                disabled={historyCount === 0}
              >
                <Trash2 className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Clear History</div>
                  <div className="text-xs text-muted-foreground">{historyCount} items</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportData}
                className="justify-start gap-2 h-auto py-3"
              >
                <Download className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Export Data</div>
                  <div className="text-xs text-muted-foreground">Backup to file</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                onClick={() => document.getElementById('import-data')?.click()}
                className="justify-start gap-2 h-auto py-3"
              >
                <Upload className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Import Data</div>
                  <div className="text-xs text-muted-foreground">Restore from backup</div>
                </div>
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleClearAllData}
                className="justify-start gap-2 h-auto py-3"
              >
                <Trash2 className="w-4 h-4" />
                <div className="text-left">
                  <div className="font-medium">Clear All Data</div>
                  <div className="text-xs">⚠️ Irreversible</div>
                </div>
              </Button>
            </div>
            
            <input
              id="import-data"
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
            
            <div className="text-xs text-destructive/80 bg-destructive/10 p-3 rounded-lg">
              ⚠️ Warning: Clearing all data will permanently delete your preferences, 
              history, favorites, and statistics. This action cannot be undone.
            </div>
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">About C-Music</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Music2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-bold text-gradient text-lg">C-Music</h3>
                <p className="text-sm text-muted-foreground">
                  Modern music streaming with AI-powered recommendations
                </p>
              </div>
            </div>
            
            <Separator className="bg-border/50" />
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Data Size</span>
                <span className="font-medium">
                  ~{Math.round((artistCount + downloadCount + totalPlays) / 100)} KB
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="font-medium">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
            
            <Separator className="bg-border/50" />
            
            <div className="space-y-2">
              <div className="font-medium">Created by</div>
              <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-primary">cybrughost</div>
                  <div className="text-sm text-muted-foreground">Developer & Designer</div>
                </div>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full gap-2 mt-4"
              onClick={() => window.open('https://github.com/cybrughost', '_blank')}
            >
              <Github className="w-4 h-4" />
              View GitHub Profile
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
