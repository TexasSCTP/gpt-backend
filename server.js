// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const userQuery = req.body.message;

    // Get embedding for the user's question
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: userQuery,
    });

    const [{ embedding }] = embeddingResponse.data;

    // Call the Supabase function to find similar chunks
    const { data: matches, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.78, // optional, adjust for relevance
      match_count: 5,
    });

    if (error) {
      console.error('Supabase match_documents error:', error);
      return res.status(500).json({ reply: 'Error fetching context from Supabase.' });
    }

    const context = matches.map((match) => match.content).join('\n');

    // Call OpenAI with RAG context
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Use the context below to answer the user's question as accurately as possible.\n\n${context}`,
        },
        {
          role: 'user',
          content: userQuery,
        },
      ],
    });

    const reply = chatResponse.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error('Chatbot error:', err);
    res.status(500).json({ reply: 'An error occurred while processing your request.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

