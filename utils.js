// utils.js - Storage, folder, and logging helpers

import { MAX_LOG_ENTRIES } from "./config.js";

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_PREFIX = "cache::";

/**
 * Get a cached category for a URL.
 * @param {string} url
 * @returns {Promise<string|null>}
 */
export async function getCached(url) {
  return new Promise(resolve => {
    chrome.storage.local.get([CACHE_PREFIX + url], result => {
      resolve(result[CACHE_PREFIX + url] || null);
    });
  });
}

/**
 * Store a category in cache for a URL.
 * @param {string} url
 * @param {string} category
 */
export async function setCache(url, category) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [CACHE_PREFIX + url]: category }, resolve);
  });
}

// ─── Bookmark Folders ─────────────────────────────────────────────────────────

// We keep our folders inside one parent folder so we don't litter the root
const PARENT_FOLDER_TITLE = "📚 Auto-Organized";

let parentFolderId = null;

/**
 * Get or create the top-level parent folder for all auto-organized categories.
 * @returns {Promise<string>} folder id
 */
async function getOrCreateParentFolder() {
  if (parentFolderId) return parentFolderId;

  return new Promise(resolve => {
    chrome.bookmarks.search({ title: PARENT_FOLDER_TITLE }, results => {
      const existing = results.find(r => !r.url);
      if (existing) {
        parentFolderId = existing.id;
        return resolve(existing.id);
      }
      chrome.bookmarks.create({ title: PARENT_FOLDER_TITLE }, folder => {
        parentFolderId = folder.id;
        resolve(folder.id);
      });
    });
  });
}

/**
 * Get or create a category subfolder inside the parent folder.
 * @param {string} name  Category name
 * @returns {Promise<string>} folder id
 */
export async function getOrCreateFolder(name) {
  const parentId = await getOrCreateParentFolder();

  return new Promise(resolve => {
    chrome.bookmarks.getChildren(parentId, children => {
      const existing = children.find(c => !c.url && c.title === name);
      if (existing) return resolve(existing.id);

      chrome.bookmarks.create({ parentId, title: name }, folder => {
        resolve(folder.id);
      });
    });
  });
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

const LOG_KEY = "activity_log";

/**
 * Append an entry to the activity log.
 * @param {{ url: string, title: string, category: string, method: string }} entry
 */
export async function appendLog(entry) {
  return new Promise(resolve => {
    chrome.storage.local.get([LOG_KEY], result => {
      const log = result[LOG_KEY] || [];
      log.unshift({ ...entry, ts: Date.now() }); // newest first
      if (log.length > MAX_LOG_ENTRIES) log.length = MAX_LOG_ENTRIES;
      chrome.storage.local.set({ [LOG_KEY]: log }, resolve);
    });
  });
}

/**
 * Get the full activity log.
 * @returns {Promise<Array>}
 */
export async function getLog() {
  return new Promise(resolve => {
    chrome.storage.local.get([LOG_KEY], result => {
      resolve(result[LOG_KEY] || []);
    });
  });
}

/**
 * Clear the activity log.
 */
export async function clearLog() {
  return new Promise(resolve => {
    chrome.storage.local.remove([LOG_KEY], resolve);
  });
}

// ─── Settings ─────────────────────────────────────────────────────────────────

const SETTINGS_KEY = "settings";

export async function getSettings() {
  return new Promise(resolve => {
    chrome.storage.local.get([SETTINGS_KEY], result => {
      resolve(result[SETTINGS_KEY] || { apiKey: "", enabled: true });
    });
  });
}

export async function saveSettings(settings) {
  return new Promise(resolve => {
    chrome.storage.local.set({ [SETTINGS_KEY]: settings }, resolve);
  });
}
