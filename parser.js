// Resume text extraction logic
class ResumeParser {
  static async extractText(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const arrayBuffer = await file.arrayBuffer();

    if (ext === 'pdf') {
      return await this.parsePDF(arrayBuffer);
    } else if (ext === 'docx') {
      return await this.parseDOCX(arrayBuffer);
    } else {
      throw new Error("Unsupported file format");
    }
  }

  static async parsePDF(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error("PDF.js is not loaded.");
    }
    // PDF.js worker is now loaded via manifest.json
    const pdf = await pdfjsLib.getDocument({ 
      data: arrayBuffer, 
      disableWorker: true,
      verbosity: 0
    }).promise;
    let fullText = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      fullText += strings.join(" ") + " ";
    }
    
    return fullText;
  }

  static async parseDOCX(arrayBuffer) {
    if (typeof mammoth === 'undefined') {
      throw new Error("Mammoth.js is not loaded.");
    }
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
    return result.value;
  }

  static extractKeywords(text) {
    // Extensive list of skills for parsing
    const commonSkills = [
      "JavaScript", "Python", "Java", "C++", "C#", "Ruby", "PHP", "Swift", "Kotlin", "Go", "Rust", "Dart",
      "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "Spring", "Laravel", ".NET",
      "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "Firebase", "Cassandra", "Elasticsearch",
      "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "GitHub", "GitLab", "CI/CD", "Jenkins", "GitHub Actions", "Docker Compose",
      "Machine Learning", "AI", "Data Science", "Deep Learning", "NLP", "TensorFlow", "PyTorch", "LLM", "Generative AI", "GenAI", "RAG", "OpenAI", "Hugging Face",
      "HTML", "CSS", "SASS", "LESS", "TypeScript", "Tailwind", "Bootstrap", "Next.js", "Nuxt.js",
      "GraphQL", "REST API", "OAuth 2.0", "Figma", "UI/UX", "Agile", "Scrum", "Jira", "Linux", "Bash", "Excel", "Data Structure"
    ];

    const foundSkills = [];
    const lowerText = " " + text.toLowerCase() + " ";

    for (const skill of commonSkills) {
      // Escape special chars
      const escapedSkill = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Use whitespace/punctuation boundaries to safely match terms like C++ and .NET
      const regex = new RegExp(`(?:^|\\s|[.,/()!?;:])${escapedSkill}(?=\\s|[.,/()!?;:]|$)`, 'i');
      if (regex.test(lowerText)) {
        foundSkills.push(skill);
      }
    }

    return foundSkills;
  }
}
