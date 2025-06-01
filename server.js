const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI client with your secret key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Route to handle chatbot requests
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    const chatCompletion = await openai.chat.completions.create({
      model: 'gpt-4o', // or 'gpt-3.5-turbo' if you prefer
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: message }
      ]
    });

    const reply = chatCompletion.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('OpenAI API error:', err);
    res.status(500).json({ error: 'Failed to generate response from GPT.' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
