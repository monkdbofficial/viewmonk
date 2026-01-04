// Unified multi-database platform types and configurations

export type DatabaseType =
  | 'document'    // MongoDB-style
  | 'vector'      // Vector embeddings for AI/ML
  | 'timeseries'  // Time-series data
  | 'geospatial'  // Geographic data
  | 'tabular'     // SQL tables
  | 'olap'        // Analytical processing
  | 'blob'        // Object storage
  | 'fulltext';   // Full-text search

export interface DatabaseProfile {
  id: string;
  name: string;
  type: DatabaseType;
  icon: string;
  description: string;
  protocol: string;
  queryLanguage: string;
  features: string[];
  color: string;
}

export const databaseProfiles: DatabaseProfile[] = [
  {
    id: 'document',
    name: 'Document Store',
    type: 'document',
    icon: '📄',
    description: 'JSON document database for flexible schemas',
    protocol: 'MongoDB Protocol',
    queryLanguage: 'MQL (MongoDB Query Language)',
    features: ['Flexible Schema', 'ACID Transactions', 'Aggregation Pipeline', 'Indexing'],
    color: '#10b981'
  },
  {
    id: 'vector',
    name: 'Vector Database',
    type: 'vector',
    icon: '🧠',
    description: 'Store and search vector embeddings for AI/ML',
    protocol: 'Vector Search API',
    queryLanguage: 'Vector Similarity Search',
    features: ['Similarity Search', 'KNN', 'ANN Algorithms', 'Embeddings', 'AI/ML Integration'],
    color: '#8b5cf6'
  },
  {
    id: 'timeseries',
    name: 'Time Series',
    type: 'timeseries',
    icon: '📈',
    description: 'Optimized for time-stamped data and metrics',
    protocol: 'InfluxDB Protocol',
    queryLanguage: 'InfluxQL / Flux',
    features: ['Time-based Queries', 'Downsampling', 'Retention Policies', 'Real-time Analytics'],
    color: '#3b82f6'
  },
  {
    id: 'geospatial',
    name: 'Geospatial',
    type: 'geospatial',
    icon: '🌍',
    description: 'Geographic data with spatial indexing',
    protocol: 'PostGIS Protocol',
    queryLanguage: 'GeoJSON / WKT',
    features: ['Spatial Indexing', 'Distance Queries', 'Polygon Search', 'Map Visualization'],
    color: '#f59e0b'
  },
  {
    id: 'tabular',
    name: 'SQL Tables',
    type: 'tabular',
    icon: '🗂️',
    description: 'Relational tables with SQL support',
    protocol: 'PostgreSQL Protocol',
    queryLanguage: 'SQL',
    features: ['ACID', 'Joins', 'Foreign Keys', 'Transactions', 'Constraints'],
    color: '#06b6d4'
  },
  {
    id: 'olap',
    name: 'OLAP Analytics',
    type: 'olap',
    icon: '📊',
    description: 'Columnar storage for analytical queries',
    protocol: 'ClickHouse Protocol',
    queryLanguage: 'SQL (OLAP)',
    features: ['Columnar Storage', 'Aggregations', 'Real-time Analytics', 'Compression'],
    color: '#ef4444'
  },
  {
    id: 'blob',
    name: 'Blob Storage',
    type: 'blob',
    icon: '💾',
    description: 'Object storage for files and media',
    protocol: 'S3 Compatible API',
    queryLanguage: 'REST API',
    features: ['Object Storage', 'Versioning', 'Metadata', 'CDN Integration'],
    color: '#ec4899'
  },
  {
    id: 'fulltext',
    name: 'Full-Text Search',
    type: 'fulltext',
    icon: '🔍',
    description: 'Advanced text search and analytics',
    protocol: 'Elasticsearch Protocol',
    queryLanguage: 'Query DSL',
    features: ['Text Analysis', 'Fuzzy Search', 'Scoring', 'Aggregations', 'Faceted Search'],
    color: '#14b8a6'
  }
];

// Sample data generators for each type
export const generateVectorData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    _id: `vec_${i}`,
    text: `Sample text document ${i}`,
    embedding: Array.from({ length: 128 }, () => Math.random() * 2 - 1),
    metadata: {
      source: ['web', 'pdf', 'doc'][Math.floor(Math.random() * 3)],
      timestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    },
    similarity_score: Math.random()
  }));
};

export const generateTimeSeriesData = (count: number) => {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    _id: `ts_${i}`,
    timestamp: new Date(now - (count - i) * 60000).toISOString(),
    metric: ['cpu_usage', 'memory_usage', 'disk_io', 'network_throughput'][Math.floor(Math.random() * 4)],
    value: Math.random() * 100,
    tags: {
      host: `server-${Math.floor(Math.random() * 5) + 1}`,
      datacenter: ['us-east', 'us-west', 'eu-central'][Math.floor(Math.random() * 3)],
      environment: ['production', 'staging'][Math.floor(Math.random() * 2)]
    }
  }));
};

