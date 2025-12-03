import { MongoClient } from 'mongodb';

// 从环境变量获取数据库连接字符串
const uri = process.env.MONGODB_URI;

// 检查环境变量是否存在
if (!uri) {
  console.error('Error: MONGODB_URI environment variable is not set');
}

// 数据库名称
const dbName = 'birthdayBlog';

// MongoDB连接选项
const options = {
  maxPoolSize: 10, // 最大连接数
  minPoolSize: 1,  // 最小连接数
  maxIdleTimeMS: 30000, // 连接最大空闲时间
  connectTimeoutMS: 10000, // 连接超时时间
  serverSelectionTimeoutMS: 5000, // 服务器选择超时时间
};

export default async function handler(req, res) {
  let client;
  try {
    // 检查环境变量是否存在
    if (!uri) {
      return res.status(500).json({ 
        message: 'Database connection error: MONGODB_URI environment variable is not set',
        error: 'Missing MONGODB_URI environment variable'
      });
    }
    
    // 创建MongoClient实例
    client = new MongoClient(uri, options);
    await client.connect();
    const db = client.db(dbName);
    
    // 获取或创建users集合
    const usersCollection = db.collection('users');
    
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // 用户注册
    if (req.method === 'POST' && req.url.includes('/register')) {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      // 检查用户名是否已存在
      const existingUser = await usersCollection.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      // 创建新用户
      const user = {
        username,
        password, // 在实际生产环境中，应该使用bcrypt等库对密码进行哈希处理
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await usersCollection.insertOne(user);
      return res.status(201).json({ message: 'User registered successfully' });
    }
    
    // 用户登录
    if (req.method === 'POST' && req.url.includes('/login')) {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
      }
      
      // 查找用户
      const user = await usersCollection.findOne({ username });
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      // 验证密码（实际生产环境中应该使用bcrypt.compare）
      if (user.password !== password) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      
      return res.status(200).json({ 
        message: 'Login successful',
        username: user.username
      });
    }
    
    // 忘记密码 - 重置密码
    if (req.method === 'POST' && req.url.includes('/reset-password')) {
      const { username, newPassword } = req.body;
      
      if (!username || !newPassword) {
        return res.status(400).json({ message: 'Username and new password are required' });
      }
      
      // 查找用户
      const user = await usersCollection.findOne({ username });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // 更新密码
      await usersCollection.updateOne(
        { username },
        { $set: { password: newPassword, updatedAt: new Date() } }
      );
      
      return res.status(200).json({ message: 'Password reset successfully' });
    }
    
    // 检查用户名是否存在
    if (req.method === 'GET' && req.url.includes('/check-username')) {
      const username = req.query.username;
      
      if (!username) {
        return res.status(400).json({ message: 'Username is required' });
      }
      
      const user = await usersCollection.findOne({ username });
      return res.status(200).json({ exists: !!user });
    }
    
    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('User API Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      method: req.method,
      url: req.url
    });
    
    // 根据错误类型返回不同的错误信息
    let errorMessage = 'Internal server error';
    let errorDetail = error.message;
    
    if (error.message.includes('querySrv ENOTFOUND')) {
      errorMessage = 'Database connection error: DNS resolution failed';
      errorDetail = 'Failed to resolve MongoDB Atlas cluster domain. Please check your connection string format and cluster name.';
    } else if (error.name === 'MongoServerError') {
      errorMessage = 'Database connection error';
      errorDetail = 'Failed to connect to MongoDB. Please check your connection string and network settings.';
    } else if (error.name === 'MongoNetworkError') {
      errorMessage = 'Database network error';
      errorDetail = 'Failed to connect to MongoDB server. Please check your network connection and server status.';
    }
    
    return res.status(500).json({ 
      message: errorMessage,
      error: errorDetail,
      originalError: error.message,
      errorName: error.name
    });
  } finally {
    // 确保在所有情况下都能正确关闭数据库连接
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
}