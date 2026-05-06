// SmartJobFilter Content Script
// Connected to live Vercel Backend
var BACKEND_URL = 'https://job-filter-kappa.vercel.app/api/chat';
var currentSite = null;
if (window.location.hostname.includes('linkedin.com')) currentSite = 'linkedin';
else if (window.location.hostname.includes('indeed.com')) currentSite = 'indeed';
else if (window.location.hostname.includes('glassdoor.com')) currentSite = 'glassdoor';
else if (window.location.hostname.includes('internshala.com')) currentSite = 'internshala';

function findJobCards() {
  if (currentSite === 'linkedin') {
    // LinkedIn uses different DOM structures on different pages.
    // Strategy: Find any clickable card that contains a job title link.
    // Job cards always have an <a> tag pointing to /jobs/view/ or /jobs/collections/
    // Target ONLY the job listing column to avoid navigation bars
    var listContainer = document.querySelector('.scaffold-layout__list, .jobs-search-results-list, [class*="jobs-search-results-list"]');
    var allLinks = (listContainer || document).querySelectorAll('a[href*="/jobs/view/"]');
    var cardSet = new Set();
    
    allLinks.forEach(function(link) {
      // Skip if this link is inside headers, navs, or filter bars/pills
      if (link.closest('header, nav, [class*="navbar"], [class*="global-nav"], [class*="search-reusables"], [class*="filter"], [class*="pills"], [class*="results-list__header"]')) return;
      
      // Walk up to find the card container
      var card = link.closest('li') || link.closest('div[class*="card"]') || link.closest('[data-job-id]');
      if (!card) {
        var parent = link.parentElement;
        for (var i = 0; i < 5; i++) {
          if (parent && parent.offsetHeight > 60 && parent.offsetHeight < 400) {
            card = parent;
            break;
          }
          if (parent) parent = parent.parentElement;
        }
      }
      // Double check card location to ensure it's not in a header/filter area
      if (card && card.offsetHeight > 50 && !card.closest('header, nav, [class*="navbar"], [class*="global-nav"], [class*="filter"], [class*="pills"]')) {
        cardSet.add(card);
      }
    });

    var cards = Array.from(cardSet);
    console.log('[SmartJobFilter] Found', cards.length, 'LinkedIn job cards');
    return cards;
  }
  
  if (currentSite === 'indeed') return Array.from(document.querySelectorAll('.job_seen_beacon, .slider_container'));
  if (currentSite === 'glassdoor') return Array.from(document.querySelectorAll('.react-job-listing'));
  if (currentSite === 'internshala') return Array.from(document.querySelectorAll('.internship_meta, .job_meta'));
  return [];
}

function extractJobInfo(card) {
  var title = '';
  var desc = '';
  var loc = '';

  if (currentSite === 'linkedin') {
    // Title: Look for the main job title link or strong/bold text
    var titleEl = card.querySelector('a[href*="/jobs/view/"] strong, a[href*="/jobs/view/"], strong, [class*="title"]');
    title = titleEl ? titleEl.innerText.trim() : '';
    
    // Company/desc: second line of text, usually company name
    var allText = card.innerText || '';
    var lines = allText.split('\n').filter(function(l) { return l.trim().length > 0; });
    if (lines.length > 1) desc = lines[1].trim();
    if (lines.length > 2) loc = lines[2].trim();
    
  } else if (currentSite === 'indeed') {
    var t = card.querySelector('.jobTitle'); title = t ? t.innerText.trim() : '';
    var d = card.querySelector('.job-snippet'); desc = d ? d.innerText.trim() : '';
    var l = card.querySelector('.companyLocation'); loc = l ? l.innerText.trim() : '';
    
  } else if (currentSite === 'glassdoor') {
    var t = card.querySelector('.job-title'); title = t ? t.innerText.trim() : '';
    var d = card.querySelector('.job-description'); desc = d ? d.innerText.trim() : '';
    var l = card.querySelector('.location'); loc = l ? l.innerText.trim() : '';
    
  } else if (currentSite === 'internshala') {
    var t = card.querySelector('.profile'); title = t ? t.innerText.trim() : '';
    var d = card.querySelector('.company_name'); desc = d ? d.innerText.trim() : '';
    var l = card.querySelector('.location_link'); loc = l ? l.innerText.trim() : '';
  }

  // Fallback: use card text
  var fullText = (title + ' ' + desc).trim();
  if (!fullText && card.innerText) {
    fullText = card.innerText.substring(0, 500).trim();
    if (!title) {
      var firstLine = fullText.split('\n')[0];
      title = firstLine ? firstLine.trim() : '';
    }
  }

  return { title: title, desc: desc, loc: loc, fullText: fullText };
}

