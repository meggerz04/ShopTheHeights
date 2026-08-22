export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Debug: confirm the key is being read
  const key = process.env.ANTHROPIC_API_KEY;
  console.log('Key present:', !!key, '| Key prefix:', key ? key.slice(0, 10) : 'MISSING');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    // Debug: log what Anthropic actually returned
    const text = await response.text();
    console.log('Anthropic status:', response.status);
    console.log('Anthropic response:', text.slice(0, 300));

    const data = JSON.parse(text);
    res.status(response.status).json(data);
  } catch(e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
