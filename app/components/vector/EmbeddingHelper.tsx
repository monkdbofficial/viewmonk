'use client';

import { useState } from 'react';
import { Code, Copy, Check, ExternalLink, AlertCircle } from 'lucide-react';

export default function EmbeddingHelper() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const examples = [
    {
      id: 'openai-python',
      title: 'OpenAI API (Python)',
      language: 'python',
      code: `import openai

client = openai.OpenAI(api_key="your-api-key")

response = client.embeddings.create(
    model="text-embedding-3-small",
    input="your search query"
)

embedding = response.data[0].embedding
print(embedding)  # Copy this array`,
      dimensions: '1536',
      cost: '$0.02 per 1M tokens',
    },
    {
      id: 'openai-js',
      title: 'OpenAI API (JavaScript)',
      language: 'javascript',
      code: `import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: "your search query"
});

const embedding = response.data[0].embedding;
console.log(embedding);  // Copy this array`,
      dimensions: '1536',
      cost: '$0.02 per 1M tokens',
    },
    {
      id: 'openai-curl',
      title: 'OpenAI API (curl)',
      language: 'bash',
      code: `curl https://api.openai.com/v1/embeddings \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "text-embedding-3-small",
    "input": "your search query"
  }'`,
      dimensions: '1536',
      cost: '$0.02 per 1M tokens',
    },
    {
      id: 'cohere-python',
      title: 'Cohere API (Python)',
      language: 'python',
      code: `import cohere

co = cohere.Client('your-api-key')

response = co.embed(
    texts=["your search query"],
    model='embed-english-v3.0',
    input_type='search_query'
)

embedding = response.embeddings[0]
print(embedding)  # Copy this array`,
      dimensions: '1024',
      cost: '$0.10 per 1M tokens',
    },
    {
      id: 'sentence-transformers',
      title: 'SentenceTransformers (Python - Free)',
      language: 'python',
      code: `from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

embedding = model.encode("your search query")
print(embedding.tolist())  # Copy this array`,
      dimensions: '384',
      cost: 'Free (local)',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-semibold mb-2">How to Generate Embeddings</p>
            <p className="text-blue-800 dark:text-blue-200">
              Use any of the methods below to generate embedding vectors for your queries.
              Copy the resulting array and paste it into the Manual mode search box above.
            </p>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="space-y-4">
        {examples.map((example) => (
          <div
            key={example.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Example Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Code className="w-4 h-4 text-gray-500" />
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {example.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Dimensions: {example.dimensions}
                    </span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {example.cost}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => copyCode(example.code, example.id)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {copied === example.id ? (
                  <>
                    <Check className="w-3 h-3 text-green-600" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Code Block */}
            <div className="bg-gray-900 dark:bg-black p-4">
              <pre className="text-xs text-green-400 overflow-x-auto">
                <code>{example.code}</code>
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* Links */}
      <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Useful Resources
        </p>
        <div className="space-y-2">
          <a
            href="https://platform.openai.com/docs/guides/embeddings"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            OpenAI Embeddings Guide
          </a>
          <a
            href="https://docs.cohere.com/docs/embeddings"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            Cohere Embeddings Guide
          </a>
          <a
            href="https://www.sbert.net/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            SentenceTransformers (Free, Local)
          </a>
        </div>
      </div>
    </div>
  );
}
