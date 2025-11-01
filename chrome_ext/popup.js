const SUPABASE_URL = 'https://hgmiikdkslxydjgkgfhv.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbWlpa2Rrc2x4eWRqZ2tnZmh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTQ2MDk2MywiZXhwIjoyMDc3MDM2OTYzfQ.0RpOS1cCicN3qChIsKO0aQrMP4g_ybJJSP7i10Lvbbo';

let pendingContent = null;
let selectedTags = new Set();
let tags = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Check if opened from context menu or extension icon
  const stored = await chrome.storage.local.get('pendingContent');
  
  if (stored.pendingContent) {
    pendingContent = stored.pendingContent;
    chrome.storage.local.remove('pendingContent');
    renderPreview();
  } else {
    // Opened from icon - capture current page
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await captureCurrentPage(tab);
  }
  
  await loadTags();
  
  document.getElementById('submitBtn').addEventListener('click', handleSubmit);
  document.getElementById('configLink').addEventListener('click', showConfig);
});

async function captureCurrentPage(tab) {
  const url = tab.url;
  
  // Detect if it's a video page
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    pendingContent = {
      type: 'video',
      url: url,
      pageUrl: url,
      title: tab.title
    };
  } else {
    pendingContent = {
      type: 'link',
      url: url,
      pageUrl: url,
      title: tab.title
    };
  }
  
  renderPreview();
}

async function extractVideoFromPage(tab) {
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Look for video elements
        const video = document.querySelector('video');
        if (video && video.src) {
          return video.src;
        }
        
        // Look for iframes that might contain videos
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
          const src = iframe.src;
          if (src && (
            src.includes('youtube.com/embed') ||
            src.includes('vimeo.com') ||
            src.includes('pinterest.com') ||
            src.includes('tiktok.com') ||
            src.includes('instagram.com')
          )) {
            return src;
          }
        }
        
        // Check for Pinterest video pins specifically
        const pinVideo = document.querySelector('[data-test-id="pin-closeup-video"]');
        if (pinVideo) {
          const source = pinVideo.querySelector('source');
          if (source && source.src) return source.src;
        }
        
        return null;
      }
    });
    
    return result?.result || null;
  } catch (error) {
    console.error('Failed to extract video:', error);
    return null;
  }
}

function renderPreview() {
  const preview = document.getElementById('preview');
  const captionGroup = document.getElementById('captionGroup');
  const titleInput = document.getElementById('title');
  
  if (!pendingContent) return;
  
  // Pre-fill title if available
  if (pendingContent.title) {
    titleInput.value = pendingContent.title;
  }
  
  switch (pendingContent.type) {
    case 'image':
      preview.innerHTML = `
        <strong>Image:</strong><br>
        <img src="${pendingContent.url}" alt="Preview">
      `;
      captionGroup.querySelector('label').textContent = 'Caption (optional, HTML supported)';
      break;
      
    case 'text':
      preview.innerHTML = `
        <strong>Selected text:</strong><br>
        ${pendingContent.text.substring(0, 200)}${pendingContent.text.length > 200 ? '...' : ''}
      `;
      captionGroup.style.display = 'none';
      break;
      
    case 'video':
      preview.innerHTML = `<strong>Video:</strong><br>${pendingContent.url}`;
      captionGroup.querySelector('label').textContent = 'Caption (optional, HTML supported)';
      break;
      
    case 'link':
      preview.innerHTML = `<strong>Link:</strong><br>${pendingContent.url}`;
      captionGroup.style.display = 'none';
      break;
  }
}

async function loadTags() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tags?select=*&order=name`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    
    tags = await response.json();
    renderTags();
  } catch (error) {
    document.getElementById('error').textContent = 'Failed to load tags. Check Supabase config.';
  }
}

function renderTags() {
  const grid = document.getElementById('tagsGrid');
  grid.innerHTML = tags.map(tag => `
    <button class="tag-btn" data-id="${tag.id}">
      ${tag.name}
    </button>
  `).join('');
  
  grid.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      if (selectedTags.has(id)) {
        selectedTags.delete(id);
        btn.classList.remove('selected');
      } else {
        selectedTags.add(id);
        btn.classList.add('selected');
      }
    });
  });
}

async function handleSubmit() {
  const title = document.getElementById('title').value.trim();
  const caption = document.getElementById('caption').value.trim();
  const error = document.getElementById('error');
  
  error.textContent = '';
  
  if (!title) {
    error.textContent = 'Title is required';
    return;
  }
  
  if (selectedTags.size === 0) {
    error.textContent = 'Select at least one tag';
    return;
  }
  
  // Build content_data based on type
  let contentData = {};
  let contentType = pendingContent.type;
  
  switch (pendingContent.type) {
    case 'text':
      contentData = { text: pendingContent.text };
      break;
      
    case 'image':
      contentData = { 
        imageUrl: pendingContent.url,
        ...(caption && { caption })
      };
      break;
      
    case 'video':
      let embedUrl = pendingContent.url;
      
      // YouTube conversions
      if (embedUrl.includes('youtube.com/watch')) {
        const urlObj = new URL(embedUrl);
        const videoId = urlObj.searchParams.get('v');
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      } else if (embedUrl.includes('youtu.be/')) {
        const videoId = embedUrl.split('youtu.be/')[1].split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
      // For Pinterest, Vimeo, TikTok, Instagram - keep the URL as-is if it's already an embed
      // Otherwise store the direct video URL
      
      contentData = { 
        embedUrl,
        ...(caption && { caption })
      };
      break;
      
    case 'link':
      contentData = { url: pendingContent.url };
      break;
  }
  
  try {
    // Insert content item
    const contentResponse = await fetch(`${SUPABASE_URL}/rest/v1/content_items`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        title,
        description: '',
        content_type: contentType,
        content_data: contentData
      })
    });
    
    const [newContent] = await contentResponse.json();
    
    // Insert tag links
    const tagLinks = Array.from(selectedTags).map(tagId => ({
      content_id: newContent.id,
      tag_id: tagId
    }));
    
    await fetch(`${SUPABASE_URL}/rest/v1/content_tags`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tagLinks)
    });
    
    // Success!
    document.body.innerHTML = '<div style="text-align:center;padding:40px;"><h2>✓ Saved!</h2><p>Content added to sadkidsclub</p></div>';
    setTimeout(() => window.close(), 1500);
    
  } catch (error) {
    error.textContent = 'Failed to save: ' + error.message;
  }
}

function showConfig(e) {
  e.preventDefault();
  alert('Edit SUPABASE_URL and SUPABASE_SERVICE_KEY in popup.js');
}