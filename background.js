// background.js - Single-file service worker

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES = ["Dev","AI","Video","Social","Finance","News","Shopping","Learning","Design","Other"];
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
const MAX_LOG_ENTRIES = 50;
const SETTINGS_KEY = "settings";
const LOG_KEY = "activity_log";
const CACHE_PREFIX = "cache::";
const INBOX_FOLDER_TITLE = "📥 Auto Sort";
const INBOX_ID_KEY = "inbox_folder_id";

// In-memory cache so inbox ID is available immediately after creation
let _inboxIdMemory = null;

// ─── Rules ────────────────────────────────────────────────────────────────────

const RULES = {
  Dev: [
    "github.com","gitlab.com","bitbucket.org","stackoverflow.com","stackexchange.com",
    "developer.mozilla.org","npmjs.com","pypi.org","codepen.io","replit.com",
    "jsfiddle.net","codesandbox.io","vercel.com","netlify.com","heroku.com",
    "digitalocean.com","aws.amazon.com","cloud.google.com","azure.microsoft.com",
    "docker.com","kubernetes.io","linear.app","devdocs.io",
    "regex101.com","roadmap.sh","leetcode.com","hackerrank.com"
  ],
  AI: [
    "openai.com","anthropic.com","claude.ai","huggingface.co","replicate.com",
    "stability.ai","midjourney.com","perplexity.ai","gemini.google.com",
    "copilot.microsoft.com","mistral.ai","cohere.com","groq.com","together.ai",
    "civitai.com","kaggle.com","aistudio.google.com"
  ],
  Video: [
    "youtube.com","youtu.be","netflix.com","twitch.tv","vimeo.com",
    "dailymotion.com","tiktok.com","hulu.com","disneyplus.com",
    "primevideo.com","crunchyroll.com","bilibili.com","nicovideo.jp"
  ],
  Social: [
    "twitter.com","x.com","instagram.com","facebook.com","linkedin.com",
    "reddit.com","discord.com","telegram.org","t.me","threads.net",
    "mastodon.","bsky.app","snapchat.com","pinterest.com"
  ],
  Finance: [
    "binance.com","coinbase.com","kraken.com","tradingview.com","investing.com",
    "bloomberg.com","finance.yahoo.com","wsj.com","ft.com",
    "bankofamerica.com","chase.com","paypal.com","wise.com","stripe.com"
  ],
  News: [
    "bbc.com","bbc.co.uk","cnn.com","reuters.com","apnews.com",
    "nytimes.com","theguardian.com","washingtonpost.com","techcrunch.com",
    "arstechnica.com","theverge.com","wired.com","news.ycombinator.com","producthunt.com"
  ],
  Shopping: [
    "amazon.com","amazon.co","ebay.com","shopee.","lazada.","tokopedia.com",
    "etsy.com","aliexpress.com","taobao.com","rakuten.com","bestbuy.com","newegg.com"
  ],
  Learning: [
    "udemy.com","coursera.org","edx.org","khanacademy.org","pluralsight.com",
    "skillshare.com","freecodecamp.org","theodinproject.com","w3schools.com",
    "tutorialspoint.com","medium.com","dev.to","hashnode.com","substack.com"
  ],
  Design: [
    "figma.com","dribbble.com","behance.net","awwwards.com","coolors.co",
    "fonts.google.com","fontawesome.com","heroicons.com","flaticon.com",
    "unsplash.com","pexels.com","freepik.com","canva.com","adobe.com"
  ]
};

function matchRule(url) {
  if (!url) return null;
  const lower = url.toLowerCase();
  for (const [category, domains] of Object.entries(RULES)) {
    if (domains.some(d => lower.includes(d))) return category;
  }
  return null;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function getCached(url) {
  return new Promise(resolve => {
    chrome.storage.local.get([CACHE_PREFIX + url], result => {
      resolve(result[CACHE_PREFIX + url] || null);
    });
  });
}

function setCache(url, category) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [CACHE_PREFIX + url]: category }, resolve);
  });
}

// ─── Gemini AI ────────────────────────────────────────────────────────────────

async function classifyWithAI(url, title, apiKey) {
  if (!apiKey) return "Other";
  const prompt = `You are a bookmark categorizer. Classify the following URL into exactly ONE of these categories: ${CATEGORIES.join(", ")}

URL: ${url}
Page Title: ${title || "(no title)"}

Rules:
- Return ONLY the category name, nothing else.
- No punctuation, no explanation.
- If unsure, return "Other".`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 10 }
      })
    });
    if (!res.ok) return "Other";
    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Other";
    const matched = CATEGORIES.find(c => c.toLowerCase() === raw.toLowerCase());
    return matched || "Other";
  } catch (e) {
    console.error("[BookmarkAI] AI error:", e);
    return "Other";
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function getSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get([SETTINGS_KEY], result => {
      resolve(result[SETTINGS_KEY] || { apiKey: "", enabled: false });
    });
  });
}

// ─── Inbox folder ─────────────────────────────────────────────────────────────

function getInboxId() {
  // Return from memory immediately if available (avoids storage round-trip race)
  if (_inboxIdMemory) {
    return new Promise(resolve => {
      chrome.bookmarks.get(_inboxIdMemory, nodes => {
        if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
          _inboxIdMemory = null;
          chrome.storage.local.remove([INBOX_ID_KEY]);
          return resolve(null);
        }
        resolve(_inboxIdMemory);
      });
    });
  }
  return new Promise(resolve => {
    chrome.storage.local.get([INBOX_ID_KEY], result => {
      const id = result[INBOX_ID_KEY];
      if (!id) return resolve(null);
      chrome.bookmarks.get(id, nodes => {
        if (chrome.runtime.lastError || !nodes || nodes.length === 0) {
          chrome.storage.local.remove([INBOX_ID_KEY]);
          return resolve(null);
        }
        _inboxIdMemory = id; // warm the cache
        resolve(id);
      });
    });
  });
}

