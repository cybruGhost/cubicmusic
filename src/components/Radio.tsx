// components/radio.tsx
import { useState, useEffect } from 'react';
import { Radio as RadioIcon, Play, Pause, SkipBack, SkipForward, Volume2, Heart, Shuffle, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function RadioPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState('Lo-Fi Beats');
  const [volume, setVolume] = useState(80);

  const stations = [
    { name: 'Lo-Fi Beats', genre: 'Chill', listeners: '1.2K' },
    { name: 'Hip Hop Radio', genre: 'Hip Hop', listeners: '3.4K' },
    { name: 'Pop Hits', genre: 'Pop', listeners: '5.6K' },
    { name: 'Electronic Vibes', genre: 'Electronic', listeners: '2.3K' },
    { name: 'Jazz Lounge', genre: 'Jazz', listeners: '890' },
    { name: 'Rock Classics', genre: 'Rock', listeners: '4.1K' },
    { name: 'R&B Soul', genre: 'R&B', listeners: '2.8K' },
    { name: 'Workout Mix', genre: 'Energy', listeners: '3.9K' },
  ];

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <RadioIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Radio</h1>
              <p className="text-muted-foreground">Stream music stations from around the world</p>
            </div>
          </div>
          
          {/* Search */}
          <div className="max-w-md">
            <Input
              placeholder="Search for radio stations..."
              className="bg-secondary/50 border-border/50"
            />
          </div>
        </div>

        {/* Now Playing */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/10"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">NOW PLAYING</p>
              <h2 className="text-xl font-bold text-foreground">{currentStation}</h2>
              <p className="text-muted-foreground">Live • 256kbps</p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Heart className="w-5 h-5" />
              </Button>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Listeners</p>
                <p className="text-foreground font-bold">2,456</p>
              </div>
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center justify-center gap-6 mb-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Shuffle className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <SkipBack className="w-6 h-6" />
            </Button>
            <Button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90"
              size="icon"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" />
              ) : (
                <Play className="w-8 h-8 ml-1" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <SkipForward className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Repeat className="w-5 h-5" />
            </Button>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(parseInt(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
            />
            <span className="text-sm text-muted-foreground min-w-[3ch]">{volume}%</span>
          </div>
        </motion.div>

        {/* Stations Grid */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Popular Stations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stations.map((station, index) => (
              <motion.button
                key={station.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setCurrentStation(station.name)}
                className={cn(
                  "p-4 rounded-xl text-left transition-all hover:scale-[1.02]",
                  currentStation === station.name
                    ? "bg-primary/10 border border-primary/20"
                    : "bg-secondary/30 hover:bg-secondary/50"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <RadioIcon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    {station.listeners} listeners
                  </span>
                </div>
                <h4 className="font-semibold text-foreground mb-1">{station.name}</h4>
                <p className="text-sm text-muted-foreground">{station.genre}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
