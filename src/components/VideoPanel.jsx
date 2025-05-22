import { useState, useEffect, useRef } from 'react';

let ytApiReadyPromise;

function loadYouTubeIframeAPI() {
  if (ytApiReadyPromise) return ytApiReadyPromise;

  ytApiReadyPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const prevCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve(window.YT);
    };
  });

  return ytApiReadyPromise;
}

const extractYouTubeId = (url) => {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

const fetchTitle = async (url) => {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) throw new Error('Failed to fetch');
    const data = await res.json();
    return data.title;
  } catch {
    return null;
  }
};

export default function VideoPanel({ panelId }) {
  const [playlist, setPlaylist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`playlist-${panelId}`)) || [];
    } catch {
      return [];
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [titles, setTitles] = useState({});
  const playerRef = useRef(null);

  const playerContainerId = `yt-player-${panelId}`;

  useEffect(() => {
    playlist.forEach((url) => {
      if (!titles[url]) {
        fetchTitle(url).then((title) => {
          if (title) {
            setTitles((prev) => ({ ...prev, [url]: title }));
          }
        });
      }
    });
  }, [playlist]);

  useEffect(() => {
    localStorage.setItem(`playlist-${panelId}`, JSON.stringify(playlist));
  }, [playlist, panelId]);

  const currentUrl = playlist[currentIndex] || '';
  const videoId = extractYouTubeId(currentUrl);

  useEffect(() => {
    if (!videoId) return;

    let canceled = false;
    let timeUpdateInterval = null;

    loadYouTubeIframeAPI().then((YT) => {
      if (canceled) return;

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new YT.Player(playerContainerId, {
        height: '100%',
        width: '100%',
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            const key = `video-time-${panelId}-${videoId}`;
            const saved = localStorage.getItem(key);
            const startTime = saved ? parseFloat(saved) : 0;
            if (startTime > 0) {
              event.target.seekTo(startTime, true);
            }

            // Save current time every second
            timeUpdateInterval = setInterval(() => {
              if (playerRef.current && playerRef.current.getCurrentTime) {
                const currentTime = playerRef.current.getCurrentTime();
                localStorage.setItem(key, currentTime.toString());
              }
            }, 1000);
          },
          onStateChange: (event) => {
            const key = `video-time-${panelId}-${videoId}`;
            if (event.data === YT.PlayerState.ENDED) {
              // Clear saved time on video end
              localStorage.removeItem(key);
              skipVideo();
            }
          },
        },
      });
    });

    return () => {
      canceled = true;
      if (timeUpdateInterval) clearInterval(timeUpdateInterval);
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  const addToPlaylist = () => {
    if (input.trim() === '') return;
    setPlaylist((pl) => [...pl, input.trim()]);
    setInput('');
    if (playlist.length === 0) setCurrentIndex(0);
  };

  const removeFromPlaylist = (idx) => {
    setPlaylist((pl) => {
      const newPl = pl.filter((_, i) => i !== idx);
      if (idx === currentIndex) {
        if (newPl.length === 0) {
          setCurrentIndex(0);
        } else if (currentIndex >= newPl.length) {
          setCurrentIndex(newPl.length - 1);
        }
      } else if (idx < currentIndex) {
        setCurrentIndex((cur) => cur - 1);
      }
      return newPl;
    });
  };

  const skipVideo = () => {
    removeFromPlaylist(currentIndex);
  };

  return (
    <div className="relative flex flex-col h-full w-full p-0 bg-black text-white group">
      <div
        className="absolute top-0 left-0 w-full p-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded flex items-center justify-between"
        style={{ backgroundColor: '#d3d3d3', minHeight: '36px', position: 'relative', paddingRight: '24px' }}
      >
        <nav className="flex items-center justify-between w-full">
          <input
            type="text"
            placeholder="Paste YouTube URL..."
            className="px-3 py-1 rounded text-black flex-shrink-0 h-full"
            style={{
              width: '500px',
              minWidth: '300px',
              backgroundColor: '#808080',
              marginLeft: '12px',
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addToPlaylist();
            }}
          />
          <div
            className="flex items-center h-full"
            style={{ marginRight: '48px', gap: '16px' }}
          >
            <button
              className="text-black rounded inline-flex items-center justify-center"
              style={{
                backgroundColor: '#808080',
                padding: '8px 14px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
              onClick={() => setShowPlaylist((show) => !show)}
            >
              Playlist
            </button>
            <button
              className="text-black rounded inline-flex items-center justify-center"
              style={{
                backgroundColor: '#808080',
                padding: '8px 14px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
              onClick={skipVideo}
            >
              Skip
            </button>
            <button
              className="text-black rounded inline-flex items-center justify-center"
              style={{
                backgroundColor: '#808080',
                padding: '8px 14px',
                fontSize: '14px',
                whiteSpace: 'nowrap',
              }}
              onClick={addToPlaylist}
            >
              Add
            </button>
          </div>
        </nav>

        {showPlaylist && (
          <div
            className="absolute top-full left-0 max-h-32 overflow-auto rounded shadow z-20 mt-1"
            style={{
              width: 'calc(100% - 32px)',
              minWidth: '300px',
              backgroundColor: 'rgba(211, 211, 211, 0.8)',
            }}
          >
            <ul>
              {playlist.map((item, idx) => {
                const active = idx === currentIndex;
                const title = titles[item] || item;
                const bgColor = idx % 2 === 0 ? '#d3d3d3' : '#a9a9a9';
                return (
                  <li
                    key={idx}
                    className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer ${
                      active ? 'bg-indigo-700 text-white' : ''
                    }`}
                    onClick={() => setCurrentIndex(idx)}
                    style={{ backgroundColor: active ? undefined : bgColor }}
                  >
                    <span className="truncate">{title}</span>
                    <button
                      className="ml-2 hover:text-red-700"
                      style={{ color: '#808080' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromPlaylist(idx);
                      }}
                    >
                      &times;
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div id={playerContainerId} className="flex-grow w-full h-full" />

      {!videoId && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-black">
          No video loaded
        </div>
      )}
    </div>
  );
}