async function createInboxFolder() {
  return new Promise(resolve => {
    chrome.bookmarks.search({ title: INBOX_FOLDER_TITLE }, results => {
      const found = results.find(r => !r.url);
      if (found) {
        _inboxIdMemory = found.id;
        chrome.storage.local.set({ [INBOX_ID_KEY]: found.id });
        return resolve(found.id);
      }
      chrome.bookmarks.create({ title: INBOX_FOLDER_TITLE }, folder => {
        _inboxIdMemory = folder.id;
        chrome.storage.local.set({ [INBOX_ID_KEY]: folder.id });
        console.log("[BookmarkAI] Inbox folder created:", folder.id);
        resolve(folder.id);
      });
    });
  });
}

async function getOrCreateCategoryFolder(categoryName) {
  const inboxId = await getInboxId();
  if (!inboxId) return null;
  return new Promise(resolve => {
    chrome.bookmarks.getChildren(inboxId, children => {
      const existing = children.find(c => !c.url && c.title === categoryName);
      if (existing) return resolve(existing.id);
      chrome.bookmarks.create({ parentId: inboxId, title: categoryName }, folder => {
        resolve(folder.id);
      });
    });
  });
}

// ─── Log ──────────────────────────────────────────────────────────────────────

async function appendLog(entry) {
  return new Promise(resolve => {
    chrome.storage.local.get([LOG_KEY], result => {
      const log = result[LOG_KEY] || [];
      log.unshift({ ...entry, ts: Date.now() });
      if (log.length > MAX_LOG_ENTRIES) log.length = MAX_LOG_ENTRIES;
      chrome.storage.local.set({ [LOG_KEY]: log }, resolve);
    });
  });
}

// ─── Core: classify and move ──────────────────────────────────────────────────

// IDs we are actively processing (blocks re-entry)
const processing = new Set();
// IDs we already moved into a category — ignore any further moves for 5s
const recentlyMoved = new Map(); // id -> timestamp

async function classifyAndMove(id, url, title) {
  if (processing.has(id)) return;
  processing.add(id);

  try {
    const { apiKey } = await getSettings();
    let method = "cache";

    let category = await getCached(url);

    if (!category) {
      category = matchRule(url);
      method = "rule";
    }

    if (!category) {
      category = await classifyWithAI(url, title, apiKey);
      method = "ai";
    }

    await setCache(url, category);

    const categoryFolderId = await getOrCreateCategoryFolder(category);
    if (!categoryFolderId) {
      console.error("[BookmarkAI] Could not get/create category folder");
      return;
    }

    // Delete original and recreate in category folder
    // This avoids Brave sync moving it back after our move
    recentlyMoved.set(id, Date.now());
    setTimeout(() => recentlyMoved.delete(id), 5000);

    await chrome.bookmarks.remove(id);
    await chrome.bookmarks.create({ parentId: categoryFolderId, title, url });
    console.log(`[BookmarkAI] "${title}" → ${INBOX_FOLDER_TITLE}/${category} (via ${method})`);
    await appendLog({ url, title, category, method });

  } catch (err) {
    console.error("[BookmarkAI] classifyAndMove error:", err);
  } finally {
    processing.delete(id);
  }
}

// ─── Listeners ────────────────────────────────────────────────────────────────

// Watch ALL moves — if anything lands in inbox, classify it.
chrome.bookmarks.onMoved.addListener(async (id, moveInfo) => {
  // Ignore moves WE triggered (our own classifyAndMove call)
  if (recentlyMoved.has(id)) {
    console.log(`[BookmarkAI] onMoved id=${id}: ignoring our own move`);
    return;
  }

  // Only care about bookmarks landing IN the inbox
  const inboxId = await getInboxId();
  if (!inboxId || moveInfo.parentId !== inboxId) return;

  const { enabled } = await getSettings();
  if (!enabled) return;

  chrome.bookmarks.get(id, async (nodes) => {
    if (chrome.runtime.lastError || !nodes || nodes.length === 0) return;
    const node = nodes[0];
    if (!node.url) return;
    console.log(`[BookmarkAI] onMoved id=${id} landed in inbox → classifying "${node.title}"`);
    await classifyAndMove(id, node.url, node.title || "");
  });
});

// Handle onCreated — for cases where Brave creates directly in inbox (no move fires)
chrome.bookmarks.onCreated.addListener(async (id, bookmark) => {
  if (!bookmark.url) return;

  const inboxId = await getInboxId();
  if (!inboxId || bookmark.parentId !== inboxId) return;

  const { enabled } = await getSettings();
  if (!enabled) return;

  console.log(`[BookmarkAI] onCreated directly in inbox id=${id} → classifying "${bookmark.title}"`);
  await classifyAndMove(id, bookmark.url, bookmark.title || "");
});

// ─── Message from popup (toggle ON) ──────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TOGGLE_ON") {
    _inboxIdMemory = null; // clear stale cache before recreating
    createInboxFolder().then(id => {
      console.log(`[BookmarkAI] TOGGLE_ON: inbox ready id=${id}`);
      sendResponse({ ok: true, inboxId: id });
    });
    return true;
  }
  if (msg.type === "TOGGLE_OFF") {
    _inboxIdMemory = null; // clear memory cache on disable
    sendResponse({ ok: true });
    return true;
  }
});

console.log("[BookmarkAI] Service worker started.");
