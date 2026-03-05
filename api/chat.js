export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { messages } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Valid messages array is required.' });
        }

        const API_KEY = process.env.OPENROUTER_API_KEY;

        if (!API_KEY) {
            return res.status(500).json({ error: 'Server configuration error.' });
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-3-8b-instruct',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Saheli AI, a helpful, empathetic, and friendly assistant for a women’s community platform called NIRBHAYA. You help users navigate the app, join communities, write stories, and provide guidance in a supportive and uplifting tone. Keep your responses concise and readable.'
                    },
                    ...messages
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenRouter API Error:', errorText);
            return res.status(response.status).json({ error: 'Failed to communicate with AI model.' });
        }

        const data = await response.json();
        const botMessage = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : 'I am sorry, I am unable to respond at this moment.';

        res.status(200).json({ reply: botMessage });
    } catch (error) {
        console.error('Error in /api/chat:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
