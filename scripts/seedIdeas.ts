import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDysk-VvME-At3kjFCD80EcBkfc3T4gj3I',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'ideamash-3ecda.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ideamash-3ecda',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'ideamash-3ecda.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '289026845239',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:289026845239:web:9a2e29f3622a16ebb02db2',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const FAKE_USERS = [
  { username: 'karan_builds', bio: 'ex-Swiggy PM, now building in public', pfpColor: '#3dffc0' },
  { username: 'priya_ships', bio: 'designer turned founder, Bangalore', pfpColor: '#a78bfa' },
  { username: 'rohit_0to1', bio: 'IIT Bombay dropout, 2 failed startups', pfpColor: '#ff4d6d' },
  { username: 'ananya_vc', bio: 'ex-Sequoia analyst, angel investor now', pfpColor: '#ffbe3d' },
  { username: 'deepak_saas', bio: 'bootstrapped to ₹10L MRR, B2B SaaS', pfpColor: '#38bdf8' },
  { username: 'shreya_design', bio: 'product @ Razorpay, side projects always', pfpColor: '#f472b6' },
  { username: 'vikram_ops', bio: 'ops guy who codes, ex-Zepto', pfpColor: '#fb923c' },
  { username: 'nisha_founder', bio: 'building for Bharat, tier-2 obsessed', pfpColor: '#34d399' },
];

async function generateWithGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  
  if (text.startsWith('```json')) text = text.slice(7);
  else if (text.startsWith('```')) text = text.slice(3);
  if (text.endsWith('```')) text = text.slice(0, -3);
  
  return text.trim();
}

async function getCommentsForIdea(title: string, desc: string, numComments: number) {
  if (numComments === 0) return [];
  const usernames = FAKE_USERS.map((u) => u.username).join(', ');
  const prompt = `Write ${numComments} realistic short comments from Indian founders on this startup idea.
Comments should be honest, specific, sometimes skeptical, sometimes excited.
Mix of Hindi-English (Hinglish) and English. Short — 1-2 sentences each. Include some typical startup slang.
Idea: ${title} — ${desc}
Return ONLY a valid JSON array: [{"author": "username", "text": "comment text"}]
Authors MUST be randomly selected from this list: ${usernames}.`;
  
  try {
    const raw = await generateWithGemini(prompt);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to generate comments for "${title}"`, err);
    return [];
  }
}

async function getAICardForIdea(title: string, desc: string) {
  const prompt = `Analyze this startup idea:
Title: ${title}
Pitch: ${desc}

Return a valid JSON object with:
- "headline": A punchy, 4-6 word summary.
- "insights": An array of exactly 3 bullet points (1 sentence each) analyzing viability, market, or risks in the Indian context.
Return ONLY JSON, no markdown.`;
  try {
    const raw = await generateWithGemini(prompt);
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to generate AI card for "${title}"`, err);
    return null;
  }
}

