/**
 * DJ Veida - Smart AI DJ that fetches real metadata from Wikipedia
 * Creates context-aware, varied announcements and doesn't talk every track
 * Supports personality modes: chill, hype, informative
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Video } from '@/types/music';

export type DJPersonality = 'chill' | 'hype' | 'informative';

// Personality-specific intros
const PERSONALITY_INTROS: Record<DJPersonality, Record<string, string[]>> = {
  chill: {
    happy: ["Smooth vibes coming your way...", "Easy breezy, here we go.", "Let this one wash over you."],
    sad: ["Let's slow it down...", "Feel this one out.", "Breathe and listen."],
    energetic: ["Nice groove incoming.", "This one moves, trust me.", "Catch this wave."],
    chill: ["Perfect chill energy.", "Float with this one...", "Easing into the zone."],
    nostalgic: ["Remember this feeling?", "Classic vibes.", "Timeless, isn't it?"],
    unknown: ["Here's something nice.", "Enjoy this one.", "Just vibes."],
  },
  hype: {
    happy: ["LET'S GOOO! 🔥", "THIS ONE SLAPS!", "PURE FIRE!"],
    sad: ["Even the sad ones HIT DIFFERENT!", "Feel it in your SOUL!", "EMOTIONAL BANGER!"],
    energetic: ["BANGER ALERT! 🚨", "TURN IT ALL THE WAY UP!", "WE'RE NOT STOPPING!"],
    chill: ["Don't sleep on this one!", "Smooth but it HITS!", "This is lowkey FLAMES!"],
    nostalgic: ["THROWBACK ENERGY!", "WHO REMEMBERS THIS?!", "ICONIC!"],
    unknown: ["YO CHECK THIS OUT!", "HERE WE GO!", "INCOMING!"],
  },
  informative: {
    happy: ["An uplifting track here.", "This has a positive composition.", "Bright tonality in this piece."],
    sad: ["A melancholic composition.", "Emotionally rich songwriting here.", "Note the minor key progression."],
    energetic: ["High BPM energy here.", "Dynamic arrangement on this track.", "Strong rhythmic foundation."],
    chill: ["Ambient textures in this one.", "Relaxed tempo and smooth production.", "Notice the layered harmonies."],
    nostalgic: ["A significant piece in music history.", "This track influenced many artists.", "Culturally important track."],
    unknown: ["Let me tell you about this track.", "Here's an interesting one.", "Worth knowing about."],
  },
};

const GENRE_FLAVOR: Record<string, Record<DJPersonality, string>> = {
  pop: { chill: "Smooth pop gem", hype: "POP PERFECTION!", informative: "A well-crafted pop track" },
  rock: { chill: "Solid rock vibes", hype: "ROCK AND ROLL BABY!", informative: "Classic rock composition" },
  hip: { chill: "Nice hip-hop flow", hype: "BARS ON BARS!", informative: "Notable hip-hop production" },
  rap: { chill: "Clean bars", hype: "STRAIGHT FIRE!", informative: "Lyrically dense rap track" },
  jazz: { chill: "Smooth jazz", hype: "JAZZ ENERGY!", informative: "Jazz-influenced arrangement" },
  electronic: { chill: "Electronic bliss", hype: "DROP INCOMING!", informative: "Electronic production showcase" },
  rnb: { chill: "Silky R&B", hype: "R&B HEAT!", informative: "R&B vocal performance" },
  indie: { chill: "Indie vibes", hype: "INDIE BANGER!", informative: "Independent music gem" },
  classical: { chill: "Timeless beauty", hype: "LEGENDARY PIECE!", informative: "Classical masterwork" },
  unknown: { chill: "Good stuff", hype: "ABSOLUTE FIRE!", informative: "An interesting selection" },
};

// Personality-specific fillers
const DJ_FILLERS: Record<DJPersonality, string[]> = {
  chill: [
    "DJ Veida keeping it mellow.",
    "Relax, we're just floating.",
    "Veida's chill zone. Stay a while.",
    "The vibes are immaculate right now.",
  ],
  hype: [
    "DJ VEIDA IN THE BUILDING!",
    "WE DON'T STOP! WE WON'T STOP!",
    "VEIDA'S PICKS, ZERO SKIPS!",
    "IF YOU'RE FEELING THIS, MAKE SOME NOISE!",
    "THE ENERGY IS UNMATCHED RIGHT NOW!",
  ],
  informative: [
    "DJ Veida, your music curator.",
    "Knowledge is power, and so is good music.",
    "Stay tuned for more musical insights.",
    "Veida's curated selection continues.",
  ],
};

const TRANSITIONS: Record<DJPersonality, string[]> = {
  chill: ["Smoothly moving on...", "Let's drift to this...", "Easy transition here."],
  hype: ["NOW SWITCH IT UP!", "KEEP THAT ENERGY!", "DON'T STOP!"],
  informative: ["Transitioning now to...", "Next in the queue...", "Moving to an interesting pick."],
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
  const [personality, setPersonality] = useState<DJPersonality>(() => {
    return (localStorage.getItem('cmusic_dj_personality') as DJPersonality) || 'chill';
  });

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const recognitionRef = useRef<any>(null);
  const lastAnnouncedRef = useRef<string>('');
  const metadataCache = useRef<Map<string, SongMetadata>>(new Map());
  const trackCountRef = useRef(0);
  const totalTracksRef = useRef(0);
  const personalityRef = useRef(personality);
  personalityRef.current = personality;

  useEffect(() => {
    localStorage.setItem('cmusic_dj_mode', isActive.toString());
  }, [isActive]);

  useEffect(() => {
    localStorage.setItem('cmusic_dj_personality', personality);
  }, [personality]);

  const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const shouldAnnounce = useCallback((): boolean => {
    trackCountRef.current++;
    if (totalTracksRef.current <= 1) return true;
    const threshold = 2 + Math.floor(Math.random() * 3);
    if (trackCountRef.current >= threshold) {
      trackCountRef.current = 0;
      return true;
    }
    return false;
  }, []);

  const fetchSongMetadata = useCallback(async (artist: string, title: string): Promise<SongMetadata | null> => {
    const cacheKey = `${artist}-${title}`.toLowerCase();
    if (metadataCache.current.has(cacheKey)) {
      return metadataCache.current.get(cacheKey)!;
    }

    setIsFetching(true);
    try {
      const searchQuery = encodeURIComponent(`${artist} ${title} song`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${searchQuery}&format=json&origin=*`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);
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

  const speak = useCallback((text: string, priority = false) => {
    if (!isActive && !priority) return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (priority) synth.cancel();

    const p = personalityRef.current;
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Personality-driven voice params
    if (p === 'hype') {
      utterance.rate = 1.15;
      utterance.pitch = 1.05;
      utterance.volume = 0.95;
    } else if (p === 'chill') {
      utterance.rate = 0.92;
      utterance.pitch = 0.88;
      utterance.volume = 0.8;
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 0.95;
      utterance.volume = 0.85;
    }

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

  const buildAnnouncement = useCallback((
    cleanTitle: string,
    cleanArtist: string,
    metadata: SongMetadata | null,
    isTransition: boolean
  ): string => {
    const p = personalityRef.current;
    const parts: string[] = [];

    if (isTransition && Math.random() > 0.4) {
      parts.push(random(TRANSITIONS[p]));
    }

    if (metadata && metadata.genre !== 'unknown') {
      const genreKey = Object.keys(GENRE_FLAVOR).find(g =>
        metadata.genre.toLowerCase().includes(g)
      ) || 'unknown';
      const flavorText = GENRE_FLAVOR[genreKey]?.[p] || GENRE_FLAVOR.unknown[p];
      const intros = PERSONALITY_INTROS[p][metadata.mood] || PERSONALITY_INTROS[p].unknown;

      const style = Math.floor(Math.random() * 5);

      switch (style) {
        case 0:
          parts.push(`${random(intros)} ${cleanTitle} by ${cleanArtist}.`);
          if (metadata.year !== 'unknown') parts.push(`Dropped in ${metadata.year}.`);
          if (metadata.chartPosition) parts.push(p === 'hype' ? 'This one CHARTED!' : 'This actually charted.');
          break;
        case 1:
          parts.push(`${flavorText}. Here's ${cleanTitle} by ${cleanArtist}.`);
          if (p === 'informative') {
            if (metadata.writer) parts.push(`Written by ${metadata.writer}.`);
            else if (metadata.producer) parts.push(`Produced by ${metadata.producer}.`);
          }
          break;
        case 2:
          parts.push(`${random(intros)} ${cleanTitle} by ${cleanArtist}.`);
          if (metadata.album !== 'unknown' && !metadata.album.includes(cleanTitle)) {
            parts.push(`From the album ${metadata.album}.`);
          }
          break;
        case 3:
          parts.push(`${cleanArtist}. ${cleanTitle}. ${flavorText}.`);
          break;
        case 4:
          if (p === 'informative' && metadata.description && metadata.description.length > 20) {
            const firstSentence = metadata.description.split('.')[0];
            parts.push(`Fun fact: ${firstSentence}.`);
            parts.push(`That's ${cleanTitle} by ${cleanArtist}.`);
          } else {
            parts.push(`${random(intros)} ${cleanTitle} by ${cleanArtist}.`);
          }
          break;
      }
    } else {
      const intros = PERSONALITY_INTROS[p].unknown;
      parts.push(`${random(intros)} ${cleanTitle} by ${cleanArtist}.`);
    }

    if (Math.random() < 0.15) {
      parts.push(random(DJ_FILLERS[p]));
    }

    return parts.join(' ');
  }, []);

  const announceTrack = useCallback(async (track: Video, isTransition = false) => {
    if (!isActive) return;

    const key = track.videoId;
    if (lastAnnouncedRef.current === key) return;
    lastAnnouncedRef.current = key;
    totalTracksRef.current++;

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

    const metadata = await fetchSongMetadata(cleanArtist, cleanTitle);
    const announcement = buildAnnouncement(cleanTitle, cleanArtist, metadata, isTransition);
    speak(announcement);
  }, [isActive, speak, fetchSongMetadata, buildAnnouncement, shouldAnnounce]);

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
    const p = personalityRef.current;
    if (command.match(/\b(skip|next|change)\b/)) {
      speak(p === 'hype' ? "NEXT ONE! LET'S GO!" : "Skipping! Let's see what's next.", true);
      optionsRef.current.onSkip?.();
    } else if (command.match(/\b(pause|stop|hold)\b/)) {
      speak(p === 'chill' ? "Taking a breather." : "Pausing the music.", true);
      optionsRef.current.onPause?.();
    } else if (command.match(/\b(play|resume|continue)\b/)) {
      const playMatch = command.match(/play\s+(.+)/);
      if (playMatch) {
        speak(`Searching for ${playMatch[1]}.`, true);
        optionsRef.current.onPlayRequest?.(playMatch[1]);
      } else {
        speak(p === 'hype' ? "WE'RE BACK!" : "Resuming!", true);
        optionsRef.current.onResume?.();
      }
    } else if (command.match(/what.*(play|song)/)) {
      speak("Check the screen for the current track info!", true);
    } else if (command.match(/(who are you|your name)/)) {
      speak("I'm DJ Veida. Your personal music companion. Voice, vibes, and variety.", true);
    } else if (command.match(/(chill|relax)/)) {
      setPersonality('chill');
      speak("Switching to chill mode. Let's keep it easy.", true);
    } else if (command.match(/(hype|energy|pump)/)) {
      setPersonality('hype');
      speak("HYPE MODE ACTIVATED! LET'S GO!", true);
    } else if (command.match(/(inform|teach|learn|fact)/)) {
      setPersonality('informative');
      speak("Switching to informative mode. I'll share some music knowledge.", true);
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
      const p = personalityRef.current;
      const intros: Record<DJPersonality, string> = {
        chill: "DJ Veida here. Let's keep it smooth.",
        hype: "DJ VEIDA IS IN THE BUILDING! LET'S GET THIS PARTY STARTED!",
        informative: "DJ Veida online. I'll be sharing music insights along the way.",
      };
      speak(intros[p], true);
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
    personality,
    setPersonality: (p: DJPersonality) => {
      setPersonality(p);
      localStorage.setItem('cmusic_dj_personality', p);
    },
    toggle,
    announceTrack,
    startListening,
    stopListening,
    speak,
    clearCache: () => metadataCache.current.clear(),
  };
}
