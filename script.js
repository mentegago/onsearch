// script.js

let songs = [];
let filteredSongs = [];
let debounceTimer;
let worker;

async function fetchSongs() {
  try {
    const response = await fetch('songs.json');
    songs = await response.json();

    // Parse the date and add a Date object to each song
    songs = songs.map(song => ({
      ...song,
      dateObj: parseDateString(song.date)
    }));

    // Sort songs by date in descending order (most recent first)
    songs.sort((a, b) => b.dateObj - a.dateObj);

    initializeFilters();
    renderSongs(songs);

    // Initialize the Web Worker after songs are loaded
    initializeWorker();
  } catch (error) {
    console.error('Error fetching songs:', error);
  }
}

function parseDateString(dateStr) {
  // dateStr is expected to be in 'YYYYMMDD' format
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1; // Months are zero-based
  const day = parseInt(dateStr.substring(6, 8));
  return new Date(year, month, day);
}

function initializeFilters() {
  // Populate category filter options
  const categorySelect = document.getElementById('category-select');
  const categories = [...new Set(songs.map(song => song.category))].sort();
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });

  // Populate level filter options
  const levelSelect = document.getElementById('level-select');
  const levelsSet = new Set();

  const levelKeys = ['lev_bas', 'lev_adv', 'lev_exc', 'lev_mas', 'lev_lnt'];

  songs.forEach(song => {
    levelKeys.forEach(key => {
      if (song[key] && song[key] !== '') {
        levelsSet.add(song[key]);
      }
    });
  });

  const levels = Array.from(levelsSet);

  // Sort levels using custom comparator
  levels.sort((a, b) => parseLevel(a) - parseLevel(b));

  levels.forEach(level => {
    const option = document.createElement('option');
    option.value = level;
    option.textContent = level;
    levelSelect.appendChild(option);
  });

  // Add event listeners with debounce
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    showSearching(); // Show "Searching..." immediately
    debounce(applyFilters, 300);
  });

  document.getElementById('category-select').addEventListener('change', () => {
    showSearching();
    applyFilters();
  });

  document.getElementById('level-select').addEventListener('change', () => {
    showSearching();
    applyFilters();
  });
}

function parseLevel(levelStr) {
  if (!levelStr) return null;
  let level = levelStr.replace('+', '.5');
  return parseFloat(level);
}

function debounce(func, delay) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    func();
  }, delay);
}

function applyFilters() {
  const searchQuery = document.getElementById('search-input').value.toLowerCase();
  const selectedCategory = document.getElementById('category-select').value;
  const selectedLevel = document.getElementById('level-select').value;

  // Send filter parameters to the worker
  worker.postMessage({
    type: 'filter',
    data: {
      searchQuery,
      selectedCategory,
      selectedLevel
    }
  });
}

function normalizeString(str) {
  return str.replace(/[\s\-\_\'\"\,\.\!\?\&\(\)\[\]\{\}]/g, '');
}

function renderSongs(songsToRender) {
  const songList = document.getElementById('song-list');
  songList.innerHTML = '';

  if (songsToRender.length === 0) {
    songList.innerHTML = '<p>No songs found.</p>';
    return;
  }

  // Create a DocumentFragment to improve performance
  const fragment = document.createDocumentFragment();

  songsToRender.forEach(song => {
    const songItem = document.createElement('div');
    songItem.className = 'song-item';

    // Add click event to show song details
    songItem.addEventListener('click', () => {
      showSongDetails(song);
    });

    const songImage = document.createElement('div');
    songImage.className = 'song-image';
    const img = document.createElement('img');
    img.src = `https://ongeki-net.com/ongeki-mobile/img/music/${song.image_url}`;
    img.alt = song.title;
    songImage.appendChild(img);

    const songInfo = document.createElement('div');
    songInfo.className = 'song-info';

    const title = document.createElement('h2');
    title.textContent = song.title;
    songInfo.appendChild(title);

    if (song.romaji_title) {
      const romajiTitle = document.createElement('p');
      romajiTitle.textContent = song.romaji_title;
      romajiTitle.className = 'romaji';
      songInfo.appendChild(romajiTitle);
    }

    const artist = document.createElement('p');
    artist.textContent = `Artist: ${song.artist}`;
    songInfo.appendChild(artist);

    if (song.romaji_artist) {
      const romajiArtist = document.createElement('p');
      romajiArtist.textContent = song.romaji_artist;
      romajiArtist.className = 'romaji';
      songInfo.appendChild(romajiArtist);
    }

    const levels = document.createElement('div');
    levels.className = 'song-levels';

    const levelKeys = ['lev_bas', 'lev_adv', 'lev_exc', 'lev_mas', 'lev_lnt'];

    levelKeys.forEach(levelKey => {
      if (song[levelKey] && song[levelKey] !== '') {
        const levelSpan = document.createElement('span');
        levelSpan.textContent = `${song[levelKey]}`;
        levels.appendChild(levelSpan);
      }
    });

    songInfo.appendChild(levels);

    const requestButton = document.createElement('button');
    requestButton.className = 'request-button';
    requestButton.textContent = 'Request';
    requestButton.addEventListener('click', (event) => {
      event.stopPropagation(); // Prevent triggering song click event
      const osrCode = song.osr_code;
      copyToClipboard(`!osr ${osrCode}`);
      showPopup('Request code copied! Paste this into the streamer\'s chat.');
    });

    songInfo.appendChild(requestButton);

    songItem.appendChild(songImage);
    songItem.appendChild(songInfo);

    fragment.appendChild(songItem);
  });

  songList.appendChild(fragment);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    // Success
  }, (err) => {
    console.error('Could not copy text: ', err);
  });
}

function showPopup(message) {
  const popup = document.getElementById('popup-notification');
  const popupMessage = document.getElementById('popup-message');
  popupMessage.textContent = message;
  popup.classList.remove('hidden');
  setTimeout(() => {
    popup.classList.add('hidden');
  }, 3000);
}

function showSongDetails(song) {
  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  // Close button
  const closeButton = document.createElement('span');
  closeButton.className = 'modal-close';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalOverlay);
  });

  modalContent.appendChild(closeButton);

  // Song details
  const songDetails = document.createElement('pre');
  songDetails.textContent = JSON.stringify(song, null, 2);

  modalContent.appendChild(songDetails);

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);
}

function showSearching() {
  const songList = document.getElementById('song-list');
  songList.innerHTML = '<p>Searching...</p>';
}

function initializeWorker() {
  worker = new Worker('worker.js');

  // Send the songs data to the worker
  worker.postMessage({
    type: 'init',
    data: songs
  });

  worker.onmessage = function(event) {
    const { type, data } = event.data;
    if (type === 'filteredSongs') {
      renderSongs(data);
    }
  };
}

// Initialize the application
fetchSongs();
