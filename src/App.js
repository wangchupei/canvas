import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import { PlusCircle, X } from 'lucide-react';
import Matter from "matter-js";

const CanvasBlog = () => {
  const sceneRef = useRef(null); // Reference for the Matter.js canvas
  const [engine, setEngine] = useState(null);
  const [posts, setPosts] = useState([]);
  const postsRef = useRef([]); // Ref to hold posts with Matter.js bodies
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPost, setDraggedPost] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Loader state
  const [simulationStarted, setSimulationStarted] = useState(false); // Simulation flag
  const [snapshotTaken, setSnapshotTaken] = useState(false); // Whether snapshot was taken
  const [snapshots, setSnapshots] = useState([]); // To store snapshot history
  const [showHistory, setShowHistory] = useState(false);  // Track visibility of Snapshot History


  const logEvent = (event, context = '', data = null) => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${event} ${context} ${data ? JSON.stringify(data) : ''}`;
    console.log(logEntry);
    setLogs((prevLogs) => [...prevLogs, logEntry]);
  };

  // Initialize Matter.js
  useEffect(() => {
    // Initialize Matter.js engine
    const engineInstance = Matter.Engine.create();
    setEngine(engineInstance);

    // Create and run the runner
    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engineInstance);

    // Initialize renderer
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engineInstance,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: "transparent", // Transparent to preserve UI
      },
    });

    // Create the "Sun" at the center
    const sun = Matter.Bodies.circle(window.innerWidth / 2, window.innerHeight / 2, 50, {
      isStatic: true,
      render: { fillStyle: "yellow" },
    });
    Matter.World.add(engineInstance.world, [sun]);

    // Run the renderer
    Matter.Render.run(render);

    // Cleanup on unmount
    return () => {
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engineInstance);
      render.canvas.remove();
      render.textures = {};
    };
  }, []);

  // Fetch posts and handle outside clicks
  useEffect(() => {
    if (!engine) return; // Prevent running if engine is not initialized

    setIsLoading(true);
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
        // Initialize posts with Matter.js bodies
        const initializedPosts = data.map(post => {
          const mass = post.mass || 5; // Default mass
          const velocity = post.velocity || 0.02; // Default velocity
          const orbitRadius = post.orbitRadius || 150; // Default orbit radius
          const angle = post.angle || Math.random() * Math.PI * 2; // Default angle

          const postBody = Matter.Bodies.circle(post.position_x, post.position_y, 20, {
            mass: mass,
            render: {
              fillStyle: `hsl(${Math.random() * 360}, 70%, 50%)`, // Random color
            },
          });

          // Attach orbit properties
          postBody.orbitRadius = orbitRadius;
          postBody.orbitAngle = angle;
          postBody.orbitSpeed = velocity;

          Matter.World.add(engine.world, [postBody]);

          return { ...post, body: postBody };
        });

        postsRef.current = initializedPosts;
        setPosts([...postsRef.current]);
        setIsLoading(false);
      })
      .catch((error) => {
        logEvent('Error fetching posts', '', error.message);
        setIsLoading(false);
      });

    const handleOutsideClick = (e) => {
      if (!e.target.closest('.post-card')) {
        logEvent('Exit Editing Mode', 'Clicked outside of posts');
        setPosts((prevPosts) => {
          if (!prevPosts || !Array.isArray(prevPosts)) {
            logEvent('Error: Invalid posts state detected');
            return prevPosts; // Preserve the previous state to avoid clearing posts
          }
          const updatedPosts = prevPosts.map((post) => ({
            ...post,
            isEditing: false, // Exit editing mode only
          }));
          postsRef.current = updatedPosts;
          return [...updatedPosts];
        });
      }
    };

    document.addEventListener('click', handleOutsideClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, [engine]);

  // Fetch snapshots from the backend when the app loads
useEffect(() => {
  fetch('http://localhost:8000/snapshots/')
      .then((response) => {
          if (!response.ok) {
              throw new Error('Failed to fetch snapshots');
          }
          return response.json();
      })
      .then((data) => {
          // Set the snapshots state with data from the backend
          console.log('Snapshots fetched from backend:', data);
          setSnapshots(
              data.map((snapshot) => ({
                version: snapshot.version || 0,
                timestamp: snapshot.timestamp || new Date().toISOString(),
                snapshot: snapshot.snapshot_data || [],
              }))
          );
          logEvent('Snapshots loaded from backend');
      })
      .catch((error) => logEvent('Error loading snapshots', '', error.message));
}, []); // Run only on initial render

  const handleMouseDown = (e, post) => {
    logEvent('Mouse Down', `Post ID: ${post.id}`);
    setIsDragging(true);
    setDraggedPost(post);
    setDragOffset({
      x: e.clientX - post.position_x,
      y: e.clientY - post.position_y,
    });

    // Pause physics for the dragged post
    if (post.body) {
      Matter.Body.setStatic(post.body, true);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && draggedPost) {
      const updatedPost = {
        ...draggedPost,
        position_x: e.clientX - dragOffset.x,
        position_y: e.clientY - dragOffset.y,
      };

      postsRef.current = postsRef.current.map((post) =>
        post.id === draggedPost.id ? updatedPost : post
      );

      setPosts([...postsRef.current]); // Trigger re-render

      logEvent('Mouse Move', `Dragging Post ID: ${draggedPost.id}`);

      // Update Matter.js body position if exists
      if (draggedPost.body) {
        Matter.Body.setPosition(draggedPost.body, { x: updatedPost.position_x, y: updatedPost.position_y });
      }
    }
  };

  const handleMouseUp = () => {
    logEvent('Mouse Up', draggedPost ? `Post ID: ${draggedPost.id}` : 'No post dragged');

    if (draggedPost) {
      // Destructure to exclude 'body'
      const { body, ...postData } = draggedPost;

      // Send the updated position to the backend
      fetch(`http://localhost:8000/posts/${draggedPost.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData), // Use 'postData' instead of 'draggedPost'
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error('Failed to update post position');
          }
          return response.json();
        })
        .then((data) => {
          logEvent('Post position saved to backend', `Post ID: ${draggedPost.id}`, data);
        })
        .catch((error) => {
          logEvent('Error saving post position', '', error.message);
        });

      // Resume physics for the dragged post
      if (draggedPost.body) {
        Matter.Body.setStatic(draggedPost.body, false);
      }
    }

    setIsDragging(false);
    setDraggedPost(null);
  };

  const addNewPost = () => {
    console.log(postsRef.current.map((post) => post.id)); // Check for duplicates or undefined IDs
    logEvent('Add New Post', 'Creating a new post');
    const randomMass = Math.random() * 10 + 1; // Random mass
    const randomSpeed = Math.random() * 0.05 + 0.01; // Random orbital speed
    const orbitRadius = Math.random() * 200 + 100; // Random orbit radius
    const angle = Math.random() * Math.PI * 2; // Random initial angle

    const position_x = window.innerWidth / 2 + orbitRadius * Math.cos(angle);
    const position_y = window.innerHeight / 2 + orbitRadius * Math.sin(angle);

    // Create a Matter.js body immediately
    const postBody = Matter.Bodies.circle(position_x, position_y, 20, {
        mass: randomMass,
        render: {
            fillStyle: `hsl(${Math.random() * 360}, 70%, 50%)`, // Random color
        },
    });

    // Attach orbit properties to the Matter.js body
    postBody.orbitRadius = orbitRadius;
    postBody.orbitAngle = angle;
    postBody.orbitSpeed = randomSpeed;

    // Add the Matter.js body to the simulation
    if (engine) {
        Matter.World.add(engine.world, [postBody]);
    }

    // Create a temporary post object
    const tempPost = {
        id: `temp-${Date.now()}`, // Use a unique identifier for temporary posts
        title: "New Post",
        content: "Click to edit...",
        position_x,
        position_y,
        dimensions: {}, // Placeholder for dimensions
        user_id: "guest",
        mass: randomMass,
        velocity: randomSpeed,
        angle,
        orbitRadius,
        body: postBody, // Attach Matter.js body
        isTemporary: true, // Flag as temporary
    };

    // Update state with the temporary post
    postsRef.current = [...postsRef.current, tempPost];
    setPosts([...postsRef.current]); // Trigger re-render

    // Send the post to the backend
    fetch('http://localhost:8000/posts/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: "New Post",
            content: "Click to edit...",
            position_x,
            position_y,
            dimensions: {},
            user_id: "guest",
        }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to save post');
            }
            return response.json();
        })
        .then((savedPost) => {
            // Replace the temporary post with the backend response
            postsRef.current = postsRef.current.map((post) =>
                post.isTemporary && post.body === postBody
                    ? {
                          ...savedPost,
                          mass: post.mass,
                          velocity: post.velocity,
                          angle: post.angle,
                          orbitRadius: post.orbitRadius,
                          body: post.body, // Preserve the Matter.js body
                          isTemporary: false, // Mark as permanent
                      }
                    : post
            );
            setPosts([...postsRef.current]); // Trigger re-render
            logEvent('New post added successfully', '', savedPost);
        })
        .catch((error) => {
            logEvent('Error saving post', '', error.message);

            // Remove the temporary post in case of an error
            postsRef.current = postsRef.current.filter((post) => post.body !== postBody);
            setPosts([...postsRef.current]); // Trigger re-render
            if (engine) {
                Matter.World.remove(engine.world, postBody); // Remove the body from the simulation
            }
        });
};




  const startSimulation = () => {
    if (simulationStarted) {
      console.log("Simulation already started");
      return;
    }

    console.log("Start Simulation button clicked"); // Confirmation log
    if (!engine) return;

    Matter.Events.on(engine, "beforeUpdate", () => {
      console.log("beforeUpdate event triggered"); // Confirmation log
      postsRef.current = postsRef.current.map((post) => {
        const body = post.body;
        if (!body) return post;

        // Update the orbit angle
        body.orbitAngle += body.orbitSpeed;

        // Calculate new position
        const newX = window.innerWidth / 2 + body.orbitRadius * Math.cos(body.orbitAngle);
        const newY = window.innerHeight / 2 + body.orbitRadius * Math.sin(body.orbitAngle);

        // Update Matter.js body position
        Matter.Body.setPosition(body, { x: newX, y: newY });

        return {
          ...post,
          position_x: newX,
          position_y: newY,
        };
      });

      // Trigger re-render
      setPosts([...postsRef.current]);
    });

    setSimulationStarted(true); // Update the state flag
  };

  const stopSimulation = () => {
    if (!simulationStarted) {
      console.log("Simulation is not running");
      return;
    }

    console.log("Stop Simulation button clicked");

    Matter.Events.off(engine, "beforeUpdate");

    setSimulationStarted(false);
  };
  
  const takeSnapshot = () => {
    const snapshot = posts.map((post) => ({
        id: post.id || Date.now(), // Generate a unique ID if not present
        position_x: post.position_x,
        position_y: post.position_y,
        title: post.title,
        content: post.content,
        created_at: post.created_at || new Date().toISOString(), // Default timestamp
        dimensions: post.dimensions || {}, // Default to an empty object
        user_id: post.user_id || "guest", // Default user
    }));

    fetch('http://localhost:8000/snapshots/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            version: snapshots.length + 1,
            snapshot_data: snapshot,
        }),
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to save snapshot');
            }
            return response.json();
        })
        .then(() => {
            logEvent('Snapshot saved to backend');
            setSnapshots((prevSnapshots) => [
                ...prevSnapshots,
                {
                    version: snapshots.length + 1,
                    timestamp: new Date().toISOString(),
                    snapshot: snapshot,
                },
            ]);
            setSnapshotTaken(true);
            logEvent('Snapshot added to history locally');
        })
        .catch((error) => logEvent('Error saving snapshot', '', error.message));
};


