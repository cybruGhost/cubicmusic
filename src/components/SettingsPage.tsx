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
  Github
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
  UserSettings 
} from '@/lib/storage';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const QUICK_ARTISTS = [
  'Taylor Swift', 'Drake', 'The Weeknd', 'Billie Eilish', 
  'Ed Sheeran', 'Dua Lipa', 'Kendrick Lamar', 'Ariana Grande'
];

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [settings, setSettings] = useState<UserSettings>(getSettings());
  const [name, setName] = useState(getUsername() || '');
  const [selectedArtists, setSelectedArtists] = useState<string[]>(getPreferredArtists());

  const updateSettings = (updates: Partial<UserSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(updates);
  };

  const handleSaveName = () => {
    setUsername(name.trim());
    toast.success('Name updated');
  };

  const toggleArtist = (artist: string) => {
    const newArtists = selectedArtists.includes(artist)
      ? selectedArtists.filter(a => a !== artist)
      : [...selectedArtists, artist];
    setSelectedArtists(newArtists);
    setPreferredArtists(newArtists);
  };

  return (
    <div className="min-h-full space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Profile Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
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
                placeholder="Your name"
                className="flex-1"
              />
              <Button onClick={handleSaveName} size="sm">
                Save
              </Button>
            </div>
          </div>
        </motion.section>

        {/* Theme Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Appearance</h2>
          </div>
          
          <div className="space-y-6">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Dynamic Theme</Label>
                <p className="text-sm text-muted-foreground">
                  Adapts colors to album artwork
                </p>
              </div>
              <Switch
                checked={settings.theme === 'dynamic'}
                onCheckedChange={(checked) => 
                  updateSettings({ theme: checked ? 'dynamic' : 'dark' })
                }
              />
            </div>

            {settings.theme === 'dynamic' && (
              <div className="space-y-2">
                <Label>Theme Intensity</Label>
                <Slider
                  value={[settings.dynamicThemeIntensity * 100]}
                  onValueChange={([v]) => updateSettings({ dynamicThemeIntensity: v / 100 })}
                  max={100}
                  step={10}
                />
              </div>
            )}
          </div>
        </motion.section>

        {/* Playback Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Music2 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Playback</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Auto-play</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically play similar tracks
                </p>
              </div>
              <Switch
                checked={settings.autoPlay}
                onCheckedChange={(checked) => updateSettings({ autoPlay: checked })}
              />
            </div>

            <Separator className="bg-border/50" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Crossfade</Label>
                <p className="text-sm text-muted-foreground">
                  Smooth transitions between tracks
                </p>
              </div>
              <Switch
                checked={settings.crossfade}
                onCheckedChange={(checked) => updateSettings({ crossfade: checked })}
              />
            </div>

            <Separator className="bg-border/50" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">Show Lyrics</Label>
                <p className="text-sm text-muted-foreground">
                  Display lyrics when available
                </p>
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
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Recommendations</h2>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Select artists you like to personalize your feed
          </p>

          <div className="flex flex-wrap gap-2">
            {QUICK_ARTISTS.map((artist) => (
              <button
                key={artist}
                onClick={() => toggleArtist(artist)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm transition-all",
                  selectedArtists.includes(artist)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-accent"
                )}
              >
                {artist}
              </button>
            ))}
          </div>
        </motion.section>

        {/* Downloads Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
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
                {(['low', 'medium', 'high'] as const).map((quality) => (
                  <button
                    key={quality}
                    onClick={() => updateSettings({ downloadQuality: quality })}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm capitalize transition-all",
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
          </div>
        </motion.section>

        {/* About Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">About</h2>
          </div>
          
          <div className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              <span className="text-gradient font-bold">C-Music</span> is a modern music streaming experience.
            </p>
            <p className="text-muted-foreground">
              Created by <span className="text-primary font-medium">cybrughost</span>
            </p>
            <p className="text-muted-foreground">
              Version 1.0.0
            </p>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
