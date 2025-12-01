import { MongoClient, ObjectId } from 'mongodb';

// 从环境变量获取数据库连接字符串
const uri = process.env.MONGODB_URI;

// 检查环境变量是否存在
if (!uri) {
  console.error('Error: MONGODB_URI environment variable is not set');
}

// 数据库和集合名称
const dbName = 'birthdayBlog';
const collectionName = 'blogs';

// MongoDB连接选项
const options = {
  maxPoolSize: 10, // 最大连接数
  minPoolSize: 1,  // 最小连接数
  maxIdleTimeMS: 30000, // 连接最大空闲时间
  connectTimeoutMS: 10000, // 连接超时时间
  serverSelectionTimeoutMS: 5000, // 服务器选择超时时间
};

// 创建MongoClient实例
let client;
let clientPromise;

// 仅在服务器端环境中创建连接
if (typeof window === 'undefined') {
  if (!client) {
    client = new MongoClient(uri, options);
  }
  if (!clientPromise) {
    clientPromise = client.connect();
  }
}

// 导出连接函数
async function connectToDatabase() {
  if (typeof window !== 'undefined') {
    throw new Error('Database connection should only be used on the server');
  }
  
  if (!clientPromise) {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  
  return clientPromise;
}

export default async function handler(req, res) {
  try {
    // 检查环境变量是否存在
    if (!uri) {
      return res.status(500).json({ 
        message: 'Database connection error: MONGODB_URI environment variable is not set',
        error: 'Missing MONGODB_URI environment variable'
      });
    }
    
    // 连接到数据库
    const client = await connectToDatabase();
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // GET请求：获取所有博客
    if (req.method === 'GET') {
      const blogs = await collection.find().sort({ createdAt: -1 }).toArray();
      return res.status(200).json(blogs);
    }

    // POST请求：创建博客
    if (req.method === 'POST') {
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
      }
      
      const blog = {
        title,
        content,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(blog);
      return res.status(201).json({ ...blog, _id: result.insertedId });
    }

    // PUT请求：更新博客
    if (req.method === 'PUT') {
      const { id, title, content } = req.body;
      
      if (!id || !title || !content) {
        return res.status(400).json({ message: 'ID, title, and content are required' });
      }
      
      const result = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { title, content, updatedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ message: 'Blog not found' });
      }
      
      return res.status(200).json({ success: true });
    }

    // DELETE请求：删除博客
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ message: 'ID is required' });
      }
      
      const result = await collection.deleteOne({ _id: new ObjectId(id) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({ message: 'Blog not found' });
      }
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Detailed Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // 根据错误类型返回不同的错误信息
    let errorMessage = 'Internal server error';
    let errorDetail = error.message;
    
    if (error.name === 'MongoServerError') {
      errorMessage = 'Database connection error';
      errorDetail = 'Failed to connect to MongoDB. Please check your connection string and network settings.';
    } else if (error.name === 'MongooseError') {
      errorMessage = 'Database query error';
      errorDetail = 'Failed to execute database query. Please check your query syntax.';
    } else if (error.name === 'ReferenceError') {
      errorMessage = 'Code error';
      errorDetail = 'There is a reference error in the code. Please check the server logs.';
    }
    
    return res.status(500).json({ 
      message: errorMessage,
      error: errorDetail,
      originalError: error.message
    });
  }
}