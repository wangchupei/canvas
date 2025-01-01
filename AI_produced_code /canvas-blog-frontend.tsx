// Canvas Blog: Fully Redesigned Frontend Matching Target UI
/**
 * ## The Quest of Canvas Rings
 * A journey of creativity and problem-solving in crafting an interactive and dynamic blog canvas.
 * 
 * ### Code History and Improvements
 * 1. **Initial Setup**:
 *    - Created draggable cards (`posts`) to display content dynamically on the canvas.
 *    - Added basic mouse events (`onMouseDown`, `onMouseMove`, `onMouseUp`) for drag-and-drop functionality.
 *
 * 2. **Add and Delete Features**:
 *    - Implemented the "Add New Post" button to generate new cards dynamically.
 *    - Introduced the "Delete Post" button to remove specific cards.
 *
 * 3. **Logging for Debugging**:
 *    - Added `logEvent` utility to track actions (e.g., dragging, adding posts, deleting posts).
 *    - Added a `Logs` button in the footer to view logs within the app for easier debugging.
 *
 * 4. **Edit and Save Functionality**:
 *    - Introduced double-click functionality to toggle edit mode (`isEditing`) for posts.
 *    - Rendered `<textarea>` dynamically when a post is in edit mode.
 *    - Implemented `onBlur` to save changes to the backend using a PUT request.
 *
 * 5. **UI Design Improvements**:
 *    - Adjusted card styling to match the target UI (rounded corners, shadows).
 *    - Styled the footer bar to include "Publish" and "Logs" buttons.
 *    - Fixed overlapping of buttons (e.g., Add button and footer bar).
 *
 * 6. **Bug Fixes**:
 *    - Debugged issues with `onDoubleClick` not triggering properly.
 *    - Ensured `isEditing` is toggling correctly and `<textarea>` appears as expected.
 *    - Corrected API calls to point explicitly to the backend URL (`http://localhost:8000`).
 *
 * 7. **Feature for Logs Modal**:
 *    - Added a modal to display logs dynamically.
 *    - Included a "Close" button to hide the modal when not needed.
 *
 * 8. **Persistence Feature**:
 *    - Added `useEffect` to fetch posts from the backend on page load.
 *    - Modified `addNewPost` to send a POST request to the backend for persistence.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { PlusCircle, X } from 'lucide-react';
import './App.css';

const CanvasBlog = () => {
  // Feature: State Management
  // Related Change: [1] Initial Setup
  const [posts, setPosts] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPost, setDraggedPost] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [logs, setLogs] = useState([]); // Store logs for the session
  const [showLogs, setShowLogs] = useState(false); // Toggle logs view

  // Feature: Logging Utility
  // Related Change: [3] Logging for Debugging
  const logEvent = (event, context = '', data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${event} ${context} ${data ? JSON.stringify(data) : ''}`;
    console.log(logEntry);
    setLogs((prevLogs) => [...prevLogs, logEntry]); // Save the log in state
  };

  // Feature: Fetch Posts from Backend
  // Related Change: [8] Persistence Feature
  useEffect(() => {
    logEvent('Fetching posts from backend');
    fetch('http://localhost:8000/posts/')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        return response.json();
      })
      .then((data) => {
        logEvent('Posts fetched successfully', '', data);
        setPosts(data);
      })
      .catch((error) => logEvent('Error fetching posts', '', error.message));
  }, []);

  // Feature: Drag-and-Drop Events
  // Related Change: [1] Initial Setup
  const handleMouseDown = (e, post) => {
    logEvent('Mouse Down', `Post ID: ${post.id}`);
    setIsDragging(true);
    setDraggedPost(post);
    setDragOffset({
      x: e.clientX - post.position_x,
      y: e.clientY - post.position_y,
    });
  };

  const handleMouseMove = (e) => {
    if (isDragging && draggedPost) {
      logEvent('Mouse Move', `Dragging Post ID: ${draggedPost.id}`);
      const updatedPosts = posts.map((post) => {
        if (post.id === draggedPost.id) {
          return {
            ...post,
            position_x: e.clientX - dragOffset.x,
            position_y: e.clientY - dragOffset.y,
          };
        }
        return post;
      });
      setPosts(updatedPosts);
    }
  };

  const handleMouseUp = () => {
    logEvent('Mouse Up', draggedPost ? `Post ID: ${draggedPost.id}` : 'No post dragged');
    setIsDragging(false);
    setDraggedPost(null);
  };

  // Feature: Add and Delete Features
  // Related Change: [2] Add and Delete Features
  const addNewPost = () => {
    logEvent('Add New Post', 'Creating a new post');
    const newPost = {
      id: Date.now(),
      title: 'New Post',
      content: 'Click to edit...',
      position_x: Math.random() * (window.innerWidth - 300),
      position_y: Math.random() * (window.innerHeight - 200),
    };
    fetch('http://localhost:8000/posts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newPost),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to add new post');
        }
        return response.json();
      })
      .then((data) => {
        logEvent('New Post added to backend', '', data);
        setPosts([...posts, data]);
      })
      .catch((error) => logEvent('Error adding new post', '', error.message));
  };

  const deletePost = (postId) => {
    logEvent('Delete Post', `Post ID: ${postId}`);
    setPosts(posts.filter((post) => post.id !== postId));
  };

  // Feature: Edit and Save Functionality
  // Related Change: [4] Edit and Save Functionality
  const handleDoubleClick = (post) => {
    logEvent('Double Click', `Post ID: ${post.id}`);
    console.log('Double click detected on post:', post.id); // Debugging
    const updatedPosts = posts.map((p) => {
      if (p.id === post.id) {
        return { ...p, isEditing: true };
      }
      return p;
    });
    setPosts(updatedPosts);
  };

  const handleContentChange = (e, post) => {
    logEvent('Edit Post', `Post ID: ${post.id}`);
    const updatedPosts = posts.map((p) => {
      if (p.id === post.id) {
        return { ...p, content: e.target.value };
      }
      return p;
    });
    setPosts(updatedPosts);
  };

  const handleBlur = (post) => {
    logEvent('Save Post', `Post ID: ${post.id}`);
    const updatedPosts = posts.map((p) => {
      if (p.id === post.id) {
        return { ...p, isEditing: false };
      }
      return p;
    });
    setPosts(updatedPosts);

    fetch(`http://localhost:8000/posts/${post.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to save post');
        }
        return response.json();
      })
      .then((data) => logEvent('Post saved to backend', '', data))
      .catch((error) => logEvent('Error saving post', '', error.message));
  };

  return (
    <div
      className="w-full h-screen bg-gray-50 relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {posts.map((post) => (
        <Card
          key={post.id}
          className="absolute shadow-lg rounded-lg bg-white w-72 cursor-move"
          style={{
            left: post.position_x,
            top: post.position_y,
            transform: draggedPost?.id === post.id ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.2s',
            borderRadius: '12px',
          }}
        >
          <CardHeader className="p-4 border-b flex justify-between items-center">
            <CardTitle className="text-lg font-semibold text-gray-800">
              {post.title}
            </CardTitle>
            <button
              onClick={() => deletePost(post.id)}
              className="text-gray-400 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </CardHeader>
          <CardContent
            className="p-4 text-gray-600"
            onMouseDown={(e) => handleMouseDown(e, post)}
            onDoubleClick={() => handleDoubleClick(post)}
          >
            {post.isEditing ? (
              <textarea
                value={post.content}
                onChange={(e) => handleContentChange(e, post)}
                onBlur={() => handleBlur(post)}
                className="w-full p-2 border rounded"
              />
            ) : (
              post.content
            )}
          </CardContent>
        </Card>
      ))}
      <button
        onClick={addNewPost}
        className="fixed bottom-20 right-6 bg-blue-500 text-white p-4 rounded-full shadow-md hover:bg-blue-600 transition-all"
      >
        <PlusCircle size={28} />
      </button>
      {/* Footer Bar with Console Reader */}
      <div className="fixed bottom-0 left-0 w-full bg-white shadow-lg p-4 flex justify-between items-center">
        <span className="text-gray-600 text-sm">Last edited 6 hours ago</span>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowLogs(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            Logs
          </button>
          <button className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600">
            Publish
          </button>
        </div>
      </div>
      {/* Modal for Logs */}
      {showLogs && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="bg-white w-96 p-4 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Logs</h2>
            <div className="overflow-y-auto max-h-64">
              {logs.map((log, index) => (
                <div key={index} className="text-sm text-gray-700 mb-1">
                  {log}
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowLogs(false)}
              className="bg-red-500 text-white mt-4 py-2 px-4 rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CanvasBlog;
