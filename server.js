// server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const port = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to generate embedding for a given text
async function embedText(text) {
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  return embeddingResponse.data[0].embedding;
}

// Helper function to query Supabase for matching documents
async function querySupabaseEmbeddings(embedding) {
const { data, error } = await supabase.rpc('match_documents', {
  query_embedding: embedding,
  match_threshold: 0.6,
  match_count: 5,
});

  if (error) {
    console.error('❌ Supabase query error:', error);
    return [];
  }

  console.log('✅ Retrieved matching chunks from Supabase:', data); // 👈 log here
  return data.map(doc => doc.content);
}

// Chat API endpoint
app.post('/api/chat', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) return res.status(400).json({ error: 'Message is required.' });

  try {
    // Step 1: Generate embedding for user message
    const userEmbedding = await embedText(userMessage);

    // 🔍 Log for debugging
    console.log("User message:", userMessage);
    console.log("Generated embedding:", userEmbedding.slice(0, 5), "...");

    // Step 2: Retrieve relevant documents from Supabase
    const relevantChunks = await querySupabaseEmbeddings(userEmbedding);

    const contextText = relevantChunks.join('\n---\n').slice(0, 3000); // Trim for token safety

    // Step 3: Generate response using OpenAI's GPT-4o model
    const chatResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant answering questions based on the following context from the Texas SCTP Team Handbook:\n\n' +
            contextText,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const botReply = chatResponse.choices[0].message.content.trim();
    res.json({ reply: botReply });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Error generating response from OpenAI.' });
  }
});

app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});
