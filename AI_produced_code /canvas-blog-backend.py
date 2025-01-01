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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()
    logger.info("Database initialized.")

# Data Models
class PostBase(BaseModel):
    title: str
    content: str
    position_x: float
    position_y: float
    user_id: Optional[str] = "guest"

class PostCreate(PostBase):
    pass

class Post(PostBase):
    id: int
    created_at: datetime

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
async def create_post(post: PostCreate):
    """Create a new post."""
    conn = get_db_connection()
    c = conn.cursor()
    c.execute('''
        INSERT INTO posts (title, content, position_x, position_y, user_id)
        VALUES (?, ?, ?, ?, ?)
    ''', (post.title, post.content, post.position_x, post.position_y, post.user_id))
    post_id = c.lastrowid
    conn.commit()
    conn.close()
    logger.info(f"Post created: {post.title} by user {post.user_id}")
    return {**post.dict(), "id": post_id, "created_at": datetime.now()}

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

5. **Logging Middleware**:
   - Added middleware to log all incoming requests and their responses. [Debugging Support]
"""
