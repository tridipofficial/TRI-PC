const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class YouTubeController {
  constructor() {
    this.chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    this.profileDir = 'Profile 6';
    this.desktopShortcut = 'C:\\Users\\USER\\Desktop\\YouTube.lnk';
    this.lastQuery = '';
    this.lastResults = [];
  }

  bringToFront(keyword = 'YouTube') {
    try {
      const psCmd = `
        $ws = New-Object -ComObject WScript.Shell
        $ws.AppActivate('${keyword}')
      `;
      spawn('powershell', ['-NoProfile', '-Command', psCmd], { detached: true, stdio: 'ignore' }).unref();
    } catch (e) {}
  }

  async open() {
    try {
      const url = 'https://www.youtube.com';
      spawn('cmd.exe', ['/c', 'start', '""', this.chromePath, `--app=${url}`], { detached: true, stdio: 'ignore' }).unref();
      return { success: true, url };
    } catch (err) {
      console.error('YouTube open error:', err.message);
      return { success: false, error: err.message };
    }
  }

  async fetchSearchResults(query) {
    const tryFetch = async (q) => {
      try {
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
        const res = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9,bn;q=0.8'
          },
          signal: AbortSignal.timeout(8000)
        });
        const html = await res.text();
        const match = html.match(/var ytInitialData = ({[\s\S]+?});<\/script>/);
        if (match) {
          const data = JSON.parse(match[1]);
          const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
          const videos = [];
          const seen = new Set();
          for (const item of contents) {
            if (item.videoRenderer) {
              const v = item.videoRenderer;
              const title = (v.title?.runs?.[0]?.text || '').replace(/\s+/g, ' ').trim();
              const videoId = v.videoId;
              if (title && videoId && !seen.has(videoId)) {
                seen.add(videoId);
                videos.push({
                  title,
                  url: `https://www.youtube.com/watch?v=${videoId}`
                });
              }
              if (videos.length >= 5) break;
            }
          }
          if (videos.length > 0) return videos;
        }
      } catch (e) {
        console.warn('Fetch search fallback error:', e.message);
      }
      return [];
    };

    let videos = await tryFetch(query);
    if (videos.length === 0 && (query.includes('গান') || query.includes('হিন্দি') || query.includes('বাংলা') || query.includes('song'))) {
      const fallbackQ = query.replace(/হিন্দি/g, 'hindi').replace(/বাংলা/g, 'bangla').replace(/গান/g, 'songs').replace(/নতুন/g, 'latest');
      videos = await tryFetch(fallbackQ);
    }
    return videos;
  }

  async search(query) {
    try {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

      // Launch/Navigate YouTube App window on TRIDIP Sir's desktop directly
      spawn('cmd.exe', ['/c', 'start', '""', this.chromePath, `--app=${searchUrl}`], { detached: true, stdio: 'ignore' }).unref();

      // Fetch top search results in parallel (sub-250ms)
      const videos = await this.fetchSearchResults(query);
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
      let target = null;

      // 1. Ordinal index resolution (1 to 5)
      let index = -1;
      if (typeof identifier === 'number') {
        index = identifier - 1;
      } else if (typeof identifier === 'string') {
        const lower = identifier.toLowerCase().trim();
        if (lower.includes('প্রথম') || lower.includes('১ম') || lower.includes('১ নাম্বার') || lower.includes('এক নম্বর') || lower.includes('1st') || lower.includes('first') || lower === '1') {
          index = 0;
        } else if (lower.includes('দ্বিতীয়') || lower.includes('২য়') || lower.includes('২ নাম্বার') || lower.includes('দুই নম্বর') || lower.includes('2nd') || lower.includes('second') || lower === '2') {
          index = 1;
        } else if (lower.includes('তৃতীয়') || lower.includes('৩য়') || lower.includes('৩ নাম্বার') || lower.includes('তিন নম্বর') || lower.includes('3rd') || lower.includes('third') || lower === '3') {
          index = 2;
        } else if (lower.includes('চতুর্থ') || lower.includes('৪র্থ') || lower.includes('৪ নাম্বার') || lower.includes('char') || lower === '4') {
          index = 3;
        } else if (lower.includes('পঞ্চম') || lower.includes('৫ম') || lower.includes('৫ নাম্বার') || lower.includes('five') || lower === '5') {
          index = 4;
        }
      }

      if (index >= 0 && this.lastResults.length > index) {
        target = this.lastResults[index];
      }

      // 2. Match by title if not index
      if (!target && typeof identifier === 'string' && this.lastResults.length > 0) {
        const cleanId = identifier
          .replace(/গানটি|ভিডিওটি|গানটা|ভিডিওটা|গান|ভিডিও|ক্লিক|প্লে|চালাও|বাজাও|করো|কর|play|song|video|click/gi, '')
          .trim()
          .toLowerCase();

        if (cleanId.length > 1) {
          // Substring match
          for (const item of this.lastResults) {
            if (item.title.toLowerCase().includes(cleanId)) {
              target = item;
              break;
            }
          }

          // Token overlap match
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

      // 3. Fallback: if search results exist, pick first
      if (!target && this.lastResults.length > 0) {
        target = this.lastResults[0];
      }

      // 4. Fallback: if no search results cached, fetch directly for the song name!
      if (!target && typeof identifier === 'string') {
        const freshVideos = await this.fetchSearchResults(identifier);
        if (freshVideos.length > 0) {
          target = freshVideos[0];
          this.lastResults = freshVideos;
        }
      }

      if (!target) {
        return { success: false, error: 'ভিডিও খুঁজে পাওয়া যায়নি' };
      }

      // 5. Open video directly in the YouTube App window
      spawn('cmd.exe', ['/c', 'start', '""', this.chromePath, `--app=${target.url}`], { detached: true, stdio: 'ignore' }).unref();

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

  async close() {
    try {
      spawn('cmd.exe', ['/c', 'taskkill /F /FI "WINDOWTITLE eq YouTube*" /T'], { detached: true, stdio: 'ignore' }).unref();
      this.lastResults = [];
      this.lastQuery = '';

      return {
        success: true,
        message: 'YouTube উইন্ডো সফলভাবে বন্ধ করা হয়েছে।'
      };
    } catch (err) {
      console.error('YouTube close error:', err.message);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new YouTubeController();
