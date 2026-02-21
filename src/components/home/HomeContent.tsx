import { useState } from 'react';
import { MoodSection } from './MoodSection';
import { QuickPicksSection } from './QuickPicksSection';
import { PlaylistSection } from './PlaylistSection';
import { LongListensSection } from './LongListensSection';
import { CreateMixSection } from './CreateMixSection';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Mood-based mixes configuration
const MOOD_MIXES = {
  'Feel Good': [
    { title: 'Feel Good Mix 1', artists: ["One Voice Children's Choir", 'Pentatonix', 'Fia', 'Mat and Savanna Shaw'], query: 'feel good uplifting songs choir' },
    { title: 'Feel Good Mix 2', artists: ['Jake Scott', 'Freddie Long', 'Old Dominion', 'Michael Sanzone'], query: 'feel good country pop songs' },
    { title: 'Feel Good Mix 3', artists: ['Essence Of Worship', 'Alice Kimanzi', 'Sue Wachira', 'Israel Mbonyi'], query: 'feel good worship gospel songs' },
    { title: 'Feel Good Supermix', artists: ['Bonn', 'Don Diablo', 'ROZES', 'Thomas Jack'], query: 'feel good edm electronic upbeat' },
  ],
};

// All genre/playlist chip sections
const PLAYLIST_CHIPS = [
  {
    label: 'Feeling confident',
    playlists: [
      { title: 'Coffee Shop Indie', artists: ['Novo Amor', 'Hozier', 'The Favors', 'Fleet Foxes'], query: 'coffee shop indie music' },
      { title: 'A Happy Alternative', artists: ['Milky Chance', 'The Black Keys', 'Fitz and The Tantrums', 'Cage The Elephant'], query: 'happy alternative music' },
      { title: 'Pump-Up Pop', artists: ['Dua Lipa', 'Calvin Harris', 'The Chainsmokers', 'Justin Bieber'], query: 'pump up pop music workout' },
      { title: 'Boy, Bye', artists: ['Jhené Aiko', 'Halle', 'iyla', 'Keyshia Cole'], query: 'empowering r&b women songs' },
      { title: 'Rise Up!', artists: ['Josiah Queen', 'Brandon Lake', 'Forrest Frank', 'Seph Schlueter'], query: 'rise up christian worship songs' },
      { title: 'Indie Heatwave', artists: ['MGMT', 'Dayglow', 'Bombay Bicycle Club', 'Rex Orange County'], query: 'indie heatwave summer songs' },
      { title: 'Pop Kiss-Offs', artists: ['Tate McRae', 'Jenna Raine', 'Dylan', 'GAYLE'], query: 'pop breakup anthem songs' },
      { title: 'Into the light', artists: ['Andrew Ripp', 'Jamie MacDonald', 'Phil Wickham', 'CAIN'], query: 'christian light worship songs' },
      { title: 'Breezy Singer-Songwriter', artists: ['Vance Joy', 'Jack Johnson', 'Joy Oladokun', 'Colbie Caillat'], query: 'breezy acoustic singer songwriter' },
      { title: 'I Luh God', artists: ['Tasha Cobbs Leonard', 'Naomi Raine', 'Danny Gokey', 'Essential Worship'], query: 'gospel praise worship songs' },
    ],
  },
  {
    label: 'Feeling happy',
    playlists: [
      { title: 'Feel-Good Hip Hop and R&B', artists: ['Tyla', 'Tyler, The Creator', 'Drake', 'Doechii'], query: 'feel good hip hop r&b' },
      { title: 'Cloud Nine R&B', artists: ['Beyoncé', 'Chris Brown', 'Khalid', 'Normani'], query: 'cloud nine r&b smooth' },
      { title: 'Hairbrush Karaoke', artists: ['Taylor Swift', 'Dua Lipa', 'Ariana Grande', 'Olivia Rodrigo'], query: 'karaoke pop hits sing along' },
      { title: 'Good Vibes Only', artists: ['Taylor Swift', 'Charlie Puth', 'Meghan Trainor', 'Ariana Grande'], query: 'good vibes pop music happy' },
      { title: 'Windows-Down EDM', artists: ['Martin Garrix', 'ARTY', 'Tiësto', 'Adrian Lux'], query: 'edm driving music upbeat' },
      { title: 'Bubble Pop', artists: ['Dua Lipa', 'Taylor Swift', 'Sabrina Carpenter', 'Justin Bieber'], query: 'bubble pop music catchy' },
      { title: 'Wide Open Country', artists: ['Lainey Wilson', 'Billy Currington', 'Kenny Chesney', 'Tim McGraw'], query: 'wide open country music' },
      { title: 'The Happiest Pop Hits', artists: ['Katy Perry', 'Rihanna', 'Taylor Swift', 'Bruno Mars'], query: 'happiest pop hits dance' },
      { title: 'Rose-Colored Rhythm', artists: ['Wizkid', 'Amaarae', 'Tyla', 'Ayra Starr'], query: 'afrobeats feel good rhythm' },
    ],
  },
  {
    label: 'Kicking back',
    playlists: [
      { title: 'Biggest R&B Hits', artists: ['Chris Brown', 'SZA', 'Doja Cat', 'H.E.R.'], query: 'biggest r&b hits 2024' },
      { title: 'Country Summer', artists: ['Kenny Chesney', 'Luke Bryan', 'Luke Combs', 'Jordan Davis'], query: 'country summer songs' },
      { title: 'Slow Down', artists: ['Wizkid', 'Odeal', 'Burna Boy', 'Qing Madi'], query: 'slow afrobeats chill' },
      { title: 'Fun Family Hangout', artists: ['Dua Lipa', 'Encanto - Cast', 'Stephanie Beatriz', 'Miley Cyrus'], query: 'fun family songs disney pop' },
      { title: 'Kick-Back Country', artists: ['Zach Bryan', 'Thomas Rhett', 'Luke Combs', 'Chris Stapleton'], query: 'kick back country relaxing' },
      { title: 'Good Friends, Cheap Whiskey', artists: ['Luke Combs', 'Toby Keith', 'Hank Williams Jr.', 'Kip Moore'], query: 'country drinking songs' },
      { title: 'Rooftop Rock', artists: ['The Cure', 'Phoebe Bridgers', 'Spoon', 'Real Estate'], query: 'rooftop indie rock chill' },
      { title: 'Margaritaville', artists: ['Jimmy Buffett', 'Zac Brown Band', 'Kenny Chesney', 'Bob Marley'], query: 'beach vibes jimmy buffett style' },
      { title: 'Country beach hols', artists: ['Kenny Chesney', 'Luke Bryan', 'Zac Brown Band', 'Dierks Bentley'], query: 'country beach vacation songs' },
      { title: 'The Back Porch', artists: ['Muscadine Bloodline', 'Chris Stapleton', 'Zach Bryan', 'Kacey Musgraves'], query: 'country acoustic back porch' },
    ],
  },
  {
    label: 'Fun throwbacks',
    playlists: [
      { title: "Essential '00s R&B", artists: ['Usher', 'Beyoncé', 'Keyshia Cole', 'Chris Brown'], query: '2000s r&b hits essential' },
      { title: "The Hits: '00s", artists: ['Rihanna', 'Beyoncé', 'Usher', 'Eminem'], query: '2000s hits best songs' },
      { title: "The Hits: '90s", artists: ['Mariah Carey', 'Madonna', 'TLC', 'The Notorious B.I.G.'], query: '90s hits best songs' },
      { title: 'The Millennial Mixtape', artists: ['Eminem', 'Christina Aguilera', 'Britney Spears', 'Justin Timberlake'], query: 'millennial mixtape 2000s hits' },
      { title: 'Classic Country', artists: ['Merle Haggard', 'George Strait', 'Dolly Parton', 'Willie Nelson'], query: 'classic country legends' },
      { title: "'00s Pop-Rock Hits", artists: ['Avril Lavigne', 'Fall Out Boy', 'Coldplay', 'The Fray'], query: '2000s pop rock hits' },
      { title: "'00s Pop Hits", artists: ['Britney Spears', "P!nk", 'Rihanna', 'Christina Aguilera'], query: '2000s pop hits dance' },
      { title: 'Indie Sleaze', artists: ['LCD Soundsystem', 'Passion Pit', 'Crystal Castles', 'The Strokes'], query: 'indie sleaze 2000s electro' },
      { title: "'90s Country", artists: ['Alan Jackson', 'Brooks & Dunn', 'Tim McGraw', 'Shania Twain'], query: '90s country hits' },
      { title: "'10s Country", artists: ['Kelsea Ballerini', 'Kenny Chesney', 'Luke Bryan', 'Miranda Lambert'], query: '2010s country hits' },
    ],
  },
  {
    label: 'Feel-good Rock',
    playlists: [
      { title: "Feelin' Good in the 80s", artists: ["The B-52's", 'Kim Carnes', 'Nu Shooz', 'George Michael'], query: '80s feel good rock hits' },
      { title: 'Rock Klasik Jiwang', artists: ['XPDC', 'Search', 'Samudera', "U.K's"], query: 'malaysian rock ballads classic' },
      { title: 'Feel-Good Classic Rock', artists: ['Creedence Clearwater Revival', 'The Doobie Brothers', 'Tom Petty and the Heartbreakers', 'John Mellencamp'], query: 'feel good classic rock 70s' },
      { title: 'Thai Rock Love Songs', artists: ['Bodyslam', 'Big Ass', 'Loso', 'Potato'], query: 'thai rock love songs' },
      { title: 'Acoustic Guitar Favorites', artists: ['Nando Reis', 'Charlie Brown Jr.', 'Cássia Eller', 'Titãs'], query: 'acoustic guitar rock brazilian' },
      { title: 'Get Pumped: Rock Anthems', artists: ['AC/DC', 'The Offspring', 'Foo Fighters', 'Journey'], query: 'rock anthems pump up energy' },
      { title: 'Feel-Good Rock Hits', artists: ["Guns N' Roses", 'AC/DC', 'Dire Straits', 'Red Hot Chili Peppers'], query: 'feel good rock hits classic' },
      { title: 'Sing-Along Rock', artists: ['Elvis Presley', 'The Beatles', 'The Rolling Stones', 'Red Hot Chili Peppers'], query: 'sing along rock classics' },
    ],
  },
  {
    label: 'Feel-good Bollywood & Indian',
    playlists: [
      { title: 'Kollywood Sing-along', artists: ['Anirudh Ravichander', 'Dhanush', 'A. R. Rahman', 'Sivakarthikeyan'], query: 'kollywood tamil hit songs' },
      { title: "Feelin' Good: Bollywood", artists: ['Arijit Singh', 'Irshad Kamil', 'Amitabh Bhattacharya', 'Darshan Raval'], query: 'bollywood feel good songs' },
      { title: 'Easy Breezy Retro: Hindi', artists: ['Lata Mangeshkar', 'Kishore Kumar', 'Asha Bhosle', 'Amit Kumar'], query: 'retro hindi songs classic' },
      { title: 'Iconic Kollywood Hits', artists: ['Anirudh Ravichander', 'Dhanush', 'A. R. Rahman', 'Vijay'], query: 'tamil iconic hits' },
      { title: 'Punjabi Melodies', artists: ['B Praak', 'AP Dhillon', 'Diljit Dosanjh', 'Shinda Kahlon'], query: 'punjabi melodious songs' },
      { title: 'Feel Good Retro: Tamil', artists: ['SP Balasubrahmanyam', 'S. Janaki', 'Ilaiyaraaja', 'T. M. Soundararajan'], query: 'tamil retro classic songs' },
      { title: "Feelin' Good: Punjabi", artists: ['Karan Aujla', 'Diljit Dosanjh', 'Ikky', 'Garry Sandhu'], query: 'punjabi feel good songs' },
      { title: 'Bollywood Dance Hitlist', artists: ['Amitabh Bhattacharya', 'Shashwat Sachdev', 'Sachin-Jigar', 'Madhubanti Bagchi'], query: 'bollywood dance hits party' },
      { title: 'Bollywood Pick Me Up', artists: ['Badshah', 'Amitabh Bhattacharya', 'Diljit Dosanjh', 'Shilpa Rao'], query: 'bollywood upbeat pick me up' },
    ],
  },
];

