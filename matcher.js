// Matching Algorithm Module
class JobMatcher {
  static calculateScore(jobDescription, userProfile, preferences, jobTitle, jobLocation) {
    const fullText = `${jobTitle} ${jobDescription}`;
    
    // 1. Extract skills required by the job
    const jobSkills = typeof ResumeParser !== 'undefined' ? ResumeParser.extractKeywords(fullText) : [];
    const jobSkillsSet = new Set(jobSkills);
    
    // 2. Extract user skills
    const userSkillsSet = new Set(userProfile && userProfile.skills ? userProfile.skills : []);
    
    // 3. Find intersection (Matched) and difference (Missing)
    const matchedSkills = [];
    const missingSkills = [];
    
    jobSkillsSet.forEach(skill => {
      if (userSkillsSet.has(skill)) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    let score = 0;
    
    // 4. Skills Score (up to 60%)
    let skillsMatchScore = 0;
    if (jobSkillsSet.size === 0) {
      skillsMatchScore = 40; // Neutral if no skills listed
    } else {
      const matchRatio = matchedSkills.length / jobSkillsSet.size;
      skillsMatchScore = matchRatio * 60;
    }

    // 5. Title/Role Match Bonus (15%)
    let titleMatchScore = 0;
    const titleLower = (jobTitle || "").toLowerCase();
    const roleKeywords = ['analyst', 'engineer', 'developer', 'manager', 'designer', 'consultant', 'intern'];
    
    // Check if role name matches user skills or common patterns
    let hasRoleMatch = false;
    userSkillsSet.forEach(skill => {
      if (titleLower.includes(skill.toLowerCase())) hasRoleMatch = true;
    });
    
    // Fallback: if user has any skills and job is a common role, give partial credit
    if (!hasRoleMatch && roleKeywords.some(rk => titleLower.includes(rk))) {
      titleMatchScore = 10;
    } else if (hasRoleMatch) {
      titleMatchScore = 15;
    }

    // 6. Preferences Match (15%)
    let prefScore = 15;
    const jobDescLower = jobDescription.toLowerCase();
    
    if (preferences) {
      if (preferences.workMode && preferences.workMode !== 'any') {
        const isRemote = jobDescLower.includes('remote') || titleLower.includes('remote');
        const isHybrid = jobDescLower.includes('hybrid') || titleLower.includes('hybrid');
        const isOnsite = jobDescLower.includes('on-site') || jobDescLower.includes('onsite') || titleLower.includes('on-site');
        
        let modeMatched = false;
        if (preferences.workMode === 'remote' && isRemote) modeMatched = true;
        if (preferences.workMode === 'hybrid' && isHybrid) modeMatched = true;
        if (preferences.workMode === 'onsite' && isOnsite) modeMatched = true;
        
        if (!modeMatched && (isRemote || isHybrid || isOnsite)) prefScore -= 5;
      }
      
      if (preferences.jobType && preferences.jobType !== 'any') {
        const typeMatch = jobDescLower.includes(preferences.jobType) || titleLower.includes(preferences.jobType);
        if (!typeMatch) prefScore -= 5;
      }
    }

    // 7. Experience (10%)
    let expScore = 10;
    const expRegex = /(\d+)\+?\s*years?/i;
    const match = jobDescLower.match(expRegex);
    if (match && parseInt(match[1]) > 3) {
      if (preferences && preferences.jobType === 'internship') expScore -= 10;
      else expScore -= 5;
    }

    score = skillsMatchScore + titleMatchScore + prefScore + expScore;
    
    // CRITICAL: Perfect Match Bonus
    // If there are NO missing skills and the user meets core preferences, push to 100%
    if (missingSkills.length === 0 && jobSkillsSet.size > 0 && prefScore >= 10) {
      score = 100;
    }

    // Clamp
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Generate HTML for details
    const matchedHtml = matchedSkills.length > 0 
      ? matchedSkills.map(s => `<span class="sjf-tag success">${s}</span>`).join('')
      : '<span style="color: #94a3b8; font-size: 12px;">No specific skills found</span>';
      
    const missingHtml = missingSkills.length > 0 
      ? missingSkills.map(s => `<span class="sjf-tag danger">${s}</span>`).join('')
      : '<span style="color: #94a3b8; font-size: 12px;">None! You meet all requirements.</span>';

    const htmlDetails = `
      <div style="font-family: 'Outfit', sans-serif; padding-bottom: 8px;">
        <h3 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: #fff;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          Match Analysis
        </h3>
        
        <div class="sjf-section">
          <strong><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg> Strengths</strong>
          <div class="sjf-tags-container">${matchedHtml}</div>
        </div>
        
        <div class="sjf-section" style="margin-top: 24px;">
          <strong><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> Skill Gaps</strong>
          <div class="sjf-tags-container">${missingHtml}</div>
        </div>
        
        <div class="sjf-breakdown">
          <div class="sjf-stat-item">
            <span class="sjf-stat-label">Skills</span>
            <span class="sjf-stat-value">${Math.round(skillsMatchScore)}<small style="font-size: 10px; color: #64748b;">/60</small></span>
          </div>
          <div class="sjf-stat-item">
            <span class="sjf-stat-label">Title</span>
            <span class="sjf-stat-value">${titleMatchScore}<small style="font-size: 10px; color: #64748b;">/15</small></span>
          </div>
          <div class="sjf-stat-item">
            <span class="sjf-stat-label">Prefs</span>
            <span class="sjf-stat-value">${prefScore}<small style="font-size: 10px; color: #64748b;">/15</small></span>
          </div>
          <div class="sjf-stat-item">
            <span class="sjf-stat-label">Exp</span>
            <span class="sjf-stat-value">${expScore}<small style="font-size: 10px; color: #64748b;">/10</small></span>
          </div>
        </div>
      </div>
    `;

    return {
      score: score,
      htmlDetails: htmlDetails,
      missingSkillsList: missingSkills
    };
  }

  static getBadgeColor(score) {
    if (score >= 70) return '#10b981'; // Green
    if (score >= 40) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  }
}
