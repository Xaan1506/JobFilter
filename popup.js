document.addEventListener('DOMContentLoaded', async () => {
  const fileInput = document.getElementById('resume-upload');
  const dropArea = document.getElementById('drop-area');
  const uploadStatus = document.getElementById('upload-status');
  const saveBtn = document.getElementById('save-preferences');
  const skillsContainer = document.getElementById('extracted-skills');
  const toggleFilter = document.getElementById('toggle-filter');
  const removeBtn = document.getElementById('remove-resume');
  const resumeActions = document.getElementById('resume-actions');

  // Load existing data
  chrome.storage.local.get(['userProfile', 'preferences', 'filterEnabled'], (data) => {
    if (data.userProfile && data.userProfile.skills) {
      renderSkills(data.userProfile.skills);
      uploadStatus.textContent = "Resume loaded from storage.";
      uploadStatus.style.display = 'block';
      dropArea.style.display = 'none';
      resumeActions.style.display = 'block';
    }
    if (data.preferences) {
      document.getElementById('job-type').value = data.preferences.jobType || 'any';
      document.getElementById('work-mode').value = data.preferences.workMode || 'any';
      document.getElementById('location').value = data.preferences.location || '';
    }
    if (data.filterEnabled !== undefined) {
      toggleFilter.checked = data.filterEnabled;
    }
  });

  // Toggle Listener
  toggleFilter.addEventListener('change', (e) => {
    chrome.storage.local.set({ filterEnabled: e.target.checked }, () => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "reapplyFilter" }).catch(() => {});
      });
    });
  });

  // File Upload Handlers
  dropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropArea.classList.add('is-active');
  });

  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('is-active');
  });

  dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    dropArea.classList.remove('is-active');
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files;
      handleFile(fileInput.files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFile(fileInput.files[0]);
    }
  });

  removeBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['userProfile'], () => {
      skillsContainer.innerHTML = '';
      uploadStatus.style.display = 'none';
      dropArea.style.display = 'flex';
      resumeActions.style.display = 'none';
      fileInput.value = '';
      
      // Notify content script to clear badges
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if(tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { action: "reapplyFilter" }).catch(() => {});
      });
    });
  });

  async function handleFile(file) {
    uploadStatus.textContent = "Analyzing resume deeply (this may take a few seconds)...";
    uploadStatus.style.display = 'block';
    uploadStatus.style.color = 'var(--text-secondary)';

    try {
      // Simulate slight delay for robust UX feel
      await new Promise(r => setTimeout(r, 600));

      const text = await ResumeParser.extractText(file);
      const skills = ResumeParser.extractKeywords(text);
      
      const userProfile = {
        rawText: text,
        skills: skills
      };

      await chrome.storage.local.set({ userProfile });
      
      uploadStatus.textContent = "Resume parsed successfully!";
      uploadStatus.style.color = 'var(--success)';
      dropArea.style.display = 'none';
      resumeActions.style.display = 'block';
      renderSkills(skills);
    } catch (error) {
      console.error(error);
      uploadStatus.textContent = "Error parsing file.";
      uploadStatus.style.color = '#ef4444'; // Red
    }
  }

  function renderSkills(skills) {
    skillsContainer.innerHTML = '';
    if (skills.length === 0) {
      skillsContainer.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-secondary)">No specific tech skills found.</span>';
      return;
    }
    skills.forEach(skill => {
      const el = document.createElement('span');
      el.className = 'skill-tag';
      el.textContent = skill;
      skillsContainer.appendChild(el);
    });
  }

  // Save Preferences
  saveBtn.addEventListener('click', () => {
    const preferences = {
      jobType: document.getElementById('job-type').value,
      workMode: document.getElementById('work-mode').value,
      location: document.getElementById('location').value
    };

    chrome.storage.local.set({ preferences, filterEnabled: toggleFilter.checked }, () => {
      saveBtn.textContent = "Saved!";
      setTimeout(() => { saveBtn.textContent = "Save & Filter"; }, 2000);
      
      // Notify active tab to re-run filter
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if(tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "reapplyFilter" }).catch(() => {});
        }
      });
    });
  });
});