interface HomeContentProps {
  onOpenChannel?: (artistName: string) => void;
  moodFilter?: string;
}

export function HomeContent({ onOpenChannel, moodFilter }: HomeContentProps) {
  const [activeChip, setActiveChip] = useState<string | null>(null);

  // Find the active chip's playlists
  const activeChipData = PLAYLIST_CHIPS.find(c => c.label === activeChip);

  return (
    <div className="space-y-10">
      {/* Mood-based section - Feel Good */}
      <MoodSection
        mood="Feel Good"
        mixes={MOOD_MIXES['Feel Good']}
        onOpenChannel={onOpenChannel}
      />

      {/* Quick Picks */}
      <QuickPicksSection onOpenChannel={onOpenChannel} />

      {/* Genre Chips - Scrollable row */}
      <section className="space-y-5">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {PLAYLIST_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => setActiveChip(activeChip === chip.label ? null : chip.label)}
              className={cn(
                "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border",
                activeChip === chip.label
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                  : "bg-secondary/60 text-foreground hover:bg-secondary border-border/50 hover:border-border"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Show selected chip's playlists */}
        <AnimatePresence mode="wait">
          {activeChipData ? (
            <motion.div
              key={activeChip}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PlaylistSection
                title={activeChipData.label}
                playlists={activeChipData.playlists}
                onOpenChannel={onOpenChannel}
              />
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-sm text-muted-foreground text-center py-4"
            >
              Select a genre above to explore playlists
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Long listens */}
      <LongListensSection onOpenChannel={onOpenChannel} />

      {/* Create a mix */}
      <CreateMixSection onOpenChannel={onOpenChannel} />
    </div>
  );
}
