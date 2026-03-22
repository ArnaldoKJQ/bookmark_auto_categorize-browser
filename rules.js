// rules.js - Rule-based bookmark categorizer

// Map of category → array of domain/keyword fragments to match against the URL
export const rules = {
  Dev: [
    "github.com",
    "gitlab.com",
    "bitbucket.org",
    "stackoverflow.com",
    "stackexchange.com",
    "developer.mozilla.org",
    "mdn.",
    "npmjs.com",
    "pypi.org",
    "codepen.io",
    "replit.com",
    "jsfiddle.net",
    "codesandbox.io",
    "vercel.com",
    "netlify.com",
    "heroku.com",
    "digitalocean.com",
    "aws.amazon.com",
    "cloud.google.com",
    "azure.microsoft.com",
    "docker.com",
    "kubernetes.io",
    "linear.app",
    "jira.atlassian.com",
    "confluence.atlassian.com",
    "devdocs.io",
    "regex101.com",
    "roadmap.sh",
    "leetcode.com",
    "hackerrank.com"
  ],
  AI: [
    "openai.com",
    "anthropic.com",
    "claude.ai",
    "huggingface.co",
    "replicate.com",
    "stability.ai",
    "midjourney.com",
    "perplexity.ai",
    "gemini.google.com",
    "copilot.microsoft.com",
    "mistral.ai",
    "cohere.com",
    "groq.com",
    "together.ai",
    "civitai.com",
    "kaggle.com"
  ],
  Video: [
    "youtube.com",
    "youtu.be",
    "netflix.com",
    "twitch.tv",
    "vimeo.com",
    "dailymotion.com",
    "tiktok.com",
    "hulu.com",
    "disneyplus.com",
    "primevideo.com",
    "crunchyroll.com",
    "bilibili.com",
    "nicovideo.jp"
  ],
  Social: [
    "twitter.com",
    "x.com",
    "instagram.com",
    "facebook.com",
    "linkedin.com",
    "reddit.com",
    "discord.com",
    "telegram.org",
    "t.me",
    "threads.net",
    "mastodon.",
    "bsky.app",
    "snapchat.com",
    "pinterest.com"
  ],
  Finance: [
    "binance.com",
    "coinbase.com",
    "kraken.com",
    "tradingview.com",
    "investing.com",
    "bloomberg.com/markets",
    "finance.yahoo.com",
    "wsj.com",
    "ft.com",
    "bankofamerica.com",
    "chase.com",
    "paypal.com",
    "wise.com",
    "stripe.com"
  ],
  News: [
    "bbc.com",
    "bbc.co.uk",
    "cnn.com",
    "reuters.com",
    "apnews.com",
    "nytimes.com",
    "theguardian.com",
    "washingtonpost.com",
    "techcrunch.com",
    "arstechnica.com",
    "theverge.com",
    "wired.com",
    "hackernews",
    "news.ycombinator.com",
    "producthunt.com"
  ],
  Shopping: [
    "amazon.com",
    "amazon.co",
    "ebay.com",
    "shopee.",
    "lazada.",
    "tokopedia.com",
    "etsy.com",
    "aliexpress.com",
    "taobao.com",
    "rakuten.com",
    "bestbuy.com",
    "newegg.com"
  ],
  Learning: [
    "udemy.com",
    "coursera.org",
    "edx.org",
    "khanacademy.org",
    "pluralsight.com",
    "skillshare.com",
    "freecodecamp.org",
    "theodinproject.com",
    "w3schools.com",
    "tutorialspoint.com",
    "medium.com",
    "dev.to",
    "hashnode.com",
    "substack.com"
  ],
  Design: [
    "figma.com",
    "dribbble.com",
    "behance.net",
    "awwwards.com",
    "designspiration.com",
    "coolors.co",
    "fonts.google.com",
    "fontawesome.com",
    "heroicons.com",
    "flaticon.com",
    "unsplash.com",
    "pexels.com",
    "freepik.com",
    "canva.com",
    "adobe.com"
  ]
};

/**
 * Try to match a URL against the rule set.
 * Returns the matched category string, or null if no match.
 * @param {string} url
 * @returns {string|null}
 */
export function matchRule(url) {
  if (!url) return null;
  const lower = url.toLowerCase();
  for (const [category, domains] of Object.entries(rules)) {
    if (domains.some(d => lower.includes(d))) {
      return category;
    }
  }
  return null;
}
