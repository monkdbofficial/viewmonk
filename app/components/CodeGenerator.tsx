'use client';

import { useState } from 'react';

type Language = 'javascript' | 'python' | 'java' | 'csharp' | 'go' | 'rust';

export default function CodeGenerator() {
  const [query, setQuery] = useState('db.users.find({ age: { $gt: 25 } }).limit(10)');
  const [language, setLanguage] = useState<Language>('javascript');

  const generateCode = () => {
    const templates: Record<Language, string> = {
      javascript: `// Node.js with MonkDB Driver
const { MonkClient } = require('monk');

async function query() {
  const client = new MonkClient('mongodb://localhost:27017');
  const db = client.db('mydb');

  try {
    const results = await db.collection('users')
      .find({ age: { $gt: 25 } })
      .limit(10)
      .toArray();

    console.log(results);
    return results;
  } finally {
    await client.close();
  }
}

query().catch(console.error);`,

      python: `# Python with PyMonk
from monk import MonkClient

def query():
    client = MonkClient('mongodb://localhost:27017')
    db = client['mydb']

    try:
        results = db.users.find(
            {'age': {'$gt': 25}}
        ).limit(10)

        for doc in results:
            print(doc)

        return list(results)
    finally:
        client.close()

if __name__ == '__main__':
    query()`,

      java: `// Java with MonkDB Driver
import com.monk.client.MonkClient;
import com.monk.client.MonkCollection;
import com.monk.client.MonkDatabase;
import com.monk.client.model.Filters;

public class QueryExample {
    public static void main(String[] args) {
        try (MonkClient client = new MonkClient("mongodb://localhost:27017")) {
            MonkDatabase database = client.getDatabase("mydb");
            MonkCollection<Document> collection = database.getCollection("users");

            FindIterable<Document> results = collection
                .find(Filters.gt("age", 25))
                .limit(10);

            results.forEach(doc -> System.out.println(doc.toJson()));
        }
    }
}`,

      csharp: `// C# with MonkDB Driver
using Monk.Driver;
using System;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        var client = new MonkClient("mongodb://localhost:27017");
        var database = client.GetDatabase("mydb");
        var collection = database.GetCollection<BsonDocument>("users");

        var filter = Builders<BsonDocument>.Filter.Gt("age", 25);
        var results = await collection.Find(filter).Limit(10).ToListAsync();

        foreach (var doc in results)
        {
            Console.WriteLine(doc.ToJson());
        }
    }
}`,

      go: `// Go with MonkDB Driver
package main

import (
    "context"
    "fmt"
    "log"
    "go.mongodb.org/mongo-driver/bson"
    "go.mongodb.org/mongo-driver/mongo"
    "go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
    client, err := mongo.Connect(context.TODO(),
        options.Client().ApplyURI("mongodb://localhost:27017"))
    if err != nil {
        log.Fatal(err)
    }
    defer client.Disconnect(context.TODO())

    collection := client.Database("mydb").Collection("users")

    filter := bson.M{"age": bson.M{"$gt": 25}}
    opts := options.Find().SetLimit(10)

    cursor, err := collection.Find(context.TODO(), filter, opts)
    if err != nil {
        log.Fatal(err)
    }
    defer cursor.Close(context.TODO())

    for cursor.Next(context.TODO()) {
        var result bson.M
        if err := cursor.Decode(&result); err != nil {
            log.Fatal(err)
        }
        fmt.Println(result)
    }
}`,

      rust: `// Rust with MonkDB Driver
use monk::Client;
use monk::bson::{doc, Document};
use futures::stream::StreamExt;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::with_uri_str("mongodb://localhost:27017").await?;
    let database = client.database("mydb");
    let collection = database.collection::<Document>("users");

    let filter = doc! { "age": { "$gt": 25 } };
    let find_options = monk::options::FindOptions::builder()
        .limit(10)
        .build();

    let mut cursor = collection.find(filter, find_options).await?;

    while let Some(result) = cursor.next().await {
        match result {
            Ok(document) => println!("{:?}", document),
            Err(e) => eprintln!("Error: {}", e),
        }
    }

    Ok(())
}`,
    };

    return templates[language];
  };

  const languages: { id: Language; name: string; icon: string }[] = [
    { id: 'javascript', name: 'JavaScript', icon: '🟨' },
    { id: 'python', name: 'Python', icon: '🐍' },
    { id: 'java', name: 'Java', icon: '☕' },
    { id: 'csharp', name: 'C#', icon: '💠' },
    { id: 'go', name: 'Go', icon: '🐹' },
    { id: 'rust', name: 'Rust', icon: '🦀' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Code Generator
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Convert queries to production-ready code in multiple languages
        </p>
      </div>

      {/* Language Selector */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {languages.map((lang) => (
          <button
            key={lang.id}
            onClick={() => setLanguage(lang.id)}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
              language === lang.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
            }`}
          >
            <span className="text-3xl">{lang.icon}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {lang.name}
            </span>
          </button>
        ))}
      </div>

      {/* Query Input */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Query
        </label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-24 w-full rounded-lg border border-gray-300 p-4 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          placeholder="Enter your query..."
        />
      </div>

      {/* Generated Code */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Generated Code
          </label>
          <button
            onClick={() => navigator.clipboard.writeText(generateCode())}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            📋 Copy
          </button>
        </div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
          <pre className="overflow-x-auto p-4 text-sm text-gray-900 dark:text-gray-100">
            {generateCode()}
          </pre>
        </div>
      </div>

      {/* Features */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 text-2xl">✨</div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Production Ready</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Generated code follows best practices and includes error handling
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 text-2xl">🔧</div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Type Safe</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Includes proper types and interfaces for type-safe development
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 text-2xl">📚</div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Well Documented</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Code includes comments and follows language conventions
          </p>
        </div>
      </div>
    </div>
  );
}
