/**
 * DJ Mode hook - Auto-announces tracks using browser TTS
 * and accepts voice commands via SpeechRecognition.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Video } from '@/types/music';

const DJ_INTROS = [
  "Coming up next, we got",
  "And now, let's vibe to",
  "Keep it rolling with",
  "Dropping this one for you,",
  "Let's turn it up with",
  "Here's a banger for you,",
  "Mixing it smooth, now playing",
  "This one's fire,",
  "DJ Cubic on the decks, bringing you",
  "Let's keep the energy going with",
];

const DJ_TRANSITIONS = [
  "That was a vibe! Now let's switch it up.",
  "Hope you felt that one. Let's keep moving.",
  "What a track! Ready for the next one?",
  "The playlist is heating up!",
  "We're just getting started!",
];

interface DJModeOptions {
  onPlayRequest?: (query: string) => void;
  onSkip?: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export function useDJMode(options: DJModeOptions = {}) {
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem('cmusic_dj_mode') === 'true';
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastCommand, setLastCommand] = useState('');

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const recognitionRef = useRef<any>(null);
  const utteranceQueueRef = useRef<string[]>([]);
  const speakingRef = useRef(false);
  const lastAnnouncedRef = useRef<string>('');

  // Persist DJ mode state
  useEffect(() => {
    localStorage.setItem('cmusic_dj_mode', isActive.toString());
  }, [isActive]);

  // Get a random element
  const random = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  // Speak text using browser TTS
  const speak = useCallback((text: string, priority = false) => {
    if (!isActive && !priority) return;

    const synth = window.speechSynthesis;
    if (!synth) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95;
    utterance.volume = 0.8;

    // Try to use a good voice
    const voices = synth.getVoices();
    const preferred = voices.find(v =>
      v.name.includes('Google') && v.lang.startsWith('en')
    ) || voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { speakingRef.current = true; setIsSpeaking(true); };
    utterance.onend = () => { speakingRef.current = false; setIsSpeaking(false); };
    utterance.onerror = () => { speakingRef.current = false; setIsSpeaking(false); };

    synth.cancel(); // Cancel any ongoing speech
    synth.speak(utterance);
  }, [isActive]);

  // Announce a track
  const announceTrack = useCallback((track: Video, isTransition = false) => {
    if (!isActive) return;

    const key = track.videoId;
    if (lastAnnouncedRef.current === key) return;
    lastAnnouncedRef.current = key;

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

    let announcement = '';
    if (isTransition) {
      announcement = `${random(DJ_TRANSITIONS)} ${random(DJ_INTROS)} ${cleanTitle} by ${cleanArtist}`;
    } else {
      announcement = `${random(DJ_INTROS)} ${cleanTitle} by ${cleanArtist}`;
    }

    speak(announcement);
  }, [isActive, speak]);

  // Voice command recognition
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
    if (command.includes('skip') || command.includes('next')) {
      speak("Skipping to next track!", true);
      optionsRef.current.onSkip?.();
    } else if (command.includes('pause') || command.includes('stop')) {
      speak("Pausing the music.", true);
      optionsRef.current.onPause?.();
    } else if (command.includes('play') || command.includes('resume')) {
      const playMatch = command.match(/play\s+(.+)/);
      if (playMatch) {
        const query = playMatch[1];
        speak(`Searching for ${query}`, true);
        optionsRef.current.onPlayRequest?.(query);
      } else {
        speak("Resuming playback!", true);
        optionsRef.current.onResume?.();
      }
    } else if (command.includes('what') && (command.includes('playing') || command.includes('song'))) {
      speak("Check the screen for the current track info!", true);
    } else if (command.includes('louder') || command.includes('volume up')) {
      speak("Turning it up!", true);
    } else if (command.includes('quieter') || command.includes('volume down')) {
      speak("Bringing it down a notch.", true);
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
      speak("DJ Cubic is now on the decks! Let's go!", true);
    } else {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      lastAnnouncedRef.current = '';
    }
  }, [isActive, speak]);

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
    lastCommand,
    toggle,
    announceTrack,
    startListening,
    stopListening,
    speak,
  };
}
