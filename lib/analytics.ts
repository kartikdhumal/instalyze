import type { ChatMessage } from "./instagram/types";

export interface LabelCount {
  label: string;
  count: number;
}

export interface MessageMoment {
  user: string;
  ts: number;
  dateStr: string;
  timeStr: string;
}

export interface AnalyticsResult {
  chatName: string;
  summary: {
    totalMessages: number;
    totalWords: number;
    totalCharacters: number;
    totalMedia: number;
    totalEmojis: number;
    totalLinks: number;
  };
  userAggregates: {
    messages: LabelCount[];
    words: LabelCount[];
    characters: LabelCount[];
    media: LabelCount[];
    emojis: LabelCount[];
    links: LabelCount[];
    avgCharacters: LabelCount[];
    questions: LabelCount[];
    laughs: LabelCount[];
  };
  funAnalytics: {
    essayWriter: { user: string; value: string };
    longestStreak: number;
    longestStreakFrom: string;
    longestStreakTo: string;
    longestInactivePeriod: { days: number; from: string; to: string };
    silentSince: { date: string; days: number; label: string } | null;
  };
  topWords: LabelCount[];
  topEmojis: LabelCount[];
  topEmojisPerUser: { user: string; emojis: LabelCount[] }[];
  topWebsites: LabelCount[];
  topWebsitesPerUser: { user: string; websites: LabelCount[] }[];
  dayOfWeekStats: LabelCount[];
  hourlyStats: LabelCount[];
  hourlyHeatmap: number[][];
  monthlyStats: LabelCount[];
  dailyStats: LabelCount[];
  firstMessagePerUser: MessageMoment[];
  lastMessagePerUser: MessageMoment[];
  top10MostActiveDays: LabelCount[];
  shares: {
    total: number;
    perUser: LabelCount[];
    shareRatePerUser: LabelCount[];
    reactionsPerUser: LabelCount[];
    topCreators: LabelCount[];
    topHashtags: LabelCount[];
  };
}

const DAY_MS = 1000 * 60 * 60 * 24;

const DOMAIN_ALIASES: Record<string, string> = {
  "youtu.be": "youtube.com",
  "m.youtube.com": "youtube.com",
  "t.co": "twitter.com",
  "instagr.am": "instagram.com",
  "fb.me": "facebook.com",
  "fb.com": "facebook.com",
  "wa.me": "whatsapp.com",
  "pin.it": "pinterest.com",
};

const TLDS =
  "com|org|net|in|io|co|me|am|app|dev|ai|gov|edu|info|biz|xyz|live|tv|be|ly|uk|us|ca|au|de|fr|jp|cn|ru|br|es|it|nl|se|pk|bd|lk|np";
const URL_SOURCE = String.raw`\b(?:https?://)?(?:www\.)?((?:[a-zA-Z0-9-]+\.)+(?:${TLDS}))\b(?:/\S*)?`;

const LAUGH_WORD = /\ba*ha(?:ha)+\w*|\bhehe\w*|\bhihi\w*|\blol+\b|\blmf?ao+\b|\brofl+\b|\bxd\b/i;
const LAUGH_EMOJI = /[\u{1F602}\u{1F923}\u{1F639}\u{1F606}\u{1F480}]/u;

