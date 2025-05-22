import { useState, useEffect, useRef } from 'react';

const extractYouTubeId = (url) => {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

const extractTwitchChannel = (url) => {
  // Match Twitch channel URLs like twitch.tv/channelName
  const match = url.match(/twitch\.tv\/([a-zA-Z0-9_]+)/);
  return match ? match[1] : null;
};

const extractTwitchClip = (url) => {
  // Match Twitch clip URLs like clips.twitch.tv/clipId
  const match = url.match(/clips\.twitch\.tv\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

const fetchYouTubeTitle = async (url) => {
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
  const iframeRef = useRef(null);

  // Fetch titles for YouTube videos only
  useEffect(() => {
    playlist.forEach((url) => {
      if (!titles[url] && extractYouTubeId(url)) {
        fetchYouTubeTitle(url).then((title) => {
          if (title) {
            setTitles((prev) => ({ ...prev, [url]: title }));
          }
        });
      }
    });
  }, [playlist]);

  // Save playlist changes
  useEffect(() => {
    localStorage.setItem(`playlist-${panelId}`, JSON.stringify(playlist));
  }, [playlist, panelId]);

  const currentUrl = playlist[currentIndex] || '';

  // Detect platform
  const youTubeId = extractYouTubeId(currentUrl);
  const twitchChannel = extractTwitchChannel(currentUrl);
  const twitchClip = extractTwitchClip(currentUrl);

  let embedUrl = '';
  let isYouTube = false;
  let isTwitch = false;

  if (youTubeId) {
    isYouTube = true;
    embedUrl = `https://www.youtube.com/embed/${youTubeId}?enablejsapi=1&rel=0&autoplay=1`;
  } else if (twitchClip) {
    isTwitch = true;
    embedUrl = `https://clips.twitch.tv/embed?clip=${twitchClip}&parent=localhost&autoplay=true`;
  } else if (twitchChannel) {
    isTwitch = true;
    embedUrl = `https://player.twitch.tv/?channel=${twitchChannel}&parent=localhost&autoplay=true`;
  }

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
        setCurrentIndex((cur) => (cur > 0 ? cur - 1 : 0));
      } else if (idx < currentIndex) {
        setCurrentIndex((cur) => cur - 1);
      }
      return newPl;
    });
  };

  const skipVideo = () => {
    if (playlist.length === 0) return;
    setCurrentIndex((cur) => (cur + 1) % playlist.length);
  };

  // Note: Twitch iframe does not support volume control via iframe params

  return (
    <div className="relative flex flex-col h-full w-full p-0 bg-black text-white group">
      <div className="absolute top-0 left-0 w-full bg-black bg-opacity-80 p-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-h-48 overflow-auto">
        <div className="flex gap-2 mb-2 items-center">
          <input
            type="text"
            placeholder="Paste YouTube or Twitch URL..."
            className="flex-grow px-2 py-1 rounded text-black"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addToPlaylist();
            }}
          />
          <button
            className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
            onClick={() => setShowPlaylist((show) => !show)}
          >
            Playlist
          </button>
          <button
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-1 rounded"
            onClick={addToPlaylist}
          >
            Add
          </button>
          <button
            className="bg-yellow-600 hover:bg-yellow-700 px-4 py-1 rounded"
            onClick={skipVideo}
          >
            Skip
          </button>
        </div>
        {showPlaylist && (
          <ul className="max-h-32 overflow-auto">
            {playlist.map((item, idx) => {
              const active = idx === currentIndex;
              const title = titles[item] || item;
              return (
                <li
                  key={idx}
                  className={`flex justify-between items-center px-2 py-1 rounded cursor-pointer ${
                    active ? 'bg-indigo-700' : 'hover:bg-gray-700'
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                >
                  <span className="truncate">{title}</span>
                  <button
                    className="ml-2 text-red-500 hover:text-red-700"
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
        )}
      </div>

      {(isYouTube || isTwitch) ? (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={`Video panel ${panelId}`}
        />
      ) : (
        <div className="flex-grow flex items-center justify-center text-gray-400">
          No video loaded
        </div>
      )}
    </div>
  );
}
