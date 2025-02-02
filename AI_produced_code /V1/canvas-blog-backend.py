# Rewritten Canvas Blog Backend
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import uvicorn
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Replace with the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Utility function for database connection
def get_db_connection():
    """Establish and return a database connection."""
    return sqlite3.connect('blog.db')

# Initialize the database
def init_db():
    """Create tables if they do not exist."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            position_x REAL NOT NULL,
            position_y REAL NOT NULL,
            dimensions JSON DEFAULT '{}', -- For additional dimensions
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS post_versions (
            version_id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            dimensions JSON DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE
        )
    ''')
    conn.commit()
    conn.close()
    logger.info("Database initialized.")
    conn.commit()
    conn.close()
    logger.info("Database initialized.")

# Data Models
class PostBase(BaseModel):
    title: str
    content: str
    position_x: float
    position_y: float
    dimensions: Optional[dict] = {}
    user_id: Optional[str] = "guest"

class PostCreate(PostBase):
    pass

class Post(PostBase):
    id: int
    created_at: datetime

class PostVersion(Post):
    version_id: int

# API Endpoints

# Feature: Fetch All Posts
# Related Change: Load posts on frontend startup
@app.get("/posts/", response_model=List[Post])
async def get_posts():
    """Retrieve all posts."""
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    posts = c.execute('SELECT * FROM posts ORDER BY created_at DESC').fetchall()
    conn.close()
    logger.info(f"Fetched {len(posts)} posts.")
    return [dict(post) for post in posts]

# Feature: Add New Post
# Related Change: Persist new posts to backend
@app.post("/posts/", response_model=Post)
@app.post("/posts/", response_model=Post)
async def create_post(post: PostCreate):
    """Create a new post."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO posts (title, content, position_x, position_y, dimensions, user_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (post.title, post.content, post.position_x, post.position_y, json.dumps(post.dimensions), post.user_id))
    post_id = c.lastrowid
    conn.commit()
    conn.close()
    logger.info(f"Post created: {post.title} by user {post.user_id}")
    return {**post.dict(), "id": post_id, "created_at": datetime.now()}

# Feature: Edit Post
# Related Change: Update post details
@app.put("/posts/{id}", response_model=Post)
async def update_post(id: int, post: PostCreate):
    """Update an existing post."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        UPDATE posts
        SET title = ?, content = ?, position_x = ?, position_y = ?
        WHERE id = ?
    ''', (post.title, post.content, post.position_x, post.position_y, id))
    if c.rowcount == 0:
        conn.close()
        logger.warning(f"Post with ID {id} not found.")
        raise HTTPException(status_code=404, detail="Post not found")
    conn.commit()
    conn.close()
    logger.info(f"Post updated: {post.title} with ID {id}")
    return {**post.dict(), "id": id, "created_at": datetime.now()}

# Feature: Delete Post
# Related Change: Remove post from backend
@app.delete("/posts/{id}")
async def delete_post(id: int):
    """Delete a post."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('DELETE FROM posts WHERE id = ?', (id,))
    if c.rowcount == 0:
        conn.close()
        logger.warning(f"Post with ID {id} not found.")
        raise HTTPException(status_code=404, detail="Post not found")
    conn.commit()
    conn.close()
    logger.info(f"Post deleted with ID {id}")
    return {"message": "Post deleted successfully"}

# Feature: Log API Calls
# Related Change: Debugging support
@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Application entry point
if __name__ == "__main__":
    init_db()
    logger.info("Starting application...")
    uvicorn.run(app, host="0.0.0.0", port=8000)

"""
## The Quest of Canvas Rings: Backend Changelog
1. **Database Initialization**:
   - Created tables for posts with necessary fields. [Initial Setup]

2. **CORS Configuration**:
   - Allowed requests from http://localhost:3000 to enable frontend-backend communication. [Added Middleware]

3. **GET Endpoint**:
   - Implemented `/posts/` to fetch all posts from the database. [Frontend Fetch Logic]

4. **POST Endpoint**:
   - Implemented `/posts/` to persist new posts to the database. [Persist New Posts]

5. **PUT Endpoint**:
   - Added `/posts/{id}` to update post details (title, content, and position). [Update Post Details]

6. **DELETE Endpoint**:
   - Added `/posts/{id}` to delete a post from the database. [Remove Post]

7. **Logging Middleware**:
   - Added middleware to log all incoming requests and their responses. [Debugging Support]
"""