const STOP_WORDS = new Set(
  `the a an is in it to of and or for on at i you he she we they was are be this that with have had but not do
  so if as by up me my your our its his her their what when how from just ok okay yes no got get will can did
  went like also about out one all more some been than into hai kya ki aur toh se ko hi bhi na
  ye woh main tu hum ke ka ek mera tera liye nahi haan hoon hain tha thi koi kuch phir abhi aaj kal yaar accha
  theek matlab aapko aapne aapka aapki meri mere maine mujhe tumhara uska uski unka yeh kaise kyun kyu kahan
  kab jab tab bola boli bolo raha rahi rahe gaya gayi gaye karo kiya kari karna karte karta karti hoga hogi
  jayega jayegi saath baad pehle bahut zyada thoda sirf lekin magar agar waise aise chalo arey haa hmm sach
  pata lagta laga lagi diya dena deta milega mila dekho dekha suno bata batao kyunki cheez paas same hume
  humein mujhse aapse isliye chalta chalti hue mein tumhe unhone usne apna apne apni jaise kisi kisne uske unke
  iske bolte bolta bolti hone wahan yahan kabhi kitna itna baat baar dono aaya aaye aayi aapke wahi wala wali
  waale baje mene haii hota achha acha kaha haaa muje mujha usko unko isko inko chahiye aata baki usse isme usme kese
  kaisa aisa jaisa isiliye hoti tumhare tere pehla chal sakte sakta sakti jayenge jaye thik nhi nahin bahot bohot bhut
  kafi krna krta krte hogaya hojayega lagega liya lena diye wale waha yaha kyuki mujhko tujhe tumko humko aree arre
  chhe nathi nthi mane atle etle kidhu mare mara mari maru thai thay thayu pachi pachhi tane tamne vaat sathe mate
  aave aavu aavi aavyo aavyu chhu chho ahiya ahi kale badha badhu badhi tara tare tari taru tame tamari tamaru lage hase
  khali chee aaje amare amaru amne kare karu karvu karyu karyo karine emne hatu hato hati javu atyare tyare tune chale
  joyu joie joiye have haji kyare kevi kevu kaik jode evu evi ema enu ena eni ene gayu gayo aayo levu devu sake saku
  pelu pela vadhu thodu sath jyada
  tamare tamara amara amari emna emni emnu aapdu aapde apde kahu kahyu kidhi kaho kahe kehta kehti kehna meko tujhko
  unhe isne inhe hamara hamare hamari tumhari tumne humne kiska kiski kiske jiska vahi yahi
  vese karne vala thaa kyaa jata karke apko vali thodi jana sudhi pade hata karto biju nahii hann khud teri vadhare
  means actually
  because know then should here much still only which would could there them these those were didn doesn wasn isn
  haven gonna wanna yeah yess yesss ohhh okk okkk hmmm hmmmm`.split(/\s+/),
);

const increment = (record: Record<string, number>, key: string, by = 1) => {
  record[key] = (record[key] ?? 0) + by;
};

const toLabelCounts = (record: Record<string, number>, limit?: number): LabelCount[] =>
  Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));

const formatDay = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const calendarDay = (ms: number) => {
  const d = new Date(ms);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
};

function silentSpanLabel(days: number): string {
  if (days === 1) return "1 Day";
  if (days < 30) return `${days} Days`;
  if (days < 365) return `${Math.floor(days / 30)} Months`;
  return `${Math.floor(days / 365)} Years`;
}

function streaksOf(dates: string[]) {
  let longestStreak = 0;
  let longestStreakFrom = "";
  let longestStreakTo = "";
  let current = 0;
  let currentStart = 0;
  let previous = 0;
  let longestInactivePeriod = { days: 0, from: "", to: "" };

  for (const date of [...dates].sort((a, b) => a.localeCompare(b))) {
    const dayTs = new Date(`${date}T00:00:00Z`).getTime();
    const gap = previous === 0 ? 0 : Math.round((dayTs - previous) / DAY_MS);

    if (gap === 1) {
      current++;
    } else {
      current = 1;
      currentStart = dayTs;
    }
    if (current > longestStreak) {
      longestStreak = current;
      longestStreakFrom = formatDay(currentStart);
      longestStreakTo = formatDay(dayTs);
    }
    if (gap - 1 > longestInactivePeriod.days) {
      longestInactivePeriod = { days: gap - 1, from: formatDay(previous + DAY_MS), to: formatDay(dayTs - DAY_MS) };
    }
    previous = dayTs;
  }

  return { longestStreak, longestStreakFrom, longestStreakTo, longestInactivePeriod };
}

const EMOJI_SOURCE = String.raw`\p{RGI_Emoji}`;

type Counter = Record<string, number>;

function createTally() {
  return {
    emojiRegex: new RegExp(EMOJI_SOURCE, "gv"),
    urlRegex: new RegExp(URL_SOURCE, "gi"),
    summary: { totalMessages: 0, totalWords: 0, totalCharacters: 0, totalMedia: 0, totalEmojis: 0, totalLinks: 0 },
    perSender: {
      messages: {} as Counter,
      words: {} as Counter,
      characters: {} as Counter,
      textMessages: {} as Counter,
      media: {} as Counter,
      emojis: {} as Counter,
      links: {} as Counter,
      questions: {} as Counter,
      laughs: {} as Counter,
    },
    hourly: new Array<number>(24).fill(0),
    heatmap: Array.from({ length: 7 }, () => new Array<number>(24).fill(0)),
    dayOfWeek: [0, 0, 0, 0, 0, 0, 0],
    monthly: {} as Record<string, { count: number; label: string }>,
    daily: {} as Record<string, { count: number; ts: number }>,
    firstMessage: {} as Record<string, MessageMoment>,
    lastMessage: {} as Record<string, MessageMoment>,
    emojiFreq: {} as Counter,
    userEmojiFreq: {} as Record<string, Counter>,
    websiteFreq: {} as Counter,
    userWebsiteFreq: {} as Record<string, Counter>,
    textParts: [] as string[],
    lastMessageTs: 0,
    shares: {
      perUser: {} as Counter,
      reactionsPerUser: {} as Counter,
      creators: {} as Counter,
      hashtags: {} as Counter,
    },
  };
}