async function processJobCards() {
  if (!currentSite) return;

  // CRITICAL: Check if extension context is still valid
  if (!chrome.runtime || !chrome.runtime.id) {
    cleanUpSJF();
    return;
  }

  var data;
  try {
    data = await chrome.storage.local.get(['userProfile', 'preferences', 'filterEnabled']);
    if (data.filterEnabled === false) {
      cleanUpSJF();
      return;
    }
  } catch (e) {
    cleanUpSJF();
    return;
  }

  var cards = findJobCards();
  if (cards.length === 0) return;

  // CRITICAL FIX: Only calculate scores if a resume (userProfile) exists
  if (!data.userProfile || !data.userProfile.skills || data.userProfile.skills.length === 0) {
    console.log('[SmartJobFilter] No resume data found. Skipping score calculation.');
    return;
  }

  cards.forEach(function(card) {
    if (card.querySelector('.sjf-badge-wrapper')) return;
    if (card.offsetHeight < 40) return;

    var info = extractJobInfo(card);
    if (!info.fullText || info.fullText.length < 5) return;

    var matchData = JobMatcher.calculateScore(info.fullText, data.userProfile, data.preferences, info.title, info.loc);
    var score = matchData.score !== undefined ? matchData.score : matchData;
    var color = JobMatcher.getBadgeColor(score);

    // Create Badge
    var badgeWrapper = document.createElement('div');
    badgeWrapper.className = 'sjf-badge-wrapper';
    badgeWrapper.style.position = 'relative';
    badgeWrapper.style.display = 'inline-block';
    badgeWrapper.style.zIndex = '100';

    var badge = document.createElement('div');
    badge.className = 'sjf-badge';
    badge.style.backgroundColor = color + '15';
    badge.style.color = color;
    badge.style.border = '1px solid ' + color + '80';
    badge.style.cursor = 'pointer';
    badge.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Match: ' + score + '%';
    badgeWrapper.appendChild(badge);

    // Click to open modal
    badge.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      // Get full job description from the right panel
      var activeFullText = info.fullText;
      var rightPanel = document.querySelector('[class*="description-content"], [class*="job-details"], .jobs-description-content__text, .jobs-description__content, .jobs-box__html-content');
      if (rightPanel && rightPanel.innerText.length > 100) {
        activeFullText = info.title + ' ' + rightPanel.innerText;
      }

      var detailedMatch = JobMatcher.calculateScore(activeFullText, data.userProfile, data.preferences, info.title, info.loc);

      var overlay = document.createElement('div');
      overlay.className = 'sjf-modal-overlay';
      var modal = document.createElement('div');
      modal.className = 'sjf-modal-content';

      var html = '<div class="sjf-modal-close" id="sjf-close-btn">';
      html += '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
      html += '</div>';
      html += detailedMatch.htmlDetails;
      html += '<div id="sjf-ai-results" style="display: none;"></div>';
      html += '<button class="sjf-prompt-btn" id="sjf-generate-ai">';
      html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"></path></svg>';
      html += ' Deep search</button>';

      modal.innerHTML = html;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      modal.querySelector('#sjf-close-btn').addEventListener('click', function() { overlay.remove(); });
      overlay.addEventListener('click', function(ev) { if (ev.target === overlay) overlay.remove(); });

      // Deep Search AI
      modal.querySelector('#sjf-generate-ai').addEventListener('click', async function(btnE) {
        var btn = btnE.currentTarget;
        var resultsDiv = modal.querySelector('#sjf-ai-results');
        btn.innerHTML = 'Analyzing...';
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';
        resultsDiv.style.display = 'block';
        resultsDiv.innerHTML = '<i>⏳ Connecting to Deep Search AI...</i>';

        try {
          var resumeText = (data.userProfile && data.userProfile.rawText) ? data.userProfile.rawText.substring(0, 4000) : 'No resume text';
          var jobText = activeFullText.substring(0, 4000);

          var prompt = 'You are an expert technical recruiter. Analyze resume vs job description. Be specific.\n\n';
          prompt += '🎯 VERIFIED MATCH SCORE: (Give a number 0-100)\n\n';
          prompt += '🔥 TOP STRENGTHS:\n• (strength 1)\n• (strength 2)\n• (strength 3)\n\n';
          prompt += '⚠️ KEY GAPS:\n• (gap 1)\n• (gap 2)\n• (gap 3)\n\n';
          prompt += '💡 HOW TO STAND OUT:\n(2 sentences)\n\n';
          prompt += '📊 HONEST ASSESSMENT:\n(1 sentence)\n\n';
          prompt += '--- RESUME ---\n' + resumeText + '\n\n--- JOB ---\n' + jobText;

          var r = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: "You are an expert technical recruiter and career advisor. You must read the 'About the job' section with extreme care to identify subtle requirements and cultural fit. Note: Treat 'ML' as Machine Learning and 'DL' as Deep Learning. Analyze resume vs job description. Be specific and concise." },
                { role: "user", content: prompt }
              ],
              temperature: 0.7,
              max_tokens: 1024
            })
          });
          
          var res = await r.json();
          if (res.error) throw new Error(res.error.message);
          aiText = res.choices[0].message.content;
          if (!aiText) throw new Error('No response from AI');
          aiText = aiText.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f8fafc">$1</strong>');
          aiText = aiText.replace(/(🎯[^\n]+)/g, '<div style="color:#818cf8;font-weight:800;font-size:16px;margin-bottom:15px;border-bottom:1px solid rgba(129,140,248,0.2);padding-bottom:10px">$1</div>');
          aiText = aiText.replace(/(🔥[^\n]+)/g, '<div style="color:#fb923c;font-weight:700;margin-top:10px">$1</div>');
          aiText = aiText.replace(/(⚠️[^\n]+)/g, '<div style="color:#fbbf24;font-weight:700;margin-top:10px">$1</div>');
          aiText = aiText.replace(/(💡[^\n]+)/g, '<div style="color:#34d399;font-weight:700;margin-top:10px">$1</div>');
          aiText = aiText.replace(/(📊[^\n]+)/g, '<div style="color:#60a5fa;font-weight:700;margin-top:10px">$1</div>');
          resultsDiv.innerHTML = aiText;
          btn.style.display = 'none';
        } catch (err) {
          var msg = err.message;
          if (msg.includes('quota') || msg.includes('rate') || msg.includes('limit')) msg = '⏳ Rate limit. Wait 60s and retry.';
          resultsDiv.innerHTML = '<span style="color:#ef4444">' + msg + '</span>';
          btn.innerHTML = 'Try Again';
          btn.style.opacity = '1';
          btn.style.pointerEvents = 'auto';
        }
      });
    });

    // Insert badge into the card
    card.appendChild(badgeWrapper);

    // Visual styling
    if (score < 40) {
      card.style.opacity = '0.4';
      card.style.transition = 'opacity 0.3s';
    } else {
      card.style.opacity = '1';
    }
    if (score >= 80) {
      card.style.boxShadow = '0 0 0 2px ' + color + '80';
    }
  });
}

