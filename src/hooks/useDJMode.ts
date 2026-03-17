/**
 * DJ Veida - Smart AI DJ that fetches real metadata from Wikipedia
 * Creates context-aware, varied announcements and doesn't talk every track
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Video } from '@/types/music';

// Mood-based intros
const MOOD_INTROS: Record<string, string[]> = {
  happy: [
    "This sunny vibe right here...",
    "Can't help but smile to this one!",
    "Pure joy incoming!",
    "Happiness in audio form!",
    "Good vibes only with this track.",
  ],
  sad: [
    "For the feels...",
    "This one hits different...",
    "Let it out with this one.",
    "Grab the tissues for this one.",
    "Mood: melancholy. Let's sit with it.",
  ],
  energetic: [
    "BANGER ALERT! 🚨",
    "TURN IT UP!",
    "Energy level: MAXIMUM!",
    "This one's gonna get you moving!",
    "Buckle up, this slaps HARD.",
  ],
  chill: [
    "Keep it smooth...",
    "Vibe mode: activated.",
    "Just float with this one...",
    "Ease into this groove.",
    "Smooth sailing from here.",
  ],
  nostalgic: [
    "Take it back...",
    "Throwback alert!",
    "Remember this one?",
    "A classic that never gets old.",
    "Nostalgia hitting hard right now.",
  ],
  unknown: [
    "Coming up next, we got",
    "Now playing",
    "Let's vibe to",
    "Check this out.",
    "Here's something for you.",
  ],
};

const GENRE_FLAVOR: Record<string, string> = {
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
  indie: "Indie gem right here",
  latin: "Latin heat",
  reggae: "Island riddims",
  blues: "Deep blues feeling",
  punk: "Punk energy unleashed",
  folk: "Folk storytelling at its finest",
  unknown: "Absolute banger",
};

// Fun facts / filler DJ talk (used between songs randomly)
const DJ_FILLERS = [
  "DJ Veida keeping the vibes alive.",
  "You're locked in with DJ Veida. Don't touch that dial.",
  "This is your girl Veida, and the music don't stop.",
  "The playlist is curated, the mood is set. Let's go.",
  "DJ Veida here, mixing feelings and frequencies.",
  "Stay with me, we're just getting started.",
  "If you're feeling this, you've got good taste.",
  "Veida's picks, zero skips. That's the motto.",
];

// Transition phrases between tracks
const TRANSITIONS = [
  "Alright, switching gears.",
  "Now let me take you somewhere different.",
  "Ooh, this next one though...",
  "Keep that energy going with this.",
  "Seamless transition into this beauty.",
  "And just like that, we flow into...",
  "Hold on, this one's special.",
];

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
  mood: string;
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
  const trackCountRef = useRef(0); // tracks since last announcement
  const totalTracksRef = useRef(0);

  useEffect(() => {
    localStorage.setItem('cmusic_dj_mode', isActive.toString());
  }, [isActive]);

  const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Should DJ Veida talk this time? Randomized - not every track
  const shouldAnnounce = useCallback((): boolean => {
    trackCountRef.current++;
    // Always announce first track
    if (totalTracksRef.current <= 1) return true;
    // Announce roughly every 2-4 tracks
    const threshold = 2 + Math.floor(Math.random() * 3); // 2, 3, or 4
    if (trackCountRef.current >= threshold) {
      trackCountRef.current = 0;
      return true;
    }
    return false;
  }, []);

  // Fetch REAL metadata from Wikipedia
  const fetchSongMetadata = useCallback(async (artist: string, title: string): Promise<SongMetadata | null> => {
    const cacheKey = `${artist}-${title}`.toLowerCase();
    if (metadataCache.current.has(cacheKey)) {
      return metadataCache.current.get(cacheKey)!;
    }

    setIsFetching(true);
    try {
      const searchQuery = encodeURIComponent(`${artist} ${title} song`);
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&format=json&origin=*`
      );
      const searchData = await searchRes.json();

      if (!searchData.query?.search?.length) {
        setIsFetching(false);
        return null;
      }

      const pageTitle = searchData.query.search[0].title;
      const contentRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts&exintro=true&explaintext=true&format=json&origin=*`
      );
      const contentData = await contentRes.json();
      const pages = contentData.query.pages;
      const pageId = Object.keys(pages)[0];
      const extract = pages[pageId].extract || '';

      const genreMatch = extract.match(/(?:genre|style)[\s\-:]+([^\.]+)/i);
      const yearMatch = extract.match(/\b(19|20)\d{2}\b/);
      const albumMatch = extract.match(/(?:album|from the album)[\s\-:]+([^\.]+)/i);
      const chartMatch = extract.match(/(?:hit|chart|peak|number one|#1|billboard|top\s?\d)/i);
      const writerMatch = extract.match(/(?:written by|songwriter|writer)[\s\-:]+([^\.]+)/i);
      const producerMatch = extract.match(/(?:produced by|producer)[\s\-:]+([^\.]+)/i);

      const fullText = extract.toLowerCase();
      let mood = 'unknown';
      if (fullText.match(/sad|heartbreak|emotional|tears|pain|loss|grief/)) mood = 'sad';
      else if (fullText.match(/happy|joy|uplifting|sunny|bright|celebrate|fun/)) mood = 'happy';
      else if (fullText.match(/dance|party|energy|banger|upbeat|club|hype/)) mood = 'energetic';
      else if (fullText.match(/chill|smooth|relax|calm|peaceful|ambient|mellow/)) mood = 'chill';
      else if (fullText.match(/classic|retro|throwback|nostalgia|remember|iconic/)) mood = 'nostalgic';

      const metadata: SongMetadata = {
        genre: genreMatch?.[1]?.trim() || 'unknown',
        year: yearMatch?.[0] || 'unknown',
        album: albumMatch?.[1]?.trim() || 'unknown',
        description: extract.split('.').slice(0, 2).join('.') || '',
        mood,
        chartPosition: chartMatch ? 'charting hit' : undefined,
        writer: writerMatch?.[1]?.trim(),
        producer: producerMatch?.[1]?.trim(),
      };

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

    if (priority) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = text.includes('BANGER') || text.includes('TURN IT UP') ? 1.12 : 1.0;
    utterance.pitch = text.includes('sad') || text.includes('feels') ? 0.85 : 0.95;
    utterance.volume = 0.85;

    const voices = synth.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    if (synth.speaking && !priority) {
      setTimeout(() => synth.speak(utterance), 500);
    } else {
      synth.speak(utterance);
    }
  }, [isActive]);

  // Build a rich, varied announcement
  const buildAnnouncement = useCallback((
    cleanTitle: string,
    cleanArtist: string,
    metadata: SongMetadata | null,
    isTransition: boolean
  ): string => {
    const parts: string[] = [];

    // Sometimes lead with a transition phrase
    if (isTransition && Math.random() > 0.4) {
      parts.push(random(TRANSITIONS));
    }

    if (metadata && metadata.genre !== 'unknown') {
      const genreKey = Object.keys(GENRE_FLAVOR).find(g =>
        metadata.genre.toLowerCase().includes(g)
      ) || 'unknown';
      const flavorText = GENRE_FLAVOR[genreKey];
      const moodIntros = MOOD_INTROS[metadata.mood] || MOOD_INTROS.unknown;

      // Randomly pick an announcement style (variety!)
      const style = Math.floor(Math.random() * 5);

      switch (style) {
        case 0: // Mood + title + fact
          parts.push(`${random(moodIntros)} ${cleanTitle} by ${cleanArtist}.`);
          if (metadata.year !== 'unknown') parts.push(`Dropped in ${metadata.year}.`);
          if (metadata.chartPosition) parts.push(`This one actually charted!`);
          break;

        case 1: // Genre flavor + trivia
          parts.push(`${flavorText}. Here's ${cleanTitle} by ${cleanArtist}.`);
          if (metadata.writer) parts.push(`Written by ${metadata.writer}.`);
          else if (metadata.producer) parts.push(`Produced by ${metadata.producer}.`);
          break;

        case 2: // Album shoutout
          parts.push(`${random(moodIntros)} ${cleanTitle} by ${cleanArtist}.`);
          if (metadata.album !== 'unknown' && !metadata.album.includes(cleanTitle)) {
            parts.push(`From the album ${metadata.album}.`);
          }
          if (metadata.year !== 'unknown') parts.push(`Year: ${metadata.year}.`);
          break;

        case 3: // Short & punchy
          parts.push(`${cleanArtist}. ${cleanTitle}. ${flavorText}. Let's go.`);
          break;

        case 4: // Wikipedia description lead
          if (metadata.description && metadata.description.length > 20) {
            // Use first sentence of wiki
            const firstSentence = metadata.description.split('.')[0];
            parts.push(`Fun fact: ${firstSentence}.`);
            parts.push(`That's ${cleanTitle} by ${cleanArtist}.`);
          } else {
            parts.push(`${random(moodIntros)} ${cleanTitle} by ${cleanArtist}.`);
          }
          break;
      }
    } else {
      // No metadata - keep it simple
      parts.push(`${random(MOOD_INTROS.unknown)} ${cleanTitle} by ${cleanArtist}.`);
    }

    // Randomly add a DJ filler at the end (~20% chance)
    if (Math.random() < 0.2) {
      parts.push(random(DJ_FILLERS));
    }

    return parts.join(' ');
  }, []);

  // Announce a track with REAL intelligence
  const announceTrack = useCallback(async (track: Video, isTransition = false) => {
    if (!isActive) return;

    const key = track.videoId;
    if (lastAnnouncedRef.current === key) return;
    lastAnnouncedRef.current = key;
    totalTracksRef.current++;

    // Decide if we should talk this time
    if (!shouldAnnounce()) return;

    const cleanTitle = track.title
      .replace(/\(Official.*?\)/gi, '')
      .replace(/\[Official.*?\]/gi, '')
      .replace(/\(Lyrics.*?\)/gi, '')
      .replace(/\[Lyrics.*?\]/gi, '')
      .replace(/\(Audio.*?\)/gi, '')
      .replace(/\[Audio.*?\]/gi, '')
      .replace(/\(Music Video.*?\)/gi, '')
      .replace(/\[Music Video.*?\]/gi, '')
      .replace(/ft\./gi, 'featuring')
      .replace(/feat\./gi, 'featuring')
      .replace(/\|.*$/g, '')
      .trim();

    const cleanArtist = track.author
      .replace(/- Topic$/i, '')
      .replace(/VEVO$/i, '')
      .replace(/Official$/i, '')
      .trim();

    // Fetch metadata (async, cached)
    const metadata = await fetchSongMetadata(cleanArtist, cleanTitle);
    const announcement = buildAnnouncement(cleanTitle, cleanArtist, metadata, isTransition);
    speak(announcement);
  }, [isActive, speak, fetchSongMetadata, buildAnnouncement, shouldAnnounce]);

  // Voice commands
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
    if (command.match(/\b(skip|next|change)\b/)) {
      speak("Skipping! Let's see what's next.", true);
      optionsRef.current.onSkip?.();
    } else if (command.match(/\b(pause|stop|hold)\b/)) {
      speak("Pausing the music. Say resume when you're ready.", true);
      optionsRef.current.onPause?.();
    } else if (command.match(/\b(play|resume|continue)\b/)) {
      const playMatch = command.match(/play\s+(.+)/);
      if (playMatch) {
        speak(`Searching for ${playMatch[1]}. One sec.`, true);
        optionsRef.current.onPlayRequest?.(playMatch[1]);
      } else {
        speak("Resuming! Let's keep the vibe going.", true);
        optionsRef.current.onResume?.();
      }
    } else if (command.match(/what.*(play|song)/)) {
      speak("Check the screen for the current track info!", true);
    } else if (command.match(/(louder|volume up|turn up)/)) {
      speak("Turning it up!", true);
    } else if (command.match(/(quieter|volume down|turn down)/)) {
      speak("Bringing it down.", true);
    } else if (command.match(/(who are you|your name)/)) {
      speak("I'm DJ Veida. Your personal music companion. Voice, vibes, and variety.", true);
    } else {
      speak(`Hmm, I heard ${command}. Try saying play, skip, or pause.`, true);
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
      trackCountRef.current = 0;
      totalTracksRef.current = 0;
      speak("DJ Veida is on the decks! Let's get this party started.", true);
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
    clearCache: () => metadataCache.current.clear(),
  };
}
