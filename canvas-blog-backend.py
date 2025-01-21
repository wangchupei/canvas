# Backend with Snapshot Functionality
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import json
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
            user_id TEXT NOT NULL DEFAULT 'guest',
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            position_x REAL NOT NULL DEFAULT 0,
            position_y REAL NOT NULL DEFAULT 0,
            dimensions TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version INTEGER NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            snapshot_data TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()
    logger.info("Database initialized.")

# Data Models
class PostBase(BaseModel):
    title: str
    content: str
    position_x: float = 0
    position_y: float = 0
    dimensions: Optional[dict] = {}
    user_id: Optional[str] = "guest"
    created_at: Optional[datetime] = None  # Optional for newly created posts

class PostCreate(PostBase):
    pass

class Post(PostBase):
    id: int
    created_at: datetime

class Snapshot(BaseModel):
    version: int
    snapshot_data: List[Post]

# API Endpoints
@app.get("/posts/", response_model=List[Post])
async def get_posts():
    """Retrieve all posts."""
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        posts = c.execute('SELECT * FROM posts ORDER BY created_at DESC').fetchall()
        logger.info(f"Fetched {len(posts)} posts.")
        return [
            {**dict(post), "dimensions": json.loads(post["dimensions"] or "{}")}
            for post in posts
        ]
    except Exception as e:
        logger.error(f"Error fetching posts: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@app.post("/posts/", response_model=Post)
async def create_post(post: PostCreate):
    """Create a new post."""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('''
            INSERT INTO posts (title, content, position_x, position_y, dimensions, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (post.title, post.content, post.position_x, post.position_y, json.dumps(post.dimensions), post.user_id))
        post_id = c.lastrowid
        conn.commit()
        logger.info(f"Post created: {post.title} by user {post.user_id}")
        return {**post.dict(), "id": post_id, "created_at": datetime.now()}
    except Exception as e:
        logger.error(f"Error adding a post: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@app.put("/posts/{id}", response_model=Post)
async def update_post(id: int, post: PostCreate):
    """Update an existing post."""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('''
            UPDATE posts
            SET title = ?, content = ?, position_x = ?, position_y = ?, dimensions = ?
            WHERE id = ?
        ''', (post.title, post.content, post.position_x, post.position_y, json.dumps(post.dimensions), id))
        if c.rowcount == 0:
            logger.warning(f"Post with ID {id} not found.")
            conn.close()
            raise HTTPException(status_code=404, detail="Post not found")
        conn.commit()
        logger.info(f"Post updated: {post.title} with ID {id}")
        return {**post.dict(), "id": id, "created_at": datetime.now()}
    except Exception as e:
        logger.error(f"Error updating a post: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@app.delete("/posts/{id}")
async def delete_post(id: int):
    """Delete a post."""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute('DELETE FROM posts WHERE id = ?', (id,))
        if c.rowcount == 0:
            logger.warning(f"Post with ID {id} not found.")
            conn.close()
            raise HTTPException(status_code=404, detail="Post not found")
        conn.commit()
        logger.info(f"Post deleted with ID {id}")
        return {"message": "Post deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting a post: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

@app.post("/snapshots/")
async def save_snapshot(snapshot: Snapshot):
    """Save a new snapshot."""
    logger.info(f"Incoming snapshot payload: {snapshot}")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Convert Post objects to dictionaries and format datetime
        snapshot_data = json.dumps([
            {**post.dict(), "created_at": post.created_at.isoformat()}
            for post in snapshot.snapshot_data
        ])
        logger.info(f"Serialized snapshot data: {snapshot_data}")
        c.execute(
            '''
            INSERT INTO snapshots (version, snapshot_data)
            VALUES (?, ?)
            ''',
            (snapshot.version, snapshot_data)
        )
        conn.commit()
        logger.info(f"Snapshot saved: Version {snapshot.version}")
        return {"message": "Snapshot saved successfully"}
    except Exception as e:
        logger.error(f"Error saving snapshot: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()



@app.get("/snapshots/", response_model=List[dict])
async def get_snapshots():
    """Retrieve all snapshots."""
    conn = get_db_connection()
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    try:
        snapshots = c.execute('SELECT * FROM snapshots ORDER BY version DESC').fetchall()
        return [
            {
                "id": row["id"],
                "version": row["version"],
                "timestamp": row["timestamp"],
                "snapshot_data": json.loads(row["snapshot_data"])
            }
            for row in snapshots
        ]
    except Exception as e:
        logger.error(f"Error fetching snapshots: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
    finally:
        conn.close()

# Application entry point
if __name__ == "__main__":
    init_db()
    logger.info("Starting application...")
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
