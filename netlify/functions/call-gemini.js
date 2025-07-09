// This is an improved version of the function with better error handling.
// It runs on Netlify's servers, not in the user's browser.

exports.handler = async function(event) {
  // 1. Check if the request method is POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // 2. Securely get the API key from environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    
    // 3. CRITICAL CHECK: Fail clearly if the API key is not found.
    // This is the most common point of failure.
    if (!apiKey) {
      console.error("FATAL: GEMINI_API_KEY environment variable not set.");
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Server configuration error: API key not found." })
      };
    }

    // 4. Safely parse the incoming request body
    let prompt;
    try {
      const body = JSON.parse(event.body);
      prompt = body.prompt;
      if (!prompt) {
        throw new Error("'prompt' not found in request body.");
      }
    } catch (e) {
      console.error("Could not parse request body:", e);
      return { statusCode: 400, body: JSON.stringify({ error: "Bad Request: Invalid JSON or missing prompt." }) };
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }]
    };

    // 5. Call the official Gemini API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    // 6. Handle errors from the Gemini API itself (e.g., invalid key)
    if (!response.ok) {
      console.error("Error from Gemini API:", responseData);
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "An error occurred while calling the Gemini API.",
          details: responseData
        })
      };
    }
    
    // 7. Success: Send the result back to the browser
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(responseData)
    };

  } catch (error) {
    console.error('Unhandled Function Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An unexpected internal server error occurred.' })
    };
  }
};
