export default async function handler(req, res) {
  // Enable CORS for the extension
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // The API key is securely stored in Vercel Environment Variables
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.error("API Key missing in environment");
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  try {
    // Extract payload from extension
    const { messages, model, temperature, max_tokens } = req.body;

    // Forward request to Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || "llama-3.3-70b-versatile",
        messages: messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 1024
      })
    });

    const data = await response.json();
    
    // Return only the safe response to the client
    return res.status(200).json(data);
  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}
