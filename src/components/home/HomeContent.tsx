import { MoodSection } from './MoodSection';
import { QuickPicksSection } from './QuickPicksSection';
import { PlaylistSection } from './PlaylistSection';
import { LongListensSection } from './LongListensSection';
import { CreateMixSection } from './CreateMixSection';

// Mood-based mixes configuration
const MOOD_MIXES = {
  'Feel Good': [
    { title: 'Feel Good Mix 1', artists: ['One Voice Children\'s Choir', 'Pentatonix', 'Fia'], query: 'feel good uplifting songs choir' },
    { title: 'Feel Good Mix 2', artists: ['Jake Scott', 'Freddie Long', 'Old Dominion'], query: 'feel good country pop songs' },
    { title: 'Feel Good Mix 3', artists: ['Essence Of Worship', 'Alice Kimanzi', 'Sue Wachira'], query: 'feel good worship gospel songs' },
    { title: 'Feel Good Supermix', artists: ['Bonn', 'Don Diablo', 'ROZES', 'Thomas Jack'], query: 'feel good edm electronic upbeat' },
  ],
};

// Playlist sections configuration
const PLAYLIST_SECTIONS = {
  'Feeling confident': [
    { title: 'Coffee Shop Indie', artists: ['Novo Amor', 'Hozier', 'The Favors', 'Fleet Foxes'], query: 'coffee shop indie music' },
    { title: 'A Happy Alternative', artists: ['Milky Chance', 'The Black Keys', 'Fitz and The Tantrums'], query: 'happy alternative music' },
    { title: 'Pump-Up Pop', artists: ['Dua Lipa', 'Calvin Harris', 'The Chainsmokers'], query: 'pump up pop music workout' },
    { title: 'Boy, Bye', artists: ['Jhené Aiko', 'Halle', 'iyla', 'Keyshia Cole'], query: 'empowering r&b women songs' },
    { title: 'Rise Up!', artists: ['Josiah Queen', 'Brandon Lake', 'Forrest Frank'], query: 'rise up christian worship songs' },
    { title: 'Indie Heatwave', artists: ['MGMT', 'Dayglow', 'Bombay Bicycle Club'], query: 'indie heatwave summer songs' },
    { title: 'Pop Kiss-Offs', artists: ['Tate McRae', 'Jenna Raine', 'Dylan', 'GAYLE'], query: 'pop breakup anthem songs' },
    { title: 'Into the light', artists: ['Andrew Ripp', 'Jamie MacDonald', 'Phil Wickham'], query: 'christian light worship songs' },
    { title: 'Breezy Singer-Songwriter', artists: ['Vance Joy', 'Jack Johnson', 'Joy Oladokun'], query: 'breezy acoustic singer songwriter' },
    { title: 'I Luh God', artists: ['Tasha Cobbs Leonard', 'Naomi Raine', 'Danny Gokey'], query: 'gospel praise worship songs' },
  ],
  'Feeling happy': [
    { title: 'Feel-Good Hip Hop and R&B', artists: ['Tyla', 'Tyler, The Creator', 'Drake', 'Doechii'], query: 'feel good hip hop r&b' },
    { title: 'Cloud Nine R&B', artists: ['Beyoncé', 'Chris Brown', 'Khalid', 'Normani'], query: 'cloud nine r&b smooth' },
    { title: 'Hairbrush Karaoke', artists: ['Taylor Swift', 'Dua Lipa', 'Ariana Grande'], query: 'karaoke pop hits sing along' },
    { title: 'Good Vibes Only', artists: ['Taylor Swift', 'Charlie Puth', 'Meghan Trainor'], query: 'good vibes pop music happy' },
    { title: 'Windows-Down EDM', artists: ['Martin Garrix', 'ARTY', 'Tiësto', 'Adrian Lux'], query: 'edm driving music upbeat' },
    { title: 'Bubble Pop', artists: ['Dua Lipa', 'Taylor Swift', 'Sabrina Carpenter'], query: 'bubble pop music catchy' },
    { title: 'Wide Open Country', artists: ['Lainey Wilson', 'Billy Currington', 'Kenny Chesney'], query: 'wide open country music' },
    { title: 'The Happiest Pop Hits', artists: ['Katy Perry', 'Rihanna', 'Taylor Swift', 'Bruno Mars'], query: 'happiest pop hits dance' },
    { title: 'Rose-Colored Rhythm', artists: ['Wizkid', 'Amaarae', 'Tyla', 'Ayra Starr'], query: 'afrobeats feel good rhythm' },
  ],
  'Kicking back': [
    { title: 'Biggest R&B Hits', artists: ['Chris Brown', 'SZA', 'Doja Cat', 'H.E.R.'], query: 'biggest r&b hits 2024' },
    { title: 'Country Summer', artists: ['Kenny Chesney', 'Luke Bryan', 'Luke Combs'], query: 'country summer songs' },
    { title: 'Slow Down', artists: ['Wizkid', 'Odeal', 'Burna Boy', 'Qing Madi'], query: 'slow afrobeats chill' },
    { title: 'Fun Family Hangout', artists: ['Dua Lipa', 'Encanto - Cast', 'Miley Cyrus'], query: 'fun family songs disney pop' },
    { title: 'Kick-Back Country', artists: ['Zach Bryan', 'Thomas Rhett', 'Luke Combs'], query: 'kick back country relaxing' },
    { title: 'Good Friends, Cheap Whiskey', artists: ['Luke Combs', 'Toby Keith', 'Hank Williams Jr.'], query: 'country drinking songs' },
    { title: 'Rooftop Rock', artists: ['The Cure', 'Phoebe Bridgers', 'Spoon', 'Real Estate'], query: 'rooftop indie rock chill' },
    { title: 'Margaritaville', artists: ['Jimmy Buffett', 'Zac Brown Band', 'Kenny Chesney'], query: 'beach vibes jimmy buffett style' },
    { title: 'Country beach hols', artists: ['Kenny Chesney', 'Luke Bryan', 'Zac Brown Band'], query: 'country beach vacation songs' },
    { title: 'The Back Porch', artists: ['Muscadine Bloodline', 'Chris Stapleton', 'Zach Bryan'], query: 'country acoustic back porch' },
  ],
  'Fun throwbacks': [
    { title: "Essential '00s R&B", artists: ['Usher', 'Beyoncé', 'Keyshia Cole', 'Chris Brown'], query: '2000s r&b hits essential' },
    { title: "The Hits: '00s", artists: ['Rihanna', 'Beyoncé', 'Usher', 'Eminem'], query: '2000s hits best songs' },
    { title: "The Hits: '90s", artists: ['Mariah Carey', 'Madonna', 'TLC', 'The Notorious B.I.G.'], query: '90s hits best songs' },
    { title: 'The Millennial Mixtape', artists: ['Eminem', 'Christina Aguilera', 'Britney Spears'], query: 'millennial mixtape 2000s hits' },
    { title: 'Classic Country', artists: ['Merle Haggard', 'George Strait', 'Dolly Parton'], query: 'classic country legends' },
    { title: "'00s Pop-Rock Hits", artists: ['Avril Lavigne', 'Fall Out Boy', 'Coldplay', 'The Fray'], query: '2000s pop rock hits' },
    { title: "'00s Pop Hits", artists: ['Britney Spears', 'P!nk', 'Rihanna', 'Christina Aguilera'], query: '2000s pop hits dance' },
    { title: 'Indie Sleaze', artists: ['LCD Soundsystem', 'Passion Pit', 'Crystal Castles'], query: 'indie sleaze 2000s electro' },
    { title: "'90s Country", artists: ['Alan Jackson', "Brooks & Dunn", 'Tim McGraw', 'Shania Twain'], query: '90s country hits' },
    { title: "'10s Country", artists: ['Kelsea Ballerini', 'Kenny Chesney', 'Luke Bryan'], query: '2010s country hits' },
  ],
  'Feel-good Rock': [
    { title: "Feelin' Good in the 80s", artists: ["The B-52's", 'Kim Carnes', 'Nu Shooz', 'George Michael'], query: '80s feel good rock hits' },
    { title: 'Rock Klasik Jiwang', artists: ['XPDC', 'Search', 'Samudera', "U.K's"], query: 'malaysian rock ballads classic' },
    { title: 'Feel-Good Classic Rock', artists: ['CCR', 'The Doobie Brothers', 'Tom Petty'], query: 'feel good classic rock 70s' },
    { title: 'Thai Rock Love Songs', artists: ['Bodyslam', 'Big Ass', 'Loso', 'Potato'], query: 'thai rock love songs' },
    { title: 'Acoustic Guitar Favorites', artists: ['Nando Reis', 'Charlie Brown Jr.', 'Cássia Eller'], query: 'acoustic guitar rock brazilian' },
    { title: 'Get Pumped: Rock Anthems', artists: ['AC/DC', 'The Offspring', 'Foo Fighters', 'Journey'], query: 'rock anthems pump up energy' },
    { title: 'Feel-Good Rock Hits', artists: ["Guns N' Roses", 'AC/DC', 'Dire Straits', 'RHCP'], query: 'feel good rock hits classic' },
    { title: 'Sing-Along Rock', artists: ['Elvis Presley', 'The Beatles', 'The Rolling Stones'], query: 'sing along rock classics' },
  ],
  'Feel-good Bollywood & Indian': [
    { title: 'Kollywood Sing-along', artists: ['Anirudh Ravichander', 'Dhanush', 'A. R. Rahman'], query: 'kollywood tamil hit songs' },
    { title: "Feelin' Good: Bollywood", artists: ['Arijit Singh', 'Irshad Kamil', 'Darshan Raval'], query: 'bollywood feel good songs' },
    { title: 'Easy Breezy Retro: Hindi', artists: ['Lata Mangeshkar', 'Kishore Kumar', 'Asha Bhosle'], query: 'retro hindi songs classic' },
    { title: 'Iconic Kollywood Hits', artists: ['Anirudh Ravichander', 'Dhanush', 'A. R. Rahman', 'Vijay'], query: 'tamil iconic hits' },
    { title: 'Punjabi Melodies', artists: ['B Praak', 'AP Dhillon', 'Diljit Dosanjh'], query: 'punjabi melodious songs' },
    { title: 'Feel Good Retro: Tamil', artists: ['SP Balasubrahmanyam', 'S. Janaki', 'Ilaiyaraaja'], query: 'tamil retro classic songs' },
    { title: "Feelin' Good: Punjabi", artists: ['Karan Aujla', 'Diljit Dosanjh', 'Ikky'], query: 'punjabi feel good songs' },
    { title: 'Bollywood Dance Hitlist', artists: ['Amitabh Bhattacharya', 'Shashwat Sachdev', 'Sachin-Jigar'], query: 'bollywood dance hits party' },
    { title: 'Bollywood Pick Me Up', artists: ['Badshah', 'Amitabh Bhattacharya', 'Diljit Dosanjh'], query: 'bollywood upbeat pick me up' },
  ],
};

