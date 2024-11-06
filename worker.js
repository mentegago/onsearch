// worker.js

let songs = [];

self.onmessage = function(event) {
  const { type, data } = event.data;

  if (type === 'init') {
    songs = data;
  } else if (type === 'filter') {
    const { searchQuery, selectedCategory, selectedLevel } = data;
    const filteredSongs = filterSongs(searchQuery, selectedCategory, selectedLevel);
    self.postMessage({
      type: 'filteredSongs',
      data: filteredSongs
    });
  }
};

function filterSongs(searchQuery, selectedCategory, selectedLevel) {
  return songs.filter(song => {
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
}

function normalizeString(str) {
  return str.replace(/[\s\-\_\'\"\,\.\!\?\&\(\)\[\]\{\}]/g, '');
}