type Tally = ReturnType<typeof createTally>;

function countInto(total: Counter, perUser: Record<string, Counter>, user: string, keys: string[]) {
  if (keys.length === 0) return;
  perUser[user] ??= {};
  for (const key of keys) {
    increment(total, key);
    increment(perUser[user], key);
  }
}

function tallyContent(tally: Tally, message: ChatMessage) {
  const { sender, text } = message;
  const { summary, perSender } = tally;
  const isMedia = message.media.length > 0 || message.share !== null || message.attachment ? 1 : 0;
  const words = text.split(/\s+/).filter(Boolean).length;
  if (text) {
    increment(perSender.textMessages, sender);
    tally.textParts.push(text);
  }

  const emojis = [...text.matchAll(tally.emojiRegex)].map((match) => match[0]);
  countInto(tally.emojiFreq, tally.userEmojiFreq, sender, emojis);

  const linkSource = `${text} ${message.share?.link ?? ""}`;
  const domains = [...linkSource.matchAll(tally.urlRegex)].map((link) => {
    const domain = link[1].toLowerCase();
    return DOMAIN_ALIASES[domain] ?? domain;
  });
  countInto(tally.websiteFreq, tally.userWebsiteFreq, sender, domains);

  summary.totalMessages++;
  summary.totalWords += words;
  summary.totalCharacters += text.length;
  summary.totalMedia += isMedia;
  summary.totalEmojis += emojis.length;
  summary.totalLinks += domains.length;

  increment(perSender.messages, sender);
  increment(perSender.words, sender, words);
  increment(perSender.characters, sender, text.length);
  increment(perSender.media, sender, isMedia);
  increment(perSender.emojis, sender, emojis.length);
  increment(perSender.links, sender, domains.length);
  if (text.replace(tally.urlRegex, " ").includes("?")) increment(perSender.questions, sender);
  if (LAUGH_WORD.test(text) || LAUGH_EMOJI.test(text)) increment(perSender.laughs, sender);
}

const HASHTAG = /#[\p{L}\p{N}_]+/gu;

function tallyShare(tally: Tally, message: ChatMessage) {
  if (!message.share && !message.attachment) return;
  const { shares } = tally;
  increment(shares.perUser, message.sender);
  increment(shares.reactionsPerUser, message.sender, message.reactions.length);
  if (message.share?.owner) increment(shares.creators, `@${message.share.owner}`);
  for (const tag of message.share?.text.match(HASHTAG) ?? []) increment(shares.hashtags, tag.toLowerCase());
}

function tallyTiming(tally: Tally, message: ChatMessage) {
  const { sender, ts, date, time } = message;
  const hour = Number(time.slice(0, 2));
  const weekday = new Date(ts).getDay();
  tally.hourly[hour]++;
  tally.heatmap[weekday][hour]++;
  tally.dayOfWeek[weekday]++;
  tally.lastMessageTs = Math.max(tally.lastMessageTs, ts);

  const moment = { user: sender, ts, dateStr: date, timeStr: time };
  tally.firstMessage[sender] ??= moment;
  tally.lastMessage[sender] = moment;

  tally.daily[date] ??= { count: 0, ts };
  tally.daily[date].count++;

  const [year, month] = date.split("-");
  const monthKey = `${year}-${month}`;
  tally.monthly[monthKey] ??= { count: 0, label: `${month}/${year}` };
  tally.monthly[monthKey].count++;
}