// Observe DOM changes
var observer = new MutationObserver(function() {
  clearTimeout(window.sjfTimeout);
  window.sjfTimeout = setTimeout(processJobCards, 300);
});

if (currentSite) {
  console.log('[SmartJobFilter] Extension loaded for', currentSite);
  observer.observe(document.body, { childList: true, subtree: true });
  // More frequent retries for SPA content
  setTimeout(processJobCards, 500);
  setTimeout(processJobCards, 1500);
  setTimeout(processJobCards, 3000);
  setTimeout(processJobCards, 5000);
}

// Listen for popup settings change
chrome.runtime.onMessage.addListener(function(req) {
  if (req.action === 'reapplyFilter') {
    document.querySelectorAll('.sjf-badge-wrapper').forEach(function(el) { el.remove(); });
    processJobCards();
  }
});

// SPA navigation detection
var lastUrl = location.href;
setInterval(function() {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    document.querySelectorAll('.sjf-badge-wrapper').forEach(function(el) { el.remove(); });
    setTimeout(processJobCards, 2000);
  }
}, 1000);

function cleanUpSJF() {
  document.querySelectorAll('.sjf-badge-wrapper, .sjf-modal-overlay, .sjf-chat-widget, #sjf-chatbot-container').forEach(function(el) { 
    el.remove(); 
  });
}
