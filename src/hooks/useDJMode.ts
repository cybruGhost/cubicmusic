/**
 * DJ Mode hook - Smart DJ that actually KNOWS the music
 * Fetches real metadata from Wikipedia and creates context-aware announcements
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Video } from '@/types/music';

// Mood-based intros - now actually USED based on real data!
const MOOD_INTROS = {
  happy: ["This sunny vibe right here...", "Can't help but smile to this one!", "Pure joy incoming!"],
  sad: ["For the feels...", "This one hits different...", "Let it out with this one."],
  energetic: ["BANGER ALERT! 🚨", "TURN IT UP!", "Energy level: MAXIMUM!"],
  chill: ["Keep it smooth...", "Vibe mode: activated", "Just float with this one..."],
  nostalgic: ["Take it back...", "Throwback alert!", "Remember this one?"],
  unknown: ["Coming up next, we got", "Now playing", "Let's vibe to"]
};

const GENRE_FLAVOR = {
  pop: "Pure pop perfection",
  rock: "Rock solid classic",
  hip: "Real hip-hop vibes",
  rap: "Straight fire bars",
  jazz: "Smooth jazz energy",
  classical: "Timeless masterpiece",
  electronic: "Electronic excellence",
  rnb: "Smooth R&B sensation",
  soul: "Soulful vibes only",
  metal: "Heavy metal thunder",
  country: "Country roads calling",
  unknown: "Absolute banger"
};

interface DJModeOptions {
  onPlayRequest?: (query: string) => void;
  onSkip?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

interface SongMetadata {
  genre: string;
  year: string;
  album: string;
  description: string;
  mood: 'happy' | 'sad' | 'energetic' | 'chill' | 'nostalgic' | 'unknown';
  chartPosition?: string;
  writer?: string;
  producer?: string;
}

export function useDJMode(options: DJModeOptions = {}) {
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('cmusic_dj_mode') === 'true';
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const recognitionRef = useRef<any>(null);
  const lastAnnouncedRef = useRef<string>('');
  const metadataCache = useRef<Map<string, SongMetadata>>(new Map());

  // Persist DJ mode state
  useEffect(() => {
    localStorage.setItem('cmusic_dj_mode', isActive.toString());
  }, [isActive]);

  // Get a random element
  const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Fetch REAL metadata from Wikipedia
  const fetchSongMetadata = useCallback(async (artist: string, title: string): Promise<SongMetadata | null> => {
    const cacheKey = `${artist}-${title}`.toLowerCase();
    
    // Check cache first
    if (metadataCache.current.has(cacheKey)) {
      console.log('🎵 Cache hit for:', cacheKey);
      return metadataCache.current.get(cacheKey)!;
    }

    setIsFetching(true);
    
    try {
      // Clean up search terms
      const searchQuery = encodeURIComponent(`${artist} ${title} song`);
      
      // Search Wikipedia
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&format=json&origin=*`
      );
      const searchData = await searchRes.json();
      
      if (!searchData.query?.search?.length) {
        setIsFetching(false);
        return null;
      }

      const pageTitle = searchData.query.search[0].title;
      
      // Get page content
      const contentRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts|pageimages&exintro=true&explaintext=true&format=json&origin=*`
      );
      const contentData = await contentRes.json();
      
      const pages = contentData.query.pages;
      const pageId = Object.keys(pages)[0];
      const extract = pages[pageId].extract || '';

      // Parse metadata with regex (simple but effective)
      const genreMatch = extract.match(/(?:genre|style)[\s\-:]+([^\.]+)/i);
      const yearMatch = extract.match(/\b(19|20)\d{2}\b/);
      const albumMatch = extract.match(/(?:album|from the album)[\s\-:]+([^\.]+)/i);
      const chartMatch = extract.match(/(?:hit|chart|peak|number one|#1|billboard)/i);
      const writerMatch = extract.match(/(?:written by|writer)[\s\-:]+([^\.]+)/i);
      const producerMatch = extract.match(/(?:produced by|producer)[\s\-:]+([^\.]+)/i);

      // Detect mood from description and genre
      const fullText = extract.toLowerCase();
      let mood: SongMetadata['mood'] = 'unknown';
      
      if (fullText.match(/sad|heartbreak|emotional|tears|pain/)) mood = 'sad';
      else if (fullText.match(/happy|joy|uplifting|sunny|bright/)) mood = 'happy';
      else if (fullText.match(/dance|party|energy|banger|upbeat/)) mood = 'energetic';
      else if (fullText.match(/chill|smooth|relax|calm|peaceful/)) mood = 'chill';
      else if (fullText.match(/classic|retro|throwback|nostalgia/)) mood = 'nostalgic';

      const metadata: SongMetadata = {
        genre: genreMatch?.[1]?.trim() || 'unknown',
        year: yearMatch?.[0] || 'unknown',
        album: albumMatch?.[1]?.trim() || 'unknown',
        description: extract.split('.')[0] || '',
        mood,
        chartPosition: chartMatch ? 'charting hit' : undefined,
        writer: writerMatch?.[1]?.trim(),
        producer: producerMatch?.[1]?.trim()
      };

      // Cache it
      metadataCache.current.set(cacheKey, metadata);
      setIsFetching(false);
      return metadata;

    } catch (error) {
      console.error('Wikipedia fetch failed:', error);
      setIsFetching(false);
      return null;
    }
  }, []);

  // Speak text using browser TTS
  const speak = useCallback((text: string, priority = false) => {
    if (!isActive && !priority) return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    // Cancel only if priority, otherwise let current finish
    if (priority) {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Dynamic voice based on mood
    utterance.rate = text.includes('BANGER') ? 1.1 : 1.05;
    utterance.pitch = text.includes('sad') ? 0.9 : 0.95;
    utterance.volume = 0.85;

    // Try to use a good voice
    const voices = synth.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') && v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Queue if something is speaking and not priority
    if (synth.speaking && !priority) {
      setTimeout(() => synth.speak(utterance), 500);
    } else {
      synth.speak(utterance);
    }
  }, [isActive]);

  // Announce a track with REAL intelligence
  const announceTrack = useCallback(async (track: Video, isTransition = false) => {
    if (!isActive) return;

    const key = track.videoId;
    if (lastAnnouncedRef.current === key) return;
    lastAnnouncedRef.current = key;

    // Clean up title and artist
    const cleanTitle = track.title
      .replace(/\(Official.*?\)/gi, '')
      .replace(/\[Official.*?\]/gi, '')
      .replace(/\(Lyrics.*?\)/gi, '')
      .replace(/\[Lyrics.*?\]/gi, '')
      .replace(/\(Audio.*?\)/gi, '')
      .replace(/\[Audio.*?\]/gi, '')
      .replace(/ft\./gi, 'featuring')
      .replace(/feat\./gi, 'featuring')
      .trim();

    const cleanArtist = track.author
      .replace(/- Topic$/i, '')
      .replace(/VEVO$/i, '')
      .trim();

    // Fetch real metadata
    const metadata = await fetchSongMetadata(cleanArtist, cleanTitle);
    
    let announcement = '';

    if (metadata && metadata.genre !== 'unknown') {
      // Build a SMART announcement with real facts
      const genre = Object.keys(GENRE_FLAVOR).find(g => 
        metadata.genre.toLowerCase().includes(g)
      ) || 'unknown';
      
      const flavorText = GENRE_FLAVOR[genre as keyof typeof GENRE_FLAVOR] || GENRE_FLAVOR.unknown;
      const moodIntro = MOOD_INTROS[metadata.mood]?.[Math.floor(Math.random() * MOOD_INTROS[metadata.mood].length)] 
        || random(MOOD_INTROS.unknown);

      if (isTransition) {
        announcement = `That was a vibe! ${flavorText}. `;
        
        if (metadata.year !== 'unknown') {
          announcement += `Dropped in ${metadata.year}. `;
        }
        
        if (metadata.chartPosition) {
          announcement += `Actually hit the charts! `;
        }
        
        announcement += `${moodIntro} ${cleanTitle} by ${cleanArtist}.`;
        
        if (metadata.album !== 'unknown' && !metadata.album.includes(cleanTitle)) {
          announcement += ` From the album ${metadata.album}.`;
        }
      } else {
        announcement = `${moodIntro} ${cleanTitle} by ${cleanArtist}. `;
        
        if (metadata.year !== 'unknown') {
          announcement += `This ${metadata.year} ${genre} track `;
        } else {
          announcement += `This track `;
        }
        
        if (metadata.description) {
          announcement += `${metadata.description.toLowerCase()} `;
        }
        
        if (metadata.writer) {
          announcement += `Written by ${metadata.writer}. `;
        }
      }
    } else {
      // Fallback if no metadata
      announcement = isTransition 
        ? `Next up, ${cleanTitle} by ${cleanArtist}.`
        : `${random(MOOD_INTROS.unknown)} ${cleanTitle} by ${cleanArtist}.`;
    }

    speak(announcement);
  }, [isActive, speak, fetchSongMetadata]);

  // Voice command recognition (enhanced)
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0]?.[0]?.transcript?.toLowerCase().trim() || '';
      setLastCommand(transcript);
      handleCommand(transcript);
    };

    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const handleCommand = useCallback((command: string) => {
    // Better command matching
    if (command.match(/\b(skip|next|change)\b/)) {
      speak("Skipping to the next track!", true);
      optionsRef.current.onSkip?.();
    } else if (command.match(/\b(pause|stop|hold)\b/)) {
      speak("Pausing the music.", true);
      optionsRef.current.onPause?.();
    } else if (command.match(/\b(play|resume|continue)\b/)) {
      const playMatch = command.match(/play\s+(.+)/);
      if (playMatch) {
        const query = playMatch[1];
        speak(`Searching for ${query}`, true);
        optionsRef.current.onPlayRequest?.(query);
      } else {
        speak("Resuming playback!", true);
        optionsRef.current.onResume?.();
      }
    } else if (command.match(/what.*(play|song)/)) {
      speak("Check the screen for the current track info!", true);
    } else if (command.match(/(louder|volume up|turn up)/)) {
      speak("Turning it up!", true);
    } else if (command.match(/(quieter|volume down|turn down)/)) {
      speak("Bringing it down a notch.", true);
    } else if (command.match(/who.*(sing|artist)/)) {
      speak("Look at the display for artist info!", true);
    } else {
      speak(`I heard: ${command}. Try saying play, skip, or pause.`, true);
    }
  }, [speak]);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    const next = !isActive;
    setIsActive(next);
    if (next) {
      speak("DJ Cubic is now on the decks! Ready to drop some knowledge!", true);
    } else {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      lastAnnouncedRef.current = '';
    }
  }, [isActive, speak]);

  // Preload voices
  useEffect(() => {
    window.speechSynthesis?.getVoices();
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      try { recognitionRef.current?.stop(); } catch {}
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    isActive,
    isListening,
    isSpeaking,
    isFetching,
    lastCommand,
    toggle,
    announceTrack,
    startListening,
    stopListening,
    speak,
    clearCache: () => metadataCache.current.clear()
  };
}