export function computeAnalytics(messages: ChatMessage[], chatName: string): AnalyticsResult {
  const tally = createTally();
  for (const message of messages) {
    if (message.kind !== "message") continue;
    tallyContent(tally, message);
    tallyShare(tally, message);
    tallyTiming(tally, message);
  }
  const { summary, perSender, hourly, heatmap, dayOfWeek, monthly, daily, lastMessageTs } = tally;

  const nameWords = new Set(
    Object.keys(perSender.messages).flatMap((sender) => sender.toLowerCase().match(/[\p{L}\p{M}]{4,}/gu) ?? []),
  );
  const wordFreq: Record<string, number> = {};
  const wordSource = tally.textParts.join(" ").replace(/https?:\/\/\S+/gi, " ").toLowerCase();
  for (const word of wordSource.match(/[\p{L}\p{M}]{4,}/gu) ?? []) {
    if (!STOP_WORDS.has(word) && !nameWords.has(word)) increment(wordFreq, word);
  }

  const averagePerText = (totals: Record<string, number>) =>
    Object.keys(totals)
      .map((user) => ({
        label: user,
        count: perSender.textMessages[user] ? Math.round(totals[user] / perSender.textMessages[user]) : 0,
      }))
      .sort((a, b) => b.count - a.count);

  const avgWords = averagePerText(perSender.words);
  const essayWriter =
    avgWords[0]?.count > 0
      ? { user: avgWords[0].label, value: `${avgWords[0].count} words/msg` }
      : { user: "-", value: "0 words/msg" };

  const silentDays = lastMessageTs === 0 ? 0 : Math.round((calendarDay(Date.now()) - calendarDay(lastMessageTs)) / DAY_MS);
  const dailyEntries = Object.entries(daily).map(([label, d]) => ({ label, ...d }));
  const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
  const weekdayLabels = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  return {
    chatName,
    summary,
    userAggregates: {
      messages: toLabelCounts(perSender.messages),
      words: toLabelCounts(perSender.words),
      characters: toLabelCounts(perSender.characters),
      media: toLabelCounts(perSender.media),
      emojis: toLabelCounts(perSender.emojis),
      links: toLabelCounts(perSender.links),
      questions: toLabelCounts(perSender.questions),
      laughs: toLabelCounts(perSender.laughs),
      avgCharacters: averagePerText(perSender.characters),
    },
    funAnalytics: {
      essayWriter,
      ...streaksOf(Object.keys(daily)),
      silentSince:
        silentDays < 1 ? null : { date: formatDay(lastMessageTs), days: silentDays, label: silentSpanLabel(silentDays) },
    },
    dayOfWeekStats: weekdayOrder.map((day) => ({ label: weekdayLabels[day], count: dayOfWeek[day] })),
    hourlyStats: hourly.map((count, hour) => ({ label: hour.toString().padStart(2, "0"), count })),
    hourlyHeatmap: heatmap,
    monthlyStats: Object.keys(monthly)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({ label: monthly[key].label, count: monthly[key].count })),
    dailyStats: [...dailyEntries]
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 30)
      .map(({ label, count }) => ({ label, count })),
    top10MostActiveDays: [...dailyEntries]
      .sort((a, b) => b.count - a.count || b.ts - a.ts)
      .slice(0, 10)
      .map(({ label, count }) => ({ label, count })),
    topWords: toLabelCounts(wordFreq, 30),
    topEmojis: toLabelCounts(tally.emojiFreq, 20),
    topEmojisPerUser: Object.entries(tally.userEmojiFreq).map(([user, freq]) => ({ user, emojis: toLabelCounts(freq, 10) })),
    topWebsites: toLabelCounts(tally.websiteFreq, 10),
    topWebsitesPerUser: Object.entries(tally.userWebsiteFreq).map(([user, freq]) => ({
      user,
      websites: toLabelCounts(freq, 5),
    })),
    firstMessagePerUser: Object.values(tally.firstMessage),
    lastMessagePerUser: Object.values(tally.lastMessage),
    shares: {
      total: Object.values(tally.shares.perUser).reduce((sum, count) => sum + count, 0),
      perUser: toLabelCounts(tally.shares.perUser),
      shareRatePerUser: Object.entries(tally.shares.perUser)
        .map(([user, count]) => ({ label: user, count: Math.round((count / perSender.messages[user]) * 100) }))
        .sort((a, b) => b.count - a.count),
      reactionsPerUser: toLabelCounts(tally.shares.reactionsPerUser).filter((item) => item.count > 0),
      topCreators: toLabelCounts(tally.shares.creators, 10),
      topHashtags: toLabelCounts(tally.shares.hashtags, 10),
    },
  };
}