interface HomeContentProps {
  onOpenChannel?: (artistName: string) => void;
  moodFilter?: string;
}

export function HomeContent({ onOpenChannel, moodFilter }: HomeContentProps) {
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

      {/* Feeling confident */}
      <PlaylistSection
        title="Feeling confident"
        playlists={PLAYLIST_SECTIONS['Feeling confident']}
        onOpenChannel={onOpenChannel}
      />

      {/* Feeling happy */}
      <PlaylistSection
        title="Feeling happy"
        playlists={PLAYLIST_SECTIONS['Feeling happy']}
        onOpenChannel={onOpenChannel}
      />

      {/* Kicking back */}
      <PlaylistSection
        title="Kicking back"
        playlists={PLAYLIST_SECTIONS['Kicking back']}
        onOpenChannel={onOpenChannel}
      />

      {/* Fun throwbacks */}
      <PlaylistSection
        title="Fun throwbacks"
        playlists={PLAYLIST_SECTIONS['Fun throwbacks']}
        onOpenChannel={onOpenChannel}
      />

      {/* Long listens */}
      <LongListensSection onOpenChannel={onOpenChannel} />

      {/* Feel-good Rock */}
      <PlaylistSection
        title="Feel-good Rock"
        playlists={PLAYLIST_SECTIONS['Feel-good Rock']}
        onOpenChannel={onOpenChannel}
      />

      {/* Feel-good Bollywood & Indian */}
      <PlaylistSection
        title="Feel-good Bollywood & Indian"
        playlists={PLAYLIST_SECTIONS['Feel-good Bollywood & Indian']}
        onOpenChannel={onOpenChannel}
      />

      {/* Create a mix */}
      <CreateMixSection onOpenChannel={onOpenChannel} />
    </div>
  );
}
