const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

class YouTubeController {
  constructor() {
    this.browser = null;
    this.page = null;
    this.lastQuery = '';
    this.lastResults = [];
    this.chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    this.userDataDir = path.join(__dirname, '.chrome_tri_profile');
  }

  async ensureBrowser() {
    if (this.browser && this.browser.connected) {
      if (this.page && !this.page.isClosed()) {
        return this.page;
      }
      const pages = await this.browser.pages();
      this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
      return this.page;
    }

    // Launch Chrome in visible mode with user profile and autoplay enabled
    this.browser = await puppeteer.launch({
      executablePath: this.chromePath,
      headless: false,
      defaultViewport: null,
      userDataDir: this.userDataDir,
      args: [
        '--start-maximized',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--autoplay-policy=no-user-gesture-required'
      ]
    });

    this.browser.on('disconnected', () => {
      this.browser = null;
      this.page = null;
    });

    const pages = await this.browser.pages();
    this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    return this.page;
  }

  async open() {
    try {
      const page = await this.ensureBrowser();
      await page.goto('https://www.youtube.com', { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.bringToFront();
      return { success: true, url: 'https://www.youtube.com' };
    } catch (err) {
      console.error('YouTube open error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async search(query) {
    try {
      const page = await this.ensureBrowser();
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.bringToFront();

      // Wait for video titles to render
      try {
        await page.waitForSelector('a#video-title', { timeout: 8000 });
      } catch (e) {}

      // Extract top 5 videos
      const videos = await page.evaluate(() => {
        const results = [];
        const seen = new Set();
        const titleElements = document.querySelectorAll('a#video-title');
        for (const el of titleElements) {
          const title = (el.getAttribute('title') || el.innerText || '').replace(/\s+/g, ' ').trim();
          const href = el.getAttribute('href') || '';
          if (title && href && href.includes('/watch?v=') && !href.includes('/shorts/')) {
            const cleanUrl = href.startsWith('http') ? href : 'https://www.youtube.com' + href;
            const videoId = (href.match(/v=([^&]+)/) || [])[1];
            if (videoId && !seen.has(videoId)) {
              seen.add(videoId);
              results.push({ title, url: cleanUrl });
            }
          }
          if (results.length >= 5) break;
        }
        return results;
      });

      this.lastQuery = query;
      this.lastResults = videos;

      return {
        success: true,
        query,
        results: videos
      };
    } catch (err) {
      console.error('YouTube search error:', err.message);
      return { success: false, error: err.message, query, results: [] };
    }
  }

  async clickVideo(identifier) {
    try {
      const page = await this.ensureBrowser();
      let target = null;

      // 1. Check if identifier is an index (number or 1-based index)
      let index = -1;
      if (typeof identifier === 'number') {
        index = identifier - 1;
      } else if (typeof identifier === 'string') {
        const lower = identifier.toLowerCase().trim();
        if (lower.includes('প্রথম') || lower.includes('১ম') || lower.includes('1st') || lower.includes('first') || lower === '1') {
          index = 0;
        } else if (lower.includes('দ্বিতীয়') || lower.includes('২য়') || lower.includes('2nd') || lower.includes('second') || lower === '2') {
          index = 1;
        } else if (lower.includes('তৃতীয়') || lower.includes('৩য়') || lower.includes('3rd') || lower.includes('third') || lower === '3') {
          index = 2;
        } else if (lower.includes('চতুর্থ') || lower.includes('৪র্থ') || lower.includes('4th') || lower.includes('fourth') || lower === '4') {
          index = 3;
        } else if (lower.includes('পঞ্চম') || lower.includes('৫ম') || lower.includes('5th') || lower.includes('fifth') || lower === '5') {
          index = 4;
        }
      }

      // If valid index found and we have search results
      if (index >= 0 && this.lastResults.length > index) {
        target = this.lastResults[index];
      }

      // 2. If not index or not found, try matching by title keyword
      if (!target && typeof identifier === 'string' && this.lastResults.length > 0) {
        const cleanId = identifier
          .replace(/গানটি|ভিডিওটি|গানটা|ভিডিওটা|গান|ভিডিও|ক্লিক|প্লে|চালাও|করো|কর|play|song|video|click/gi, '')
          .trim()
          .toLowerCase();

        if (cleanId.length > 1) {
          // Check substring match
          for (const item of this.lastResults) {
            if (item.title.toLowerCase().includes(cleanId)) {
              target = item;
              break;
            }
          }

          // Check word overlap match
          if (!target) {
            const words = cleanId.split(/\s+/).filter(w => w.length > 2);
            let bestScore = 0;
            for (const item of this.lastResults) {
              const itemLower = item.title.toLowerCase();
              let score = 0;
              for (const w of words) {
                if (itemLower.includes(w)) score++;
              }
              if (score > bestScore) {
                bestScore = score;
                target = item;
              }
            }
          }
        }
      }

      // 3. Fallback: If still no target, but we have results, take the first one
      if (!target && this.lastResults.length > 0) {
        target = this.lastResults[0];
      }

      // 4. Fallback: If we have NO previous results, search directly for identifier and take first!
      if (!target && typeof identifier === 'string') {
        const searchRes = await this.search(identifier);
        if (searchRes.success && searchRes.results.length > 0) {
          target = searchRes.results[0];
        }
      }

      if (!target) {
        return { success: false, error: 'ভিডিও খুঁজে পাওয়া যায়নি' };
      }

      // Navigate to target video
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.bringToFront();

      // Ensure video is playing and skip ad if possible
      setTimeout(async () => {
        try {
          if (this.page && !this.page.isClosed()) {
            await this.page.evaluate(() => {
              const video = document.querySelector('video');
              if (video && video.paused) {
                video.play().catch(() => {});
              }
              const skip = document.querySelector('.ytp-ad-skip-button, .ytp-skip-ad-button, .ytp-ad-skip-button-modern');
              if (skip) skip.click();
            });
          }
        } catch (e) {}
      }, 1500);

      return {
        success: true,
        title: target.title,
        url: target.url
      };
    } catch (err) {
      console.error('YouTube clickVideo error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new YouTubeController();
