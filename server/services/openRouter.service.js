import fetch from "node-fetch";

export async function askAi(messages, { expectJson = false } = {}) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b:free",
      messages
    })
  });

  const data = await response.json();
  const aiMessage = data.choices?.[0]?.message?.content;

  if (!aiMessage) throw new Error("AI API Error: No content returned");
  
  if (expectJson) {
    let raw = aiMessage.trim();
    raw = raw.replace(/]_decl$/, ']').replace(/}_decl$/, '}');
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error("Failed to parse AI JSON:", raw);
      throw new Error("AI API Error: Invalid JSON format");
    }
  } else {
    // plain text mode
    return aiMessage.trim();
  }
}
