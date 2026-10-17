import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Song from '@/models/Song';

const SEED_CHOIR_SONGS = [
  {
    title: 'En Uyirana Yesu',
    tamilTitle: 'என் உயிரான இயேசு',
    originalKey: 'D',
    tempo: 68,
    timeSignature: '4/4',
    category: 'Worship',
    lyrics: `En uyiraana Yesu en uyirode kalantheere
En uyiraana Yesu en uyirode kalantheere
Ennai vittu vilagatha nesare
Ennai maravadha theivame

(Chorus)
Yesuvey en uyiraanavarey
Yesuvey en anbaanavarey`,
    tamilLyrics: `என் உயிரான இயேசு என் உயிரோடு கலந்தீரே
என் உயிரான இயேசு என் உயிரோடு கலந்தீரே
என்னை விட்டு விலகாத நேசரே
என்னை மறவாத தெய்வமே

(பல்லவி)
இயேசுவே என் உயிரானவரே
இயேசுவே என் அன்பானவரே`,
    chords: `[Intro]
D  Bm  G  A

[Verse]
D               Bm
En uyiraana Yesu
G                  A
En uyirode kalantheere
D               Bm
En uyiraana Yesu
G                  A
En uyirode kalantheere`,
    assignedDate: 'Sunday Setlist'
  },
  {
    title: 'Nanriyodu Naan Thuthi Paaduven',
    tamilTitle: 'நன்றியோடு நான் துதி பாடுவேன்',
    originalKey: 'G',
    tempo: 112,
    timeSignature: '4/4',
    category: 'Praise',
    lyrics: `Nanriyodu naan thuthi paaduven
Enthan Yesuvae periyavarae
Enthan kanmalai aadavarey
Ennai thaangidum nesarey

(Chorus)
Aaraathanai aaraathanai
En anbaana Yesuvey umakkey`,
    tamilLyrics: `நன்றியோடு நான் துதி பாடுவேன்
எந்தன் இயேசுவே பெரியவரே
எந்தன் கன்மலை ஆனவரே
என்னை தாங்கிடும் நேசரே

(பல்லவி)
ஆராதனை ஆராதனை
என் அன்பான இயேசுவே உமக்கே`,
    chords: `[Verse]
G               Em
Nanriyodu naan thuthi paaduven
C               D
Enthan Yesuvae periyavarae
G               Em
Enthan kanmalai aadavarey
C               D
Ennai thaangidum nesarey`,
    assignedDate: 'Sunday Setlist'
  },
  {
    title: 'How Great Thou Art',
    tamilTitle: 'எவ்வளவு பெரியவர்',
    originalKey: 'C',
    tempo: 76,
    timeSignature: '4/4',
    category: 'Tamil Hymn',
    lyrics: `O Lord my God, when I in awesome wonder
Consider all the worlds Thy Hands have made
I see the stars, I hear the rolling thunder
Thy power throughout the universe displayed

(Chorus)
Then sings my soul, My Saviour God, to Thee
How great Thou art, how great Thou art
Then sings my soul, My Saviour God, to Thee
How great Thou art, how great Thou art!`,
    tamilLyrics: `என் ஆத்துமாவே தேவனைத் துதி
அவர் செய்த நன்மைகள் மறவாதே
எவ்வளவு பெரியவர் என் ஆண்டவர்
அவர் நாமம் மகிமைப்படுவதாக`,
    chords: `[Verse]
C                    F
O Lord my God, when I in awesome wonder
C                    G         C
Consider all the worlds Thy Hands have made

[Chorus]
C              F         C
Then sings my soul, My Saviour God, to Thee
Dm         G7              C
How great Thou art, how great Thou art`,
    assignedDate: 'Sunday Setlist'
  },
  {
    title: 'Way Maker',
    tamilTitle: 'வழி திறப்பவரே',
    originalKey: 'E',
    tempo: 68,
    timeSignature: '4/4',
    category: 'Worship',
    lyrics: `You are here, moving in our midst
I worship You, I worship You
You are here, working in this place
I worship You, I worship You

(Chorus)
Way maker, miracle worker, promise keeper
Light in the darkness, my God, that is who You are!`,
    tamilLyrics: `வழி திறப்பவரே அற்புதம் செய்பவரே
வாக்குத்தத்தம் காப்பவரே
இருளின் வெளிச்சமே என் தேவனே
நீரே என் தெய்வமே!`,
    chords: `[Chorus]
E               B
Way maker, miracle worker
C#m             A
Light in the darkness, my God that is who You are`,
    assignedDate: 'Sunday Setlist'
  }
];

export async function GET() {
  try {
    await dbConnect();
    let songs = await Song.find().sort({ createdAt: -1 }).lean();

    // If no songs yet, auto-seed with standard church worship repertoire
    if (songs.length === 0) {
      await Song.insertMany(SEED_CHOIR_SONGS);
      songs = await Song.find().sort({ createdAt: -1 }).lean();
    }

    return NextResponse.json({ songs });
  } catch (error: any) {
    console.error('Error fetching choir songs:', error);
    return NextResponse.json({ error: 'Failed to fetch choir songs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { title, tamilTitle, originalKey, tempo, timeSignature, category, lyrics, tamilLyrics, chords, youtubeUrl, assignedDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Song title is required' }, { status: 400 });
    }

    const song = await Song.create({
      title: title.trim(),
      tamilTitle: (tamilTitle || '').trim(),
      originalKey: originalKey || 'D',
      tempo: Number(tempo) || 72,
      timeSignature: timeSignature || '4/4',
      category: category || 'Worship',
      lyrics: (lyrics || '').trim(),
      tamilLyrics: (tamilLyrics || '').trim(),
      chords: (chords || '').trim(),
      youtubeUrl: (youtubeUrl || '').trim(),
      assignedDate: (assignedDate || '').trim(),
    });

    const allSongs = await Song.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json({ song, songs: allSongs }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating choir song:', error);
    return NextResponse.json({ error: 'Failed to save song' }, { status: 500 });
  }
}
