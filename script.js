// script.js

let songs = [];
let filteredSongs = [];

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

  // Add event listeners
  document.getElementById('search-input').addEventListener('input', applyFilters);
  document.getElementById('category-select').addEventListener('change', applyFilters);
  document.getElementById('level-select').addEventListener('change', applyFilters);
}

function parseLevel(levelStr) {
  if (!levelStr) return null;
  let level = levelStr.replace('+', '.5');
  return parseFloat(level);
}

function applyFilters() {
  const searchQuery = document.getElementById('search-input').value.toLowerCase();
  const selectedCategory = document.getElementById('category-select').value;
  const selectedLevel = document.getElementById('level-select').value;

  filteredSongs = songs.filter(song => {
    // Search filter
    let searchMatch = false;
    if (searchQuery === '') {
      searchMatch = true;
    } else {
      const lowerSearchQuery = searchQuery.toLowerCase();

      // Normalize strings by removing spaces and special characters
      const normalizedSearchQuery = normalizeString(lowerSearchQuery);

      const titleMatch = song.title.toLowerCase().includes(lowerSearchQuery) ||
        (song.title_sort && song.title_sort.toLowerCase().includes(lowerSearchQuery));

      const artistMatch = song.artist.toLowerCase().includes(lowerSearchQuery);

      const romajiTitleMatch = song.romaji_title && normalizeString(song.romaji_title.toLowerCase()).includes(normalizedSearchQuery);

      const romajiArtistMatch = song.romaji_artist && normalizeString(song.romaji_artist.toLowerCase()).includes(normalizedSearchQuery);

      const osrCodeMatch = song.osr_code && song.osr_code.toLowerCase() === lowerSearchQuery;

      searchMatch = titleMatch || artistMatch || romajiTitleMatch || romajiArtistMatch || osrCodeMatch;
    }

    // Category filter
    const categoryMatch = selectedCategory ? song.category === selectedCategory : true;

    // Level filter
    let levelMatch = true;
    if (selectedLevel) {
      const levelKeys = ['lev_bas', 'lev_adv', 'lev_exc', 'lev_mas', 'lev_lnt'];
      levelMatch = levelKeys.some(key => song[key] === selectedLevel);
    }

    return searchMatch && categoryMatch && levelMatch;
  });

  renderSongs(filteredSongs);
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

    songList.appendChild(songItem);
  });
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

// Initialize the application
fetchSongs();