export const generateGeospatialData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    _id: `geo_${i}`,
    name: `Location ${i}`,
    type: 'Point',
    coordinates: {
      lat: (Math.random() * 180 - 90).toFixed(6),
      lng: (Math.random() * 360 - 180).toFixed(6)
    },
    properties: {
      category: ['restaurant', 'store', 'office', 'warehouse'][Math.floor(Math.random() * 4)],
      address: `${Math.floor(Math.random() * 9999)} Main St`,
      city: ['New York', 'Los Angeles', 'Chicago', 'Houston'][Math.floor(Math.random() * 4)]
    }
  }));
};

export const generateTabularData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    customer_id: Math.floor(Math.random() * 1000),
    order_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    amount: parseFloat((Math.random() * 1000).toFixed(2)),
    status: ['pending', 'completed', 'cancelled', 'shipped'][Math.floor(Math.random() * 4)],
    product: ['Product A', 'Product B', 'Product C', 'Product D'][Math.floor(Math.random() * 4)],
    quantity: Math.floor(Math.random() * 10) + 1
  }));
};

export const generateOLAPData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    region: ['North', 'South', 'East', 'West'][Math.floor(Math.random() * 4)],
    product_category: ['Electronics', 'Clothing', 'Food', 'Home'][Math.floor(Math.random() * 4)],
    revenue: parseFloat((Math.random() * 100000).toFixed(2)),
    units_sold: Math.floor(Math.random() * 1000),
    profit_margin: parseFloat((Math.random() * 0.4 + 0.1).toFixed(2))
  }));
};

export const generateBlobData = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    _id: `blob_${i}`,
    filename: `file_${i}.${['pdf', 'jpg', 'png', 'mp4', 'doc'][Math.floor(Math.random() * 5)]}`,
    size: Math.floor(Math.random() * 10000000),
    content_type: ['application/pdf', 'image/jpeg', 'image/png', 'video/mp4', 'application/msword'][Math.floor(Math.random() * 5)],
    uploaded_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      uploader: `user_${Math.floor(Math.random() * 100)}`,
      tags: ['important', 'archive', 'public'].filter(() => Math.random() > 0.5)
    },
    url: `https://storage.example.com/file_${i}`
  }));
};

export const generateFullTextData = (count: number) => {
  const titles = [
    'Introduction to Machine Learning',
    'Advanced Database Systems',
    'Web Development Best Practices',
    'Data Science Fundamentals',
    'Cloud Computing Architecture'
  ];

  return Array.from({ length: count }, (_, i) => ({
    _id: `doc_${i}`,
    title: titles[i % titles.length] + ` ${i}`,
    content: `This is a sample document about ${titles[i % titles.length]}. It contains important information and keywords for searching.`,
    author: `Author ${Math.floor(Math.random() * 20)}`,
    published_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    category: ['Technology', 'Science', 'Business', 'Education'][Math.floor(Math.random() * 4)],
    tags: ['tutorial', 'guide', 'reference', 'advanced'].filter(() => Math.random() > 0.5),
    score: Math.random() * 10
  }));
};

// Unified database collections
export const unifiedDatabases = [
  {
    name: 'production',
    type: 'multi',
    collections: [
      {
        name: 'documents',
        type: 'document' as DatabaseType,
        documentCount: 150,
        size: '2.4 MB',
        indexes: ['_id', 'email', 'status'],
        data: [] // Document data fetched dynamically
      },
      {
        name: 'vectors',
        type: 'vector' as DatabaseType,
        documentCount: 1000,
        size: '45 MB',
        indexes: ['_id', 'embedding_index'],
        data: generateVectorData(50)
      },
      {
        name: 'metrics',
        type: 'timeseries' as DatabaseType,
        documentCount: 50000,
        size: '120 MB',
        indexes: ['timestamp', 'metric', 'tags'],
        data: generateTimeSeriesData(100)
      },
      {
        name: 'locations',
        type: 'geospatial' as DatabaseType,
        documentCount: 5000,
        size: '8 MB',
        indexes: ['coordinates', '_id'],
        data: generateGeospatialData(50)
      },
      {
        name: 'orders',
        type: 'tabular' as DatabaseType,
        documentCount: 25000,
        size: '15 MB',
        indexes: ['id', 'customer_id', 'order_date'],
        data: generateTabularData(100)
      },
      {
        name: 'analytics',
        type: 'olap' as DatabaseType,
        documentCount: 100000,
        size: '250 MB',
        indexes: ['date', 'region', 'product_category'],
        data: generateOLAPData(100)
      },
      {
        name: 'files',
        type: 'blob' as DatabaseType,
        documentCount: 2500,
        size: '5.2 GB',
        indexes: ['_id', 'filename', 'content_type'],
        data: generateBlobData(50)
      },
      {
        name: 'articles',
        type: 'fulltext' as DatabaseType,
        documentCount: 10000,
        size: '180 MB',
        indexes: ['_id', 'title_text', 'content_text'],
        data: generateFullTextData(50)
      }
    ]
  }
];
