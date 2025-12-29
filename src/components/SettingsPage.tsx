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
  VolumeX
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
  setPreferredArtists,
  addPreferredArtist,
  removePreferredArtist,
  clearUserData,
  getStats,
  getDownloads,
  clearHistory,
  getPersonalizedGreeting,
  getRecommendationWeights,
  exportPreferences,
  UserSettings,
  ArtistData
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
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [name, setName] = useState(getUsername() || '');
  const [selectedArtists, setSelectedArtists] = useState<ArtistData[]>(getPreferredArtists());
  const [editingArtist, setEditingArtist] = useState<string | null>(null);
  const [newArtistName, setNewArtistName] = useState('');
  const [isAddingArtist, setIsAddingArtist] = useState(false);
  const [stats, setStats] = useState(getStats());
  const [downloads, setDownloads] = useState(getDownloads());
  const [greeting] = useState(getPersonalizedGreeting());
  const [recommendationWeights] = useState(getRecommendationWeights());

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getStats());
      setDownloads(getDownloads());
      setSelectedArtists(getPreferredArtists());
    }, 5000);

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

    const artistExists = selectedArtists.some(a => a.name.toLowerCase() === newArtistName.toLowerCase());
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
    toast.success(`Added ${newArtistName}`);
  };

  const handleRemoveArtist = (artistName: string) => {
    removePreferredArtist(artistName);
    setSelectedArtists(getPreferredArtists());
    toast.success(`Removed ${artistName}`);
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
    if (confirm('Are you sure you want to clear your listening history?')) {
      clearHistory();
      setStats(getStats());
      toast.success('History cleared');
    }
  };

  const handleClearAllData = () => {
    if (confirm('Are you sure you want to clear ALL your data? This cannot be undone!')) {
      clearUserData();
      setSettings(getSettings());
      setSelectedArtists([]);
      setName('');
      setStats(getStats());
      toast.success('All data cleared');
    }
  };

  const handleExportData = () => {
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
    toast.success('Preferences exported');
  };

  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate and apply imported data
      if (data.username) setUsername(data.username);
      if (data.preferredArtists) setPreferredArtists(data.preferredArtists);
      if (data.settings) saveSettings(data.settings);
      
      // Refresh all data
      setName(getUsername() || '');
      setSelectedArtists(getPreferredArtists());
      setSettings(getSettings());
      
      toast.success('Preferences imported successfully');
    } catch (error) {
      toast.error('Failed to import preferences');
    }

    // Reset file input
    event.target.value = '';
  };

  const handleResetSettings = () => {
    if (confirm('Reset all settings to default?')) {
      saveSettings({
        theme: 'dynamic',
        dynamicThemeIntensity: 0.5,
        autoPlay: true,
        crossfade: false,
        showLyrics: true,
        downloadQuality: 'high',
        recommendationAlgorithm: 'personalized',
        defaultQuickPickMode: 'mashup'
      });
      setSettings(getSettings());
      toast.success('Settings reset to default');
    }
  };

  const downloadCount = downloads.length;
  const totalPlayTime = Math.floor(stats.totalPlays * 3.5); // Average 3.5 minutes per song
  const hours = Math.floor(totalPlayTime / 60);
  const minutes = totalPlayTime % 60;

  return (
    <div className="min-h-full space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">{greeting}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleResetSettings}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset Defaults
        </Button>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Stats Overview */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Your Stats</h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Updated just now
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{stats.totalPlays}</div>
              <div className="text-sm text-muted-foreground">Total Plays</div>
            </div>
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{hours}h {minutes}m</div>
              <div className="text-sm text-muted-foreground">Listening Time</div>
            </div>
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{selectedArtists.length}</div>
              <div className="text-sm text-muted-foreground">Favorite Artists</div>
            </div>
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">{downloadCount}</div>
              <div className="text-sm text-muted-foreground">Downloads</div>
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
              />
              <Button onClick={handleSaveName} size="sm" className="gap-2">
                <Save className="w-4 h-4" />
                Save
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              This name appears in your personalized greetings
            </p>
          </div>
        </motion.section>

        {/* Theme Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>
          
          <div className="space-y-6">
            {/* Theme Selection */}
            <div>
              <Label className="text-foreground mb-2 block">Theme</Label>
              <div className="flex gap-2">
                {(['dynamic', 'dark', 'light'] as ThemeMode[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSettings({ theme })}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg text-sm capitalize transition-all flex items-center justify-center gap-2",
                      settings.theme === theme
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-accent"
                    )}
                  >
                    {theme === 'dynamic' && <Sparkles className="w-4 h-4" />}
                    {theme === 'dark' && <Moon className="w-4 h-4" />}
                    {theme === 'light' && <Sun className="w-4 h-4" />}
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            {settings.theme === 'dynamic' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Dynamic Intensity</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(settings.dynamicThemeIntensity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[settings.dynamicThemeIntensity * 100]}
                  onValueChange={([v]) => updateSettings({ dynamicThemeIntensity: v / 100 })}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Adjusts how strongly the theme adapts to album artwork
                </p>
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
          <div className="flex items-center gap-3 mb-4">
            <Music2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Playback</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-foreground">Auto-play</Label>
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

            <Separator className="bg-border/50" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-foreground">Crossfade</Label>
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

            <Separator className="bg-border/50" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <VolumeX className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-foreground">Show Lyrics</Label>
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

        {/* Algorithm Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Recommendations</h2>
          </div>
          
          <div className="space-y-6">
            {/* Algorithm Preference */}
            <div>
              <Label className="text-foreground mb-2 block">Recommendation Style</Label>
              <div className="flex gap-2">
                {(['personalized', 'mixed', 'exploration'] as RecommendationAlgorithm[]).map((algo) => (
                  <button
                    key={algo}
                    onClick={() => updateSettings({ recommendationAlgorithm: algo })}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg text-sm capitalize transition-all",
                      settings.recommendationAlgorithm === algo
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-accent"
                    )}
                  >
                    {algo === 'personalized' && 'Personalized'}
                    {algo === 'mixed' && 'Mixed'}
                    {algo === 'exploration' && 'Discovery'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Current weights: Artists ({Math.round(recommendationWeights.artistWeight * 100)}%), 
                History ({Math.round(recommendationWeights.historyWeight * 100)}%), 
                Stats ({Math.round(recommendationWeights.statsWeight * 100)}%)
              </p>
            </div>

            <Separator className="bg-border/50" />

            {/* Quick Picks Mode */}
            <div>
              <Label className="text-foreground mb-2 block">Quick Picks Default</Label>
              <div className="flex gap-2">
                {(['mashup', 'last-played', 'most-played'] as QuickPickMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updateSettings({ defaultQuickPickMode: mode })}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg text-sm capitalize transition-all",
                      settings.defaultQuickPickMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-accent"
                    )}
                  >
                    {mode === 'mashup' && '🎲 Mashup'}
                    {mode === 'last-played' && '▶ Last Played'}
                    {mode === 'most-played' && '🔁 Most Played'}
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Favorite Artists */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Label className="text-foreground">Favorite Artists</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedArtists.length} artists selected
                  </p>
                </div>
                <div className="flex gap-2">
                  {selectedArtists.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAllArtists}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      Clear All
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingArtist(true)}
                    className="gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Add Artist Input */}
              {isAddingArtist && (
                <div className="flex gap-2 mb-3">
                  <Input
                    value={newArtistName}
                    onChange={(e) => setNewArtistName(e.target.value)}
                    placeholder="Enter artist name"
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddArtist()}
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
              {selectedArtists.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Heart className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No artists selected yet</p>
                  <p className="text-sm">Add artists to personalize your recommendations</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedArtists.map((artist) => (
                    <div
                      key={artist.name}
                      className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                    >
                      <div>
                        <div className="font-medium">{artist.name}</div>
                        {artist.genre && artist.genre !== 'Artist' && (
                          <div className="text-xs text-muted-foreground">{artist.genre}</div>
                        )}
                        {artist.playCount && artist.playCount > 0 && (
                          <div className="text-xs text-primary">
                            {artist.playCount} play{artist.playCount !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveArtist(artist.name)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
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
          <div className="flex items-center gap-3 mb-4">
            <Download className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Downloads</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label className="text-foreground">Download Quality</Label>
              <div className="flex gap-2 mt-2">
                {(['low', 'medium', 'high'] as DownloadQuality[]).map((quality) => (
                  <button
                    key={quality}
                    onClick={() => updateSettings({ downloadQuality: quality })}
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg text-sm capitalize transition-all",
                      settings.downloadQuality === quality
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-accent"
                    )}
                  >
                    {quality}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {downloadCount} tracks downloaded
              </p>
            </div>
          </div>
        </motion.section>

        {/* Data Management Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass rounded-2xl p-6 border border-destructive/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold text-destructive">Data Management</h2>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleClearHistory}
                className="justify-start gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear History
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportData}
                className="justify-start gap-2"
              >
                <Download className="w-4 h-4" />
                Export Data
              </Button>
              
              <Button
                variant="outline"
                onClick={() => document.getElementById('import-data')?.click()}
                className="justify-start gap-2"
              >
                <Upload className="w-4 h-4" />
                Import Data
              </Button>
              
              <Button
                variant="destructive"
                onClick={handleClearAllData}
                className="justify-start gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All Data
              </Button>
            </div>
            
            <input
              id="import-data"
              type="file"
              accept=".json"
              onChange={handleImportData}
              className="hidden"
            />
            
            <p className="text-xs text-muted-foreground">
              ⚠️ Clearing all data will remove your preferences, history, and favorites.
            </p>
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">About</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gradient">C-Music</h3>
              <p className="text-sm text-muted-foreground">
                A modern music streaming experience with personalized recommendations.
              </p>
            </div>
            
            <Separator className="bg-border/50" />
            
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">Created by</div>
                  <div className="text-primary font-semibold">cybrughost</div>
                </div>
              </div>
            </div>
            
            <Separator className="bg-border/50" />
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">Dec 2024</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storage Used</span>
                <span className="font-medium">
                  {Math.round((selectedArtists.length + downloads.length + stats.totalPlays) / 100)} KB
                </span>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open('https://github.com/cybrughost', '_blank')}
            >
              <Github className="w-4 h-4" />
              GitHub Profile
            </Button>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

// Add missing import for Upload icon
import { Upload } from 'lucide-react';
