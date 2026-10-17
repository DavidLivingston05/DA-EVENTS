// Faith engagement, daily scriptures, and fellowship attendance streak calculations

export interface ScriptureVerse {
  en: { text: string; reference: string };
  ta: { text: string; reference: string };
}

export const DAILY_VERSES: ScriptureVerse[] = [
  {
    en: { text: "The Lord is my strength and my shield; in Him my heart trusts, and I am helped.", reference: "Psalm 28:7" },
    ta: { text: "கர்த்தர் என் பெலனும் என் கேடகமுமாயிருக்கிறார்; என் இருதயம் அவரை நம்பியிருந்தது, நான் உதவிபெற்றேன்.", reference: "சங்கீதம் 28:7" }
  },
  {
    en: { text: "Not forsaking the assembling of ourselves together, but encouraging one another.", reference: "Hebrews 10:25" },
    ta: { text: "சபைகூடிவருதலைச் சிலர் விட்டுவிடுகிறதுபோல நாமும் விட்டுவிடாமல், ஒருவருக்கொருவர் புத்திசொல்லக்கடவோம்.", reference: "எபிரெயர் 10:25" }
  },
  {
    en: { text: "For where two or three gather in my name, there am I with them.", reference: "Matthew 18:20" },
    ta: { text: "ஏனெனில், இரண்டு அல்லது மூன்றுபேர் என் நாமத்தினாலே எங்கே கூடுகிறார்களோ, அங்கே அவர்கள் நடுவிலே இருக்கிறேன்.", reference: "மத்தேயு 18:20" }
  },
  {
    en: { text: "I was glad when they said to me, 'Let us go into the house of the Lord.'", reference: "Psalm 122:1" },
    ta: { text: "கர்த்தருடைய ஆலயத்திற்குப் போவோம் வாருங்கள் என்று எனக்கு அவர்கள் சொன்னபோது மகிழ்ச்சியாயிருந்தேன்.", reference: "சங்கீதம் 122:1" }
  },
  {
    en: { text: "Taste and see that the Lord is good; blessed is the one who takes refuge in Him.", reference: "Psalm 34:8" },
    ta: { text: "கர்த்தர் நல்லவர் என்பதை ருசித்துப்பாருங்கள்; அவர்மேல் நம்பிக்கையாயிருக்கிற மனுஷன் பாக்கியவான்.", reference: "சங்கீதம் 34:8" }
  },
  {
    en: { text: "Those who hope in the Lord will renew their strength. They will soar on wings like eagles.", reference: "Isaiah 40:31" },
    ta: { text: "கர்த்தருக்குக் காத்திருக்கிறவர்களோ புதுப்பெலன் அடைந்து, கழுகுகளைப்போலச் செட்டைகளை அடித்து எழும்புவார்கள்.", reference: "ஏசாயா 40:31" }
  }
];

export function getTodayVerse(): ScriptureVerse {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
}

export function calculateAttendanceStreak(registeredEvents: any[]): {
  streakCount: number;
  badgeTitle: string;
  badgeEmoji: string;
} {
  const count = registeredEvents ? registeredEvents.length : 0;
  if (count >= 10) {
    return { streakCount: count, badgeTitle: 'Faithful Pillar', badgeEmoji: '👑' };
  } else if (count >= 5) {
    return { streakCount: count, badgeTitle: 'Fellowship Warrior', badgeEmoji: '🔥' };
  } else if (count >= 2) {
    return { streakCount: count, badgeTitle: 'Active Gatherer', badgeEmoji: '⭐' };
  } else if (count === 1) {
    return { streakCount: 1, badgeTitle: 'Welcome Friend', badgeEmoji: '🌱' };
  }
  return { streakCount: 0, badgeTitle: 'Newcomer', badgeEmoji: '🕊️' };
}
