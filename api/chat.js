const handler = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;

  // Return key status so we can debug in the browser
  if (!key) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set', key_present: false });
    return;
  }

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

    const text = await response.text();

    // Return full debug info if not OK
    if (!response.ok) {
      res.status(response.status).json({
        error: 'Anthropic API error',
        status: response.status,
        body: text.slice(0, 500),
        key_prefix: key.slice(0, 12)
      });
      return;
    }

    const data = JSON.parse(text);
    res.status(200).json(data);

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports = handler;
