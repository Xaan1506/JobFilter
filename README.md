# SmartJobFilter - AI Job Matcher

SmartJobFilter is a powerful Chrome Extension that intelligently filters and highlights job listings based on your resume and preferences. It supports major platforms like LinkedIn, Indeed, Glassdoor, and Internshala.

## Features

- **Resume Parsing**: Upload your PDF or DOCX resume to extract your core skills.
- **Smart Matching Engine**: Calculates a match score (0-100%) comparing your profile and preferences to job descriptions.
- **Job Preferences**: Filter by job type (Internship, Full-time, etc.), work mode (Remote, Hybrid, On-site), and location.
- **Visual Highlighting**: Injects a clean, modern UI directly into job cards indicating your match percentage. Low-match jobs are dimmed to save you time.

## Setup Instructions

1. **Download the Extension**: Ensure you have this entire directory on your local machine. All dependencies (like pdf.js and mammoth.js) are already included.
2. **Open Chrome Extensions**: In Google Chrome, go to `chrome://extensions/`.
3. **Enable Developer Mode**: Toggle the "Developer mode" switch in the top right corner.
4. **Load Unpacked**: Click the "Load unpacked" button in the top left corner.
5. **Select Directory**: Choose the `Internship filter` folder containing the `manifest.json` file.
6. **Pin the Extension**: For easy access, pin the SmartJobFilter extension to your toolbar.

## How to Test

1. Click on the extension icon to open the popup.
2. Upload a sample Resume (PDF or DOCX).
3. Set your preferences (e.g., Job Type: Internship, Work Mode: Remote).
4. Click **Save & Filter**.
5. Navigate to one of the supported job sites:
   - [LinkedIn Jobs](https://www.linkedin.com/jobs)
   - [Indeed Jobs](https://www.indeed.com/)
   - [Glassdoor Jobs](https://www.glassdoor.com/Job/)
   - [Internshala](https://internshala.com/internships/)
6. Observe the job cards: A match score badge will appear, and low-match jobs will be dimmed.

## Security & Privacy
- All resume parsing happens **locally** in your browser.
- Your resume data is stored securely in Chrome's local storage. No data is sent to external servers.

## Suggestions for Future Improvements
- **OpenAI Integration**: Replace basic keyword matching with semantic embeddings using the OpenAI API.
- **Auto-Apply**: Automate the application process on platforms like LinkedIn.
- **Analytics Dashboard**: Track how many high-match jobs you've viewed and applied to.
- **Notification System**: Get browser alerts when a 90%+ match job is posted.