export async function runSeed(log: (msg: string) => void) {
  let totalVotes = 0;
  let totalComments = 0;

  // 1. Create fake users
  log('Creating fake users...');
  for (const u of FAKE_USERS) {
    await setDoc(doc(db, 'users', u.username), {
      ...u,
      createdAt: Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
    });
  }
  log(`✓ Created ${FAKE_USERS.length} fake users.`);

  // 2. Generate Ideas
  const totalBatches = 5;
  const ideasPerBatch = 10;
  const allIdeas: any[] = [];

  for (let i = 1; i <= totalBatches; i++) {
    log(`Generating batch ${i}/${totalBatches} (ideas ${(i - 1) * ideasPerBatch + 1}-${i * ideasPerBatch})...`);
    const prompt = `Generate ${ideasPerBatch} realistic startup ideas for Indian founders in 2025-2026.
For each idea return valid JSON array. Each item:
{
  "title": "short punchy title (max 10 words)",
  "desc": "2-3 sentence pitch explaining the problem, solution, and target market. Be specific and realistic. Mention Indian context where relevant.",
  "category": one of ["AI", "Marketplace", "B2B", "Consumer", "SaaS", "Hardware", "Other"],
  "tags": ["relevant", "tags"]
}

Focus on real problems Indian founders face. Include a mix of:
- Bharat/tier-2/tier-3 market opportunities
- B2B SaaS for Indian SMBs
- Consumer apps for Indian millennials
- AI tools built for Indian languages/context
- Fintech, edtech, healthtech, agritech
- Infrastructure problems (logistics, payments, compliance)

Make them feel like real founder ideas, not generic startup ideas.
No generic "Uber for X" ideas. Be specific and original.
Return ONLY the JSON array, no markdown.`;

    try {
      const raw = await generateWithGemini(prompt);
      const batchIdeas = JSON.parse(raw);
      allIdeas.push(...batchIdeas);
    } catch (err) {
      log(`Error in batch ${i}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (i < totalBatches) {
      await new Promise((res) => setTimeout(res, 2500)); // Delay to avoid rate limit
    }
  }

  // 3. Process and post each idea
  let postedCount = 0;
  log(`Processing and posting ${allIdeas.length} ideas to Firestore...`);

  for (let idx = 0; idx < allIdeas.length; idx++) {
    const idea = allIdeas[idx];
    try {
      // Random author
      const author = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].username;
      
      // Determine if it's a "top idea" (first 5 ideas get more votes and older timestamps)
      const isTop = idx < 5;
      
      // Timestamps
      const daysAgo = isTop ? (15 + Math.random() * 15) : (Math.random() * 20); // Top ones are older (15-30 days), others 0-20 days
      const ts = Date.now() - daysAgo * 24 * 60 * 60 * 1000;

      // Votes
      const shuffledUsers = [...FAKE_USERS].sort(() => Math.random() - 0.5);
      const upvoteCount = isTop ? Math.floor(Math.random() * 4) + 5 : Math.floor(Math.random() * 4) + 1; // 5-8 or 1-4 max since there are only 8 fake users total
      const upvotes = shuffledUsers.slice(0, upvoteCount).map((u) => u.username);
      
      const remainingUsers = shuffledUsers.slice(upvoteCount);
      const downvoteCount = Math.min(remainingUsers.length, Math.floor(Math.random() * 3));
      const downvotes = remainingUsers.slice(0, downvoteCount).map((u) => u.username);

      totalVotes += upvoteCount + downvoteCount;

      // Comments
      const numComments = Math.floor(Math.random() * 4); // 0-3
      let commentsToStore: any[] = [];
      if (numComments > 0) {
        const rawComments = await getCommentsForIdea(idea.title, idea.desc, numComments);
        commentsToStore = rawComments.map((c: any, cIdx: number) => ({
          id: `seed_comment_${idx}_${cIdx}`,
          author: c.author,
          text: c.text,
          ts: ts + (Math.random() * (Date.now() - ts)), // Comment sometime after post
        }));
        totalComments += commentsToStore.length;
      }

      // AI Card
      const aiCard = await getAICardForIdea(idea.title, idea.desc);

      // Post to Firestore
      await addDoc(collection(db, 'ideas'), {
        author,
        title: idea.title,
        desc: idea.desc,
        category: idea.category,
        tags: idea.tags || [],
        upvotes,
        downvotes,
        comments: commentsToStore,
        aiCard: aiCard || null,
        ts,
      });

      postedCount++;
      log(`✓ Posted idea ${postedCount}: "${idea.title}"`);
      
      // Small delay to prevent API blast
      await new Promise((res) => setTimeout(res, 500));
    } catch (err) {
      log(`Failed to process idea: ${idea.title} - ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const summary = [
    '=== SEED COMPLETE ===',
    `Users created: ${FAKE_USERS.length}`,
    `Ideas posted: ${postedCount}`,
    `Total votes cast: ${totalVotes}`,
    `Total comments: ${totalComments}`,
    'Go check: https://ideamash.vercel.app',
  ].join('\\n');
  log(summary);
}

// Allow running from CLI directly
if (require.main === module) {
  import('dotenv').then(({ config }) => {
    config({ path: '.env.local' });
    runSeed(console.log).then(() => process.exit(0)).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  });
}