const viewSnapshot = (snapshotVersion) => {
  // Fetch snapshots from the backend
  fetch('http://localhost:8000/snapshots/')
      .then((response) => {
          if (!response.ok) {
              throw new Error('Failed to fetch snapshots');
          }
          return response.json();
      })
      .then((data) => {
          // Find the snapshot by version
          const snapshot = data.find((snap) => snap.version === snapshotVersion);
          if (snapshot) {
              // Update the posts state with the snapshot data
              setPosts(snapshot.snapshot_data.map((post) => ({
                  ...post,
                  body: null, // Reset body if Matter.js body exists
              })));
              logEvent('Viewing Snapshot', `Version: ${snapshotVersion}`);
          } else {
              logEvent('Snapshot not found', `Version: ${snapshotVersion}`);
          }
      })
      .catch((error) => logEvent('Error fetching snapshots', '', error.message));
};

  
  const deletePost = (postId) => {
    logEvent('Delete Post', `Post ID: ${postId}`);
    postsRef.current = postsRef.current.filter((post) => post.id !== postId);
    setPosts([...postsRef.current]); // Trigger re-render

    fetch(`http://localhost:8000/posts/${postId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to delete post');
        }
        logEvent('Post deleted successfully', `Post ID: ${postId}`);
      })
      .catch((error) => logEvent('Error deleting post', '', error.message));
  };

  const handleDoubleClick = (post) => {
    logEvent('Double Click', `Post ID: ${post.id}`);
    const updatedPosts = postsRef.current.map((p) => {
      if (p.id === post.id) {
        return { ...p, isEditing: true };
      }
      return p;
    });
    postsRef.current = updatedPosts;
    setPosts([...postsRef.current]); // Trigger re-render
  };

  const handleContentChange = (e, post) => {
    logEvent('Edit Post', `Post ID: ${post.id}`);
    const updatedPosts = postsRef.current.map((p) => {
      if (p.id === post.id) {
        return { ...p, content: e.target.value };
      }
      return p;
    });
    postsRef.current = updatedPosts;
    setPosts([...postsRef.current]); // Trigger re-render
  };

  const handleTitleChange = (e, post) => {
    logEvent('Edit Title', `Post ID: ${post.id}`);
    const updatedPosts = postsRef.current.map((p) => {
      if (p.id === post.id) {
        return { ...p, title: e.target.value };
      }
      return p;
    });
    postsRef.current = updatedPosts;
    setPosts([...postsRef.current]); // Trigger re-render
  };

  const handleBlur = (post) => {
    logEvent('Saving post to backend', `Post ID: ${post.id}`);
    setIsLoading(true);

    // Destructure to exclude 'body'
    const { body, ...postData } = post;

    fetch(`http://localhost:8000/posts/${post.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData), // Use 'postData' instead of 'post'
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to save post');
        }
        return response.json();
      })
      .then((data) => {
        logEvent('Post saved to backend', '', data);
        setIsLoading(false);
      })
      .catch((error) => {
        logEvent('Error saving post', '', error.message);
        setIsLoading(false);
      });
  };
    
    // Function to toggle Snapshot History visibility
    const toggleSnapshotHistory = () => {
      setShowHistory(!showHistory);  // Toggle the visibility of Snapshot History
    };

    const listRef = useRef(null);  // Create a reference for the list container
    
    // Automatically scroll to the bottom whenever snapshots change
      useEffect(() => {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      }, [snapshots]); // This effect will run every time snapshots change

  return (
    <div
      className="w-full h-screen bg-gray-50 relative overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Simulation canvas (background layer) */}
      <div
        ref={sceneRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: -1, // Ensures the canvas stays behind the UI
        }}
      ></div>

      {isLoading && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center">
          <div className="text-white text-lg">Loading...</div>
        </div>
      )}

      {posts.map((post) => (
        <div
          key={post.id}
          className="post-card absolute shadow-lg rounded-lg bg-white w-72 cursor-move"
          style={{
            left: post.position_x,
            top: post.position_y,
            transform: isDragging && draggedPost?.id === post.id ? 'scale(1.02)' : 'scale(1)',
            transition: 'transform 0.2s',
            borderRadius: '12px',
          }}
          onMouseDown={(e) => handleMouseDown(e, post)}
          onDoubleClick={() => handleDoubleClick(post)}
        >
          <div className="p-4 border-b flex justify-between items-center">
            {post.isEditing ? (
              <textarea
                value={post.title}
                onChange={(e) => handleTitleChange(e, post)}
                onBlur={() => handleBlur(post)}
                className="w-full p-2 border rounded"
              />
            ) : (
              <h2 className="text-lg font-semibold text-gray-800">{post.title}</h2>
            )}
            {post.isEditing && (
              <button
                onClick={() => deletePost(post.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="p-4 text-gray-600">
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
          </div>
        </div>
      ))}

      <button
        onClick={addNewPost}
        className="fixed bottom-20 right-6 bg-blue-500 text-white p-4 rounded-full shadow-md hover:bg-blue-600 transition-all"
      >
        <PlusCircle size={28} />
      </button>
      <button
        onClick={startSimulation}
        className="fixed bottom-20 right-24 bg-green-500 text-white p-4 rounded-full shadow-md hover:bg-green-600 transition-all"
      >
        Start Simulation
      </button>
     
      {/*<button
      onClick={takeSnapshot}
      className="fixed bottom-12 right-24 bg-yellow-500 text-white p-4 rounded-full shadow-md hover:bg-yellow-600 transition-all"
      >
        Take Snapshot
      </button>*/}

      {/*snapshotTaken && (
        <div
          onClick={toggleSnapshotHistory}  // Toggle Snapshot History visibility
          className="fixed bottom-12 right-36 bg-green-500 text-white p-2 rounded-full shadow-md hover:bg-green-600 transition-all"
        >
          Snapshot Taken
        </div>
      )*/}


      {showHistory && snapshots.length > 0 && (
        <div className="fixed bottom-24 right-6 bg-white p-4 shadow-lg rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Snapshot History</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {snapshots.map((snap, index) => (
              <button
                key={snap.version}
                onClick={() => viewSnapshot(snap.version)}
                className={`block text-left bg-gray-200 hover:bg-gray-300 p-2 rounded-md w-auto transition-all
                  ${index === snapshots.length - 1 ? 'bg-green-100 animate-pulse' : ''}`} // Highlight new entry
              >
                Version {snap.version} - {new Date(snap.timestamp).toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      )}
  
      <button
        onClick={stopSimulation}
        className="fixed bottom-20 right-42 bg-red-500 text-white p-4 rounded-full shadow-md hover:bg-red-600 transition-all"
      >
        Stop Simulation
      </button>
      <div className="fixed bottom-0 left-0 w-full bg-white shadow-lg p-4 flex justify-between items-center">
        <span className="text-gray-600 text-sm">Last edited 6 hours ago</span>
        <div className="flex items-center space-x-4">
          

        {/*snapshotTaken && (
        <div
          onClick={toggleSnapshotHistory}  // Toggle Snapshot History visibility
          className="fixed bottom-12 right-36 bg-green-500 text-white p-2 rounded-full shadow-md hover:bg-green-600 transition-all"
        >
          Snapshot Taken
        </div>
        )*/}
          <button 
            onClick={toggleSnapshotHistory}  // Toggle Snapshot History visibility
            className="py-2 px-1 bg-yellow-500 text-white p-2 rounded-lg shadow-md hover:bg-yellow-600 transition-all" 
            //formerly named L-Snapshot Taken, now call a fancy name: Time Travel
          >
            Time-Travel
            
          </button> 
        

          <button
            onClick={() => setShowLogs(true)}
            className="text-gray-600 hover:text-gray-900"
          >
            Logs
          </button>
          <button
          onClick={takeSnapshot}  //formerly named P-Take Snapshot, now called Snapshot
          className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"> 
            Snapshot
          </button>

        </div>
      </div>
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
