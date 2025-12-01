import { sql } from '@vercel/postgres';

// 初始化数据库表
async function initDatabase() {
  try {
    // 创建blogs表
    await sql`
      CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// 调用初始化函数
initDatabase();

export default async function handler(req, res) {
  try {
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
      const { rows } = await sql`
        SELECT * FROM blogs 
        ORDER BY created_at DESC;
      `;
      return res.status(200).json(rows);
    }

    // POST请求：创建博客
    if (req.method === 'POST') {
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ message: 'Title and content are required' });
      }
      
      const { rows } = await sql`
        INSERT INTO blogs (title, content) 
        VALUES (${title}, ${content})
        RETURNING *;
      `;
      
      return res.status(201).json(rows[0]);
    }

    // PUT请求：更新博客
    if (req.method === 'PUT') {
      const { id, title, content } = req.body;
      
      if (!id || !title || !content) {
        return res.status(400).json({ message: 'ID, title, and content are required' });
      }
      
      const { rows } = await sql`
        UPDATE blogs 
        SET title = ${title}, content = ${content}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *;
      `;
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Blog not found' });
      }
      
      return res.status(200).json(rows[0]);
    }

    // DELETE请求：删除博客
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ message: 'ID is required' });
      }
      
      const { rows } = await sql`
        DELETE FROM blogs 
        WHERE id = ${id}
        RETURNING *;
      `;
      
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Blog not found' });
      }
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}