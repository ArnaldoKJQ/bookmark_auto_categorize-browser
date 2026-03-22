// ai.js - Gemini AI fallback classifier

import { CATEGORIES, GEMINI_API_URL } from "./config.js";

/**
 * Classify a bookmark URL + title using Gemini AI.
 * Returns a category string from the CATEGORIES list, or "Other" on failure.
 * @param {string} url
 * @param {string} title
 * @param {string} apiKey
 * @returns {Promise<string>}
 */
export async function classifyWithAI(url, title, apiKey) {
  if (!apiKey) {
    console.warn("[BookmarkAI] No Gemini API key set. Falling back to Other.");
    return "Other";
  }

  const categoryList = CATEGORIES.join(", ");
  const prompt = `You are a bookmark categorizer. Classify the following URL into exactly ONE of these categories: ${categoryList}

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
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10
        }
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[BookmarkAI] Gemini API error:", res.status, err);
      return "Other";
    }

    const data = await res.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Other";

    // Validate the response is actually one of our categories
    const matched = CATEGORIES.find(c => c.toLowerCase() === raw.toLowerCase());
    return matched || "Other";
  } catch (err) {
    console.error("[BookmarkAI] Gemini fetch failed:", err);
    return "Other";
  }
}
