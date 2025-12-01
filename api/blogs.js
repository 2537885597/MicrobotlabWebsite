import { MongoClient, ObjectId } from 'mongodb';

// 从环境变量获取数据库连接字符串
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

// 数据库和集合名称
const dbName = 'birthdayBlog';
const collectionName = 'blogs';

export default async function handler(req, res) {
  try {
    await client.connect();
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
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  } finally {
    await client.close();
  }
}