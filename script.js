document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let bannerPlaylist = [];
    let currentPlaylist = [];
    let shuffledPlaylist = [];
    let currentViewPlaylist = [];
    let currentSongIndex = 0;
    let isPlaying = false;
    let isShuffled = false;
    let repeatMode = 'none';
    let lastVolume = 1;
    let searchTimeout;
    let initialSong = null;
    const colorThief = new ColorThief();

    const playbackRates = [1, 1.25, 1.5, 0.75];
    let currentRateIndex = 0;

    // --- NAVIGATION HISTORY ---
    let historyStack = [];
    let isNavigatingHistory = false;

    // --- DOM SELECTIONS ---
    const addToPlaylistModal = new bootstrap.Modal(document.getElementById('addToPlaylistModal'));
    const createPlaylistModal = new bootstrap.Modal(document.getElementById('createPlaylistModal'));
    const createPlaylistForm = document.getElementById('create-playlist-form');
    const playlistNameInput = document.getElementById('playlist-name-input');
    let songToAdd = null;

    const audioPlayer = new Audio();
    const playerBar = document.querySelector('.player-bar');
    const mainContent = document.querySelector('.main-content');
    const contentSection = document.querySelector('.content-section');
    const contentTitle = document.getElementById("content-title");
    const songCardContainer = document.getElementById("song-card-container");
    const topArtistsContainer = document.getElementById("top-artists-container");
    const bannerContainer = document.getElementById('banner-container');
    const bannerIndicators = document.getElementById('banner-indicators');
    const bannerInner = document.getElementById('banner-inner');
    const detailHeader = document.getElementById('detail-header');
    const nowPlayingImg = document.querySelector(".player-bar .track-cover-art img");
    const nowPlayingTitle = document.querySelector(".player-bar .track-name");
    const nowPlayingArtist = document.querySelector(".player-bar .track-artist");
    const searchInput = document.querySelector(".search-bar input");
    const topNavbar = document.querySelector(".top-navbar");
    const playerHeartIconWrapper = document.getElementById("player-heart-icon-wrapper");
    const playIcon = document.getElementById("play-icon");
    const pauseIcon = document.getElementById("pause-icon");
    const progressBar = document.querySelector(".player-controls .progress-bar");
    const progress = progressBar.querySelector(".progress");
    const currentTimeDisplay = document.querySelector(".time.current-time");
    const durationDisplay = document.querySelector(".time.duration");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const volumeIconBtn = document.getElementById("volume-icon-btn");
    const volumeUpIcon = document.getElementById("volume-up-icon");
    const volumeDownIcon = document.getElementById("volume-down-icon");
    const volumeMuteIcon = document.getElementById("volume-mute-icon");
    const volumeBar = document.querySelector(".volume-bar");
    const volumeProgress = volumeBar.querySelector(".volume-progress");
    const shuffleBtn = document.getElementById("shuffle-btn");
    const repeatBtn = document.getElementById("repeat-btn");
    const voiceSearchBtn = document.getElementById('voice-search-btn');
    const menuHome = document.getElementById('menu-home');
    const menuSearch = document.getElementById('menu-search');
    const menuLibrary = document.getElementById('menu-library');
    const menuLikedSongs = document.getElementById('menu-liked-songs');
    const userPlaylistsNav = document.getElementById('user-playlists-nav');
    const miniPlayer = document.querySelector('.mini-player');
    const miniPlayerLikeBtn = document.querySelector('.mini-player-like-btn');
    const miniPlayerProgress = document.querySelector('.mini-player-progress');
    const miniPlayerPlayPauseBtn = document.querySelector('.mini-player .play-pause');
    const miniPlayerPrevBtn = document.getElementById('mini-player-prev-btn');
    const miniPlayerNextBtn = document.getElementById('mini-player-next-btn');
    const mobileNavHome = document.getElementById('mobile-nav-home');
    const mobileNavSearch = document.getElementById('mobile-nav-search');
    const mobileNavLibrary = document.getElementById('mobile-nav-library');
    const mobileCreatePlaylistBtn = document.getElementById('mobile-create-playlist-btn');
    const toastContainer = document.getElementById('toast-container');
    const navBackBtn = document.getElementById('nav-back-btn');
    const playbackSpeedBtn = document.getElementById('playback-speed-btn');

    const premiumModalEl = document.getElementById('premiumModal');
    const premiumModal = premiumModalEl ? new bootstrap.Modal(premiumModalEl) : null;
    const premiumToggleInput = document.getElementById('toggle-premium');
    const premiumButtons = [ document.getElementById('menu-premium'), document.getElementById('mobile-nav-premium') ].filter(Boolean);

    // --- UTILITY & API FUNCTIONS ---
    function getFromStorage(key) {
        try {
            const storedValue = JSON.parse(localStorage.getItem(key));
            if (key === 'likedSongs' || key === 'recentlyPlayedSongs') {
                return Array.isArray(storedValue) ? storedValue : [];
            }
            return storedValue || {};
        } catch (e) {
            if (key === 'likedSongs' || key === 'recentlyPlayedSongs') return [];
            return {};
        }
    }
    const saveToStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));

    function getBooleanFromStorage(key, defaultValue = false) {
        const stored = localStorage.getItem(key);
        if (stored === null) return defaultValue;
        try { return JSON.parse(stored) === true; } catch { return defaultValue; }
    }

    async function fetchSongs(query) {
        try {
            const response = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=40`);
            if (!response.ok) throw new Error(`Network error`);
            const data = await response.json();
            return {
                songs: mapApiDataToSongs(data.data?.results || []),
                rawData: data.data?.results || []
            };
        } catch (error) {
            console.error("Error fetching songs:", error);
            return { songs: [], rawData: [] };
        }
    }
    async function fetchArtistDetails(artistId) {
        try {
            const response = await fetch(`https://saavn.dev/api/artists/${artistId}/songs?page=1&limit=50`);
            if (!response.ok) throw new Error(`Network error`);
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error(`Error fetching artist details ${artistId}:`, error);
            return null;
        }
    }

    async function fetchArtistMeta(artistId) {
        try {
            const response = await fetch(`https://saavn.dev/api/artists?id=${artistId}`);
            if (!response.ok) throw new Error('Network error');
            const data = await response.json();
            return data.data;
        } catch (e) {
            console.warn('Artist meta fetch failed', e);
            return null;
        }
    }
    async function fetchAlbumDetails(albumId) {
        try {
            const response = await fetch(`https://saavn.dev/api/albums?id=${albumId}`);
            if (!response.ok) throw new Error(`Network error`);
            const data = await response.json();
            return data.data;
        } catch (error) {
            console.error(`Error fetching album details ${albumId}:`, error);
            return null;
        }
    }

    function mapApiDataToSongs(apiSongs) {
        const likedSongs = getFromStorage('likedSongs');
        return apiSongs.map(song => {
            const artistName = song.artists?.primary?.map(artist => artist.name).join(', ') || "Unknown Artist";
            const songTitle = song.name?.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'") || "Untitled Track";
            const coverUrl = song.image?.find(q => q.quality === '500x500')?.url || song.image?.slice(-1)[0]?.url;
            const audioUrl = song.downloadUrl?.find(q => q.quality === '320kbps')?.url || song.downloadUrl?.slice(-1)[0]?.url;
            const albumId = song.album?.id || null;
            const albumName = song.album?.name?.replace(/&quot;/g, '"') || "Single";
            const artists = song.artists?.primary?.map(artist => ({ id: artist.id, name: artist.name })) || [];
            if (coverUrl && audioUrl) {
                return { id: song.id, title: songTitle, artist: artistName, audioSrc: audioUrl, cover: coverUrl, liked: likedSongs.some(ls => ls.id === song.id), albumId, albumName, artists };
            }
            return null;
        }).filter(song => song !== null);
    }
    
    function addSongToRecentlyPlayed(song) {
        if (!song || !song.id) return;
        let recentlyPlayed = getFromStorage('recentlyPlayedSongs');
        const existingIndex = recentlyPlayed.findIndex(s => s.id === song.id);
        if (existingIndex > -1) recentlyPlayed.splice(existingIndex, 1);
        recentlyPlayed.unshift(song);
        if (recentlyPlayed.length > 25) recentlyPlayed = recentlyPlayed.slice(0, 25);
        saveToStorage('recentlyPlayedSongs', recentlyPlayed);
    }

    // --- LIKED SONGS & PLAYLIST MANAGEMENT ---
    function toggleLike() {
        const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist;
        if (!activePlaylist || currentSongIndex < 0 || !activePlaylist[currentSongIndex]) return;
        playerHeartIconWrapper.classList.add('pop');
        miniPlayerLikeBtn.classList.add('pop');
        setTimeout(() => {
            playerHeartIconWrapper.classList.remove('pop');
            miniPlayerLikeBtn.classList.remove('pop');
        }, 300);
        const currentSong = activePlaylist[currentSongIndex];
        const newLikedStatus = !currentSong.liked;
        currentSong.liked = newLikedStatus;
        let likedSongs = getFromStorage('likedSongs');
        if (newLikedStatus) {
            if (!likedSongs.some(s => s.id === currentSong.id)) likedSongs.push(currentSong);
        } else {
            likedSongs = likedSongs.filter(s => s.id !== currentSong.id);
        }
        saveToStorage('likedSongs', likedSongs);
        updateLikeIcon();
        if (contentTitle.textContent === "Liked Songs") {
            updateView({ title: "Liked Songs", songs: likedSongs, view: "playlist", activeMenu: menuLikedSongs });
        }
        showToast(newLikedStatus ? `Added "${currentSong.title}" to Liked Songs` : `Removed "${currentSong.title}" from Liked Songs`);
    }

    function updateLikeIcon() {
        const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist;
        const playerElements = [playerHeartIconWrapper, miniPlayerLikeBtn];
        if (!activePlaylist || currentSongIndex < 0 || !activePlaylist[currentSongIndex]) {
            playerElements.forEach(el => el && el.classList.remove('active'));
            return;
        }
        const currentSong = activePlaylist[currentSongIndex];
        const isLiked = !!currentSong.liked;
        playerElements.forEach(el => el && el.classList.toggle('active', isLiked));
    }

    function createPlaylist() {
        createPlaylistForm.reset();
        createPlaylistModal.show();
        setTimeout(() => playlistNameInput.focus(), 500);
    }

    function deletePlaylist(playlistName) {
        if (confirm(`Are you sure you want to delete the playlist "${playlistName}"?`)) {
            const playlists = getFromStorage('userPlaylists');
            if (playlists && playlists[playlistName]) {
                delete playlists[playlistName];
                saveToStorage('userPlaylists', playlists);
                renderUserPlaylists();
                showToast(`Playlist "${playlistName}" deleted.`);
                if (contentTitle.textContent === playlistName) {
                    showLibraryIndex();
                }
            }
        }
    }

    function addSongToPlaylist(playlistName) {
        if (!songToAdd) return;
        const playlists = getFromStorage('userPlaylists');
        if (playlists[playlistName]) {
            if (playlists[playlistName].some(s => s.id === songToAdd.id)) {
                showToast(`"${songToAdd.title}" is already in "${playlistName}".`, 'info');
            } else {
                playlists[playlistName].push(songToAdd);
                saveToStorage('userPlaylists', playlists);
                showToast(`Added "${songToAdd.title}" to "${playlistName}".`);
            }
        }
        addToPlaylistModal.hide();
        songToAdd = null;
    }

    // CORRECTED FUNCTION
    function removeSongFromPlaylist(playlistName, songId) {
        const playlists = getFromStorage('userPlaylists');
        if (playlists[playlistName]) {
            // Find the song object before filtering, so we can get its title for the toast.
            const songToRemove = playlists[playlistName].find(s => s.id === songId);

            // *** THE FIX: Check if the song was found before proceeding ***
            if (!songToRemove) {
                console.error(`Song with ID ${songId} not found in playlist "${playlistName}". Cannot remove.`);
                showToast('Error: Could not find the song to remove.', 'error');
                return; // Exit the function to prevent a crash
            }

            // Now it's safe to filter and show the toast
            playlists[playlistName] = playlists[playlistName].filter(s => s.id !== songId);
            saveToStorage('userPlaylists', playlists);
            showToast(`Removed "${songToRemove.title}" from "${playlistName}"`);
            
            // Refresh the view
            showUserPlaylist(playlistName);
        }
    }

    function renderUserPlaylists() {
        const playlists = getFromStorage('userPlaylists') || {};
        userPlaylistsNav.innerHTML = Object.keys(playlists).map(name => `
            <li>
                <a class="nav-link" href="#" data-playlist-name="${name}">${name}</a>
                <button class="delete-playlist-btn" data-playlist-name="${name}" title="Delete playlist">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </li>
        `).join('');
    }

    function initSpeechRecognition() {
        window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!window.SpeechRecognition) {
            voiceSearchBtn.style.display = 'none';
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        let isListening = false;
        recognition.addEventListener('result', e => {
            const transcript = Array.from(e.results).map(result => result[0]).map(result => result.transcript).join('');
            if (transcript) {
                searchInput.value = transcript;
                searchInput.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'Enter' }));
            }
        });
        recognition.addEventListener('start', () => { isListening = true; voiceSearchBtn.classList.add('listening'); showToast('Listening...', 'info'); });
        recognition.addEventListener('end', () => { isListening = false; voiceSearchBtn.classList.remove('listening'); });
        recognition.addEventListener('error', (e) => {
            if (e.error !== 'no-speech') showToast(`Voice search error: ${e.error}`, 'error');
            isListening = false;
            voiceSearchBtn.classList.remove('listening');
        });
        voiceSearchBtn.addEventListener('click', () => {
            if (!isListening) {
                try { recognition.start(); } catch (error) { showToast('Could not start voice recognition.', 'error'); }
            } else {
                recognition.stop();
            }
        });
    }

    function createArtistLinks(song) {
        if (Array.isArray(song.artists) && song.artists.length > 0) {
            return song.artists.filter(artist => artist && artist.id && artist.name).map(artist => `<a href="#" class="artist-link" data-artist-id="${artist.id}">${artist.name}</a>`).join(', ');
        }
        return song.artist || "Unknown Artist";
    }

    // --- RENDERING & UI UPDATES ---
    function renderSongList(songArray) {
        songCardContainer.className = 'song-list-container';
        const playlists = getFromStorage('userPlaylists') || {};
        const isUserPlaylistView = playlists && playlists[contentTitle.textContent];
        
        const header = `<div class="song-list-header"><div>#</div><div class="title-header">Title</div><div class="album-header">Album</div><div></div></div>`;
        const listItems = songArray.map((song, index) => {
            const artistLinks = createArtistLinks(song);
            
            const iconHtml = isUserPlaylistView
                ? `<i class="bi bi-dash-circle remove-from-playlist-icon" title="Remove from this playlist" data-song-id="${song.id}"></i>`
                : `<i class="bi bi-plus-lg add-to-playlist-icon" title="Add to playlist" data-song-id="${song.id}"></i>`;

            return `
            <div class="song-list-item" data-index="${index}" data-song-id="${song.id}">
                <div class="index-container"><span class="index">${index + 1}</span><i class="bi bi-play-fill play-icon"></i></div>
                <div class="title-artist">
                    <img src="${song.cover}" alt="${song.title}" class="cover-art">
                    <div class="details">
                        <div class="title"><a href="#">${song.title}</a></div>
                        <div class="artist">${artistLinks}</div>
                    </div>
                </div>
                <div class="album"><a href="#" class="album-link" data-album-id="${song.albumId}">${song.albumName}</a></div>
                ${iconHtml}
            </div>`;
        }).join('');

        if (songArray.length > 0) {
            songCardContainer.innerHTML = header + listItems;
        } else {
            if (isUserPlaylistView) {
                songCardContainer.innerHTML = `<div class="empty-playlist-view text-center p-5"><i class="fas fa-music fa-3x text-muted mb-3"></i><h3 class="mb-2">Songs will appear here</h3><p class="text-muted mb-4">Add songs to this playlist to get started.</p><button class="btn btn-primary" id="find-songs-btn" style="background-color: var(--primary); border: none; font-weight: 700; padding: 10px 24px; border-radius: 500px;">Find Songs</button></div>`;
            } else {
                 songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">No songs found.</p>`;
            }
        }
        updateNowPlayingIndicator();
    }

    function renderLibraryIndex() {
        const playlists = getFromStorage('userPlaylists') || {};
        const likedSongsItem = ` <div class="library-index-item" data-action="show-liked"> <div class="icon icon-liked"><i class="fas fa-heart"></i></div> <div class="title">Liked Songs</div> <div class="chevron"><i class="fas fa-chevron-right"></i></div> </div>`;
        const userPlaylists = Object.keys(playlists).map(name => ` <div class="library-index-item" data-playlist-name="${name}"> <div class="icon icon-playlist"><i class="fas fa-music"></i></div> <div class="title">${name}</div> <div class="chevron"><i class="fas fa-chevron-right"></i></div> </div>`).join('');
        songCardContainer.className = 'library-index-container';
        songCardContainer.innerHTML = likedSongsItem + userPlaylists;
    }

    function renderHomePageContent(languageSections) {
        songCardContainer.className = '';
        songCardContainer.innerHTML = Object.entries(languageSections).map(([language, data]) => {
            if (data.songs.length > 0) {
                const songCards = data.songs.map(song => `<div class="col" data-identifier="${song.id}" data-song-id="${song.id}" data-playlist-key="${language}" data-album-id="${song.albumId}"><div class="song-circle-item"><div class="image-container"><img src="${song.cover}" alt="${song.title}" crossorigin="anonymous"><button class="play-button"><i class="bi bi-play-circle-fill"></i></button></div><h5><a href="#">${song.title}</a></h5><p><a href="#" class="artist-link" data-artist-id="${song.artists[0]?.id}">${song.artist}</a></p></div></div>`).join('');
                return `<div class="language-section"><h2 class="section-title">${data.title}</h2><div class="song-row-scrollable">${songCards}</div></div>`;
            }
            return '';
        }).join('');
        updateNowPlayingIndicator();
    }

    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    function renderBanner(songs) {
        if (!bannerIndicators || !bannerInner) return;
        bannerIndicators.innerHTML = songs.map((song, index) => ` <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="${index}" class="${index === 0 ? 'active' : ''}" aria-current="${index === 0}" aria-label="Slide ${index + 1}"></button> `).join('');
        bannerInner.innerHTML = songs.map((song, index) => ` <div class="carousel-item ${index === 0 ? 'active' : ''}"> <img src="${song.cover}" class="d-block w-100 banner-img" alt="${song.title}"> <div class="carousel-caption"> <h1>${song.title}</h1> <p>${song.artist}</p> <div class="banner-buttons"> <button class="btn banner-btn primary banner-play-btn" data-song-id="${song.id}"> <i class="fas fa-play me-2"></i> Play Now </button> </div> </div> </div> `).join('');
    }

    function renderTopArtists(artists) {
        topArtistsContainer.innerHTML = artists.slice(0, 10).map(artist => {
            let imageUrl = artist.image?.find(q => q.quality === '500x500')?.url || artist.image?.slice(-1)[0]?.url;
            if (imageUrl) {
                return `<div class="artist-circle-item" role="button" data-artist-id="${artist.id}" data-artist-name="${artist.name}"><img src="${imageUrl}" alt="${artist.name}"><span>${artist.name}</span></div>`;
            }
            return '';
        }).join('');
    }

    function updateHeaderBackground(imageUrl, isDefault = false) {
        if (isDefault || !imageUrl) {
            topNavbar.style.backgroundColor = '';
            return;
        }
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => { topNavbar.style.backgroundColor = `rgb(${colorThief.getColor(img).join(',')})`; };
        img.onerror = () => { topNavbar.style.backgroundColor = ''; };
    }
    
    function renderDetailPageHeader(data) {
        const imageContainer = detailHeader.querySelector('.detail-header-image');
        const imgEl = imageContainer.querySelector('img');
        if (data.image) {
            imageContainer.style.display = 'block';
            imgEl.src = data.image;
            detailHeader.style.setProperty('--header-bg-image', `url(${data.image})`);
            detailHeader.classList.remove('no-image-header');
        } else {
            imageContainer.style.display = 'none';
            detailHeader.style.removeProperty('--header-bg-image');
            detailHeader.classList.add('no-image-header');
        }
        detailHeader.querySelector('.detail-type').textContent = data.type;
        detailHeader.querySelector('.detail-title').textContent = data.title;
        detailHeader.querySelector('.detail-subtitle').innerHTML = data.subtitle;
        detailHeader.className = data.type === 'artist' ? 'artist-page' : 'album-page';
    }
    
    function updateNavButtonVisibility() {
        navBackBtn.classList.toggle('visible', historyStack.length > 1);
    }

    async function updateView(state) {
        if (!isNavigatingHistory) historyStack.push(state);
        updateNavButtonVisibility();

        document.querySelectorAll(".sidebar .nav-link.active, .mobile-nav-bar .nav-item.active").forEach(link => link.classList.remove("active"));
        topNavbar.classList.remove('search-active');
        contentSection.classList.add('loading');
        mainContent.classList.toggle('library-view', state.view === 'playlist' || state.view === 'libraryIndex' || state.view === 'detail');
        mainContent.classList.remove('home-view');

        await new Promise(resolve => setTimeout(resolve, 100));

        contentTitle.style.animation = 'none';
        const footer = document.querySelector('.site-footer');
        currentViewPlaylist = state.songs || [];
        contentTitle.textContent = state.title;

        if (state.view === 'detail' && state.headerData) {
            renderDetailPageHeader(state.headerData);
            detailHeader.classList.remove('hidden');
        } else {
            detailHeader.classList.add('hidden');
        }

        if (state.view === "home") {
            mainContent.classList.add('home-view');
            footer.style.display = 'block';
            contentTitle.style.display = 'none';
            renderHomePageContent(state.languageSections);
            if (bannerPlaylist.length > 0) renderBanner(bannerPlaylist);
            updateHeaderBackground(null, true);
        } else if (state.view === "libraryIndex") {
            footer.style.display = 'none';
            contentTitle.style.display = 'block';
            renderLibraryIndex();
            updateHeaderBackground(null, true);
        } else if (state.view === "detail") {
            footer.style.display = 'none';
            contentTitle.style.display = 'none';
            renderSongList(state.songs);
            updateHeaderBackground(state.headerData?.image || state.songs?.[0]?.cover || null);
        } else {
            footer.style.display = 'none';
            contentTitle.style.display = 'block';
            renderSongList(state.songs);
            updateHeaderBackground(state.songs?.[0]?.cover || null, !state.songs?.[0]?.cover);
        }

        void contentTitle.offsetWidth;
        contentTitle.style.animation = 'fadeInUp 0.5s ease-out both';
        contentSection.classList.remove('loading');
        if (state.activeMenu) {
            state.activeMenu.classList.add("active");
            const mobileEquivalent = document.getElementById(state.activeMenu.id.replace('menu-', 'mobile-nav-'));
            if (mobileEquivalent) mobileEquivalent.classList.add('active');
        }
    }
    
    // --- PAGE NAVIGATION FUNCTIONS ---
    function showHomePage(initialData) { updateView({ title: "Home", view: "home", activeMenu: menuHome, languageSections: initialData }); }
    function showLibraryIndex() { updateView({ title: "Your Library", view: "libraryIndex", activeMenu: menuLibrary }); }
    function showLikedSongs() { updateView({ title: "Liked Songs", songs: getFromStorage('likedSongs'), view: "playlist", activeMenu: menuLikedSongs }); }
    function showUserPlaylist(playlistName) {
        const playlists = getFromStorage('userPlaylists') || {};
        updateView({ title: playlistName, songs: playlists[playlistName] || [], view: "playlist", activeMenu: menuLibrary });
    }
    function showSearchView(query = "") {
        if (query) {
            searchInput.value = query;
            searchInput.dispatchEvent(new KeyboardEvent('keyup', { 'key': 'Enter' }));
        } else {
            updateView({ title: `Search`, songs: [], view: "search", activeMenu: menuSearch });
        }
    }
    
    async function showArtistPage(artistId) {
        songCardContainer.innerHTML = `<div class="loading-spinner"></div>`;
        const [data, meta] = await Promise.all([fetchArtistDetails(artistId), fetchArtistMeta(artistId)]);
        if (data || meta) {
            const artistSongs = mapApiDataToSongs(data?.songs || []);
            const headerImage = (meta?.image?.find(q => q.quality === '500x500')?.url || data?.image?.find(q => q.quality === '500x500')?.url) || artistSongs?.[0]?.cover || null;
            const artistName = meta?.name || data?.name || 'Artist';
            const followers = meta?.followerCount || data?.followerCount || 0;
            const headerData = { image: headerImage, type: 'artist', title: artistName, subtitle: `${parseInt(followers).toLocaleString()} followers` };
            updateView({ songs: artistSongs, view: "detail", activeMenu: null, headerData });
        }
    }

    async function showAlbumPage(albumId) {
        songCardContainer.innerHTML = `<div class="loading-spinner"></div>`;
        const data = await fetchAlbumDetails(albumId);
        if (data) {
            const albumSongs = mapApiDataToSongs(data.songs);
            const artistLinks = data.artists.primary.map(artist => `<a href="#" class="artist-link" data-artist-id="${artist.id}">${artist.name}</a>`).join(', ');
            const headerData = { image: data.image?.find(q => q.quality === '500x500')?.url, type: 'album', title: data.name.replace(/&quot;/g, '"'), subtitle: `${artistLinks} &bull; ${data.year} &bull; ${data.songCount} songs` };
            updateView({ songs: albumSongs, view: "detail", activeMenu: null, headerData });
        }
    }
    
    // --- PLAYER CORE & CONTROLS --- 
    function setDefaultPlayerState(song) { if (!song) return; initialSong = song; playerBar.classList.add('song-loaded'); nowPlayingImg.src = song.cover; nowPlayingTitle.innerHTML = `<a href="#">${song.title}</a>`; nowPlayingArtist.innerHTML = createArtistLinks(song); miniPlayer.classList.add('visible', 'song-loaded'); document.querySelector('.mini-player .track-cover-art img').src = song.cover; document.querySelector('.mini-player .track-name').innerHTML = `<a>${song.title}</a>`; document.querySelector('.mini-player .track-artist').innerHTML = `<a>${song.artist}</a>`; const miniPlayerImgEl = new Image(); miniPlayerImgEl.crossOrigin = "Anonymous"; miniPlayerImgEl.src = song.cover; miniPlayerImgEl.onload = () => { miniPlayer.style.backgroundColor = `rgb(${colorThief.getColor(miniPlayerImgEl).join(',')})`; }; }
    function loadSong(index) { const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (!activePlaylist || index < 0 || index >= activePlaylist.length) return; currentSongIndex = index; const song = activePlaylist[index]; if (song) addSongToRecentlyPlayed(song); setDefaultPlayerState(song); initialSong = null; audioPlayer.src = song.audioSrc; updateLikeIcon(); updateNowPlayingIndicator(); }
    function playAudio() { if(!audioPlayer.src) return; audioPlayer.play().then(() => { isPlaying = true; updatePlayPauseIcon(); updateCardPlayPauseIcon(); }).catch(error => { isPlaying = false; updatePlayPauseIcon(); }); }
    function pauseAudio() { isPlaying = false; audioPlayer.pause(); updatePlayPauseIcon(); updateCardPlayPauseIcon(); }
    function togglePlay() { if (!isPlaying && !audioPlayer.src && initialSong) { currentPlaylist = [initialSong]; loadSong(0); playAudio(); return; } if (!audioPlayer.src && currentPlaylist?.length > 0) { loadSong(0); playAudio(); } else { isPlaying ? pauseAudio() : playAudio(); } }
    function prevSong() { const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (!activePlaylist?.length) return; const wasPlaying = isPlaying; loadSong((currentSongIndex - 1 + activePlaylist.length) % activePlaylist.length); if (wasPlaying) playAudio(); }
    function nextSong() { const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (!activePlaylist?.length) return; const wasPlaying = isPlaying; let newIndex = currentSongIndex + 1; if (newIndex >= activePlaylist.length) { if (repeatMode === 'all' || isShuffled) { newIndex = 0; } else { pauseAudio(); loadSong(0); audioPlayer.currentTime = 0; updateProgress(); return; } } loadSong(newIndex); if (wasPlaying) playAudio(); }
    function handleSongEnd() { if (repeatMode === 'one') { audioPlayer.currentTime = 0; playAudio(); } else { nextSong(); } }
    function toggleShuffle() { isShuffled = !isShuffled; updateShuffleIcon(); shuffleBtn.classList.add('pop'); setTimeout(() => shuffleBtn.classList.remove('pop'), 300); if (isShuffled && currentPlaylist.length > 0) { const currentSong = currentPlaylist[currentSongIndex]; shuffledPlaylist = [...currentPlaylist].sort(() => Math.random() - 0.5); const playingIndex = shuffledPlaylist.findIndex(song => song.id === currentSong.id); if (playingIndex > -1) { const [item] = shuffledPlaylist.splice(playingIndex, 1); shuffledPlaylist.unshift(item); } currentSongIndex = 0; } }
    function toggleRepeat() { repeatBtn.classList.add('pop'); setTimeout(() => repeatBtn.classList.remove('pop'), 300); if (repeatMode === 'none') repeatMode = 'all'; else if (repeatMode === 'all') repeatMode = 'one'; else repeatMode = 'none'; updateRepeatIcon(); }
    function setProgress(e) { if (audioPlayer.duration) audioPlayer.currentTime = (e.offsetX / e.currentTarget.clientWidth) * audioPlayer.duration; }
    function setVolume(e) { audioPlayer.volume = e.offsetX / e.currentTarget.clientWidth; updateVolumeDisplay(); }
    function toggleMute() { audioPlayer.volume > 0 ? (lastVolume = audioPlayer.volume, audioPlayer.volume = 0) : (audioPlayer.volume = lastVolume); updateVolumeDisplay(); }
    function formatTime(seconds) { const min = Math.floor(seconds / 60); const sec = Math.floor(seconds % 60); return `${min}:${sec < 10 ? '0' : ''}${sec}`; }
    function updateProgress() { const { duration, currentTime } = audioPlayer; if (duration) { const progressPercent = `${(currentTime / duration) * 100}%`; progress.style.width = progressPercent; currentTimeDisplay.textContent = formatTime(currentTime); durationDisplay.textContent = isNaN(duration) ? '0:00' : formatTime(duration); miniPlayerProgress.style.width = progressPercent; } }
    function updatePlayPauseIcon() { const isPlayingState = isPlaying ? "none" : "inline-block"; const isPausedState = isPlaying ? "inline-block" : "none"; playIcon.style.display = isPlayingState; pauseIcon.style.display = isPausedState; miniPlayerPlayPauseBtn.querySelector('.bi-play-circle-fill').style.display = isPlayingState; miniPlayerPlayPauseBtn.querySelector('.bi-pause-circle-fill').style.display = isPausedState; }
    function updateVolumeDisplay() { const vol = audioPlayer.volume; volumeProgress.style.width = `${vol * 100}%`; volumeUpIcon.style.display = vol > 0.5 ? "block" : "none"; volumeDownIcon.style.display = vol > 0 && vol <= 0.5 ? "block" : "none"; volumeMuteIcon.style.display = vol === 0 ? "block" : "none"; }
    function updateCardPlayPauseIcon() { document.querySelectorAll(".now-playing .play-button i, .now-playing .play-icon").forEach(icon => { icon.className = isPlaying ? "bi bi-pause-fill play-icon" : "bi bi-play-fill play-icon"; }); }
    function updateShuffleIcon() { shuffleBtn.classList.toggle('active', isShuffled); }
    function updateRepeatIcon() { const icon = repeatBtn.querySelector('i'); repeatBtn.classList.remove('active', 'repeat-one'); if (repeatMode === 'all') { icon.className = 'bi bi-repeat'; repeatBtn.classList.add('active'); } else if (repeatMode === 'one') { icon.className = 'bi bi-repeat-1'; repeatBtn.classList.add('active', 'repeat-one'); } else { icon.className = 'bi bi-repeat'; } }
    function updateNowPlayingIndicator() { document.querySelectorAll(".now-playing").forEach(item => item.classList.remove("now-playing")); const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (activePlaylist?.[currentSongIndex]) { const currentItem = document.querySelector(`.song-list-item[data-song-id="${activePlaylist[currentSongIndex].id}"], .col[data-song-id="${activePlaylist[currentSongIndex].id}"]`); if (currentItem) { currentItem.classList.add("now-playing"); updateCardPlayPauseIcon(); } } }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        document.querySelectorAll(".play-pause").forEach(btn => btn.addEventListener("click", togglePlay));
        prevBtn.addEventListener("click", prevSong);
        nextBtn.addEventListener("click", nextSong);
        shuffleBtn.addEventListener("click", toggleShuffle);
        repeatBtn.addEventListener("click", toggleRepeat);
        progressBar.addEventListener("click", setProgress);
        playerHeartIconWrapper.addEventListener("click", toggleLike);
        miniPlayerLikeBtn.addEventListener('click', toggleLike);
        miniPlayerPrevBtn.addEventListener('click', prevSong);
        miniPlayerNextBtn.addEventListener('click', nextSong);
        volumeIconBtn.addEventListener("click", toggleMute);
        volumeBar.addEventListener("click", setVolume);
        audioPlayer.addEventListener("timeupdate", updateProgress);
        audioPlayer.addEventListener("ended", handleSongEnd);
        initSpeechRecognition();
        
        document.querySelectorAll('.js-go-home').forEach(logo => logo.addEventListener('click', e => { e.preventDefault(); init(true); }));
        menuHome.addEventListener('click', e => { e.preventDefault(); init(true); });
        menuSearch.addEventListener('click', e => { e.preventDefault(); showSearchView(); searchInput.focus(); });
        menuLibrary.addEventListener('click', e => { if (e.target.closest('.create-playlist-icon')) { e.preventDefault(); e.stopPropagation(); createPlaylist(); } else { e.preventDefault(); showLibraryIndex(); } });
        menuLikedSongs.addEventListener('click', e => { e.preventDefault(); showLikedSongs(); });
        
        userPlaylistsNav.addEventListener('click', e => {
            const playlistLink = e.target.closest('a[data-playlist-name]');
            const deleteBtn = e.target.closest('.delete-playlist-btn');
            if (deleteBtn) { e.preventDefault(); deletePlaylist(deleteBtn.dataset.playlistName); } 
            else if (playlistLink) { e.preventDefault(); showUserPlaylist(playlistLink.dataset.playlistName); }
        });

        userPlaylistsNav.addEventListener('contextmenu', e => {
            e.preventDefault();
            const li = e.target.closest('li');
            if (li) {
                document.querySelectorAll('#user-playlists-nav li.show-delete').forEach(item => { if (item !== li) item.classList.remove('show-delete'); });
                li.classList.toggle('show-delete');
            }
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#user-playlists-nav')) {
                document.querySelectorAll('#user-playlists-nav li.show-delete').forEach(item => item.classList.remove('show-delete'));
            }
        });

        searchInput.addEventListener("keyup", e => { clearTimeout(searchTimeout); const query = e.target.value.trim(); if (query) { searchTimeout = setTimeout(async () => { songCardContainer.innerHTML = `<div class="loading-spinner"></div>`; const { songs } = await fetchSongs(query); updateView({ title: `Results for "${query}"`, songs, view: "search", activeMenu: menuSearch }); }, 500); } });
        
        mobileNavHome.addEventListener('click', e => { e.preventDefault(); init(true); });
        mobileNavSearch.addEventListener('click', e => { e.preventDefault(); topNavbar.classList.add("search-active"); showSearchView(); searchInput.focus(); });
        mobileNavLibrary.addEventListener('click', e => { e.preventDefault(); showLibraryIndex(); });
        mainContent.addEventListener('scroll', () => topNavbar.classList.toggle('scrolled', mainContent.scrollTop > 10));
        mobileCreatePlaylistBtn.addEventListener('click', createPlaylist);

        navBackBtn.addEventListener('click', () => {
            if (historyStack.length > 1) {
                isNavigatingHistory = true;
                historyStack.pop(); 
                updateView(historyStack[historyStack.length - 1]);
                isNavigatingHistory = false;
            }
        });

        songCardContainer.addEventListener("click", e => {
            if (e.target.closest('#find-songs-btn')) { e.preventDefault(); showSearchView(); searchInput.focus(); return; }
            if (e.target.closest('.artist-link')?.dataset.artistId) { e.preventDefault(); showArtistPage(e.target.closest('.artist-link').dataset.artistId); return; }
            if (e.target.closest('.album-link')) { e.preventDefault(); showAlbumPage(e.target.closest('.album-link').dataset.albumId); return; }
            const libraryItem = e.target.closest(".library-index-item");
            if (libraryItem) { if (libraryItem.dataset.action === 'show-liked') showLikedSongs(); else if (libraryItem.dataset.playlistName) showUserPlaylist(libraryItem.dataset.playlistName); return; }
            
            const addToPlaylistBtn = e.target.closest(".add-to-playlist-icon");
            if (addToPlaylistBtn) { e.stopPropagation(); const songId = addToPlaylistBtn.dataset.songId; const foundSong = currentViewPlaylist.find(s => s.id === songId); if (foundSong) { songToAdd = foundSong; const modalBody = document.getElementById('playlist-modal-body'); const playlists = getFromStorage('userPlaylists') || {}; modalBody.innerHTML = Object.keys(playlists).length > 0 ? `<ul class="list-group list-group-flush">${Object.keys(playlists).map(name => `<li class="list-group-item" data-playlist-name="${name}">${name}</li>`).join('')}</ul>` : '<p class="text-center text-muted">You have no playlists.</p>'; addToPlaylistModal.show(); } return; }

            const removeFromPlaylistBtn = e.target.closest(".remove-from-playlist-icon");
            if(removeFromPlaylistBtn) { e.stopPropagation(); const songId = removeFromPlaylistBtn.dataset.songId; removeSongFromPlaylist(contentTitle.textContent, songId); return; }

            const songItem = e.target.closest(".col, .song-list-item");
            if (!songItem) return;
            if (e.target.closest(".play-button") || e.target.closest(".index-container") || (e.target.closest('.title-artist') && songItem.classList.contains('song-list-item'))) {
                let playlistToUse, songIdToFind;
                if (songItem.dataset.playlistKey) { playlistToUse = window.homePageData[songItem.dataset.playlistKey].songs; songIdToFind = songItem.dataset.identifier; } else { playlistToUse = currentViewPlaylist; songIdToFind = playlistToUse[parseInt(songItem.dataset.index, 10)]?.id; }
                if (!songIdToFind) return;
                const indexToPlay = playlistToUse.findIndex(s => s.id === songIdToFind);
                if (indexToPlay >= 0) {
                    const isNewPlaylist = JSON.stringify(currentPlaylist) !== JSON.stringify(playlistToUse);
                    if (isNewPlaylist) { currentPlaylist = [...playlistToUse]; if (isShuffled) { isShuffled = false; updateShuffleIcon(); } }
                    const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist;
                    const indexInActivePlaylist = activePlaylist.findIndex(s => s.id === songIdToFind);
                    if (indexInActivePlaylist === currentSongIndex && isPlaying && !isNewPlaylist) { pauseAudio(); } 
                    else { loadSong(indexInActivePlaylist >= 0 ? indexInActivePlaylist : indexToPlay); playAudio(); }
                }
            } else if (songItem.dataset.albumId) {
                showAlbumPage(songItem.dataset.albumId);
            }
        });
        
        createPlaylistForm.addEventListener('submit', (e) => { e.preventDefault(); const playlistName = playlistNameInput.value.trim(); if (playlistName) { const playlists = getFromStorage('userPlaylists') || {}; if (playlists[playlistName]) { showToast(`Playlist "${playlistName}" already exists.`, 'error'); } else { playlists[playlistName] = []; saveToStorage('userPlaylists', playlists); renderUserPlaylists(); showToast(`Playlist "${playlistName}" created`); createPlaylistModal.hide(); if (contentTitle.textContent === "Your Library") showLibraryIndex(); } } });
        document.getElementById('playlist-modal-body').addEventListener('click', e => { if (e.target.closest('.list-group-item')) addSongToPlaylist(e.target.closest('.list-group-item').dataset.playlistName); });
        topArtistsContainer.addEventListener('click', e => { if (e.target.closest('.artist-circle-item')) showArtistPage(e.target.closest('.artist-circle-item').dataset.artistId); });
        playerBar.addEventListener('click', e => { if (e.target.closest('.artist-link')?.dataset.artistId) { e.preventDefault(); showArtistPage(e.target.closest('.artist-link').dataset.artistId); } });
        bannerContainer.addEventListener('click', e => { const playBtn = e.target.closest('.banner-play-btn'); if (playBtn) { const indexToPlay = bannerPlaylist.findIndex(s => s.id === playBtn.dataset.songId); if (indexToPlay !== -1) { if (JSON.stringify(currentPlaylist) !== JSON.stringify(bannerPlaylist)) { currentPlaylist = [...bannerPlaylist]; if (isShuffled) { isShuffled = false; updateShuffleIcon(); } } loadSong(indexToPlay); playAudio(); } } });
        
        playbackSpeedBtn.addEventListener('click', () => { currentRateIndex = (currentRateIndex + 1) % playbackRates.length; const newRate = playbackRates[currentRateIndex]; audioPlayer.playbackRate = newRate; playbackSpeedBtn.textContent = `${newRate}x`; playbackSpeedBtn.classList.toggle('active', newRate !== 1); saveToStorage('playbackRate', newRate); });
        if (premiumButtons.length && premiumModal) premiumButtons.forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); premiumModal.show(); }));
        if (premiumToggleInput) premiumToggleInput.addEventListener('change', () => { const enabled = premiumToggleInput.checked; localStorage.setItem('isPremium', JSON.stringify(!!enabled)); showToast(enabled ? 'Premium activated' : 'Premium deactivated'); });
        window.addEventListener('keydown', (e) => { const activeTag = document.activeElement?.tagName || ''; if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return; switch (e.key.toLowerCase()) { case ' ': e.preventDefault(); togglePlay(); break; case 'k': togglePlay(); break; case 'j': prevSong(); break; case 'l': nextSong(); break; case 'm': toggleMute(); break; case 's': toggleShuffle(); break; case 'r': toggleRepeat(); break; case 'arrowleft': if (audioPlayer.duration) audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 5); break; case 'arrowright': if (audioPlayer.duration) audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 5); break; case 'f': toggleLike(); break; } });
    }

    // --- INITIALIZATION ---
    async function init(isReload = false) {
        if (isReload) {
            historyStack = [];
            isNavigatingHistory = false;
        }

        if (isReload && window.homePageData) {
            showHomePage(window.homePageData);
            return;
        }

        songCardContainer.innerHTML = `<div class="loading-spinner"></div>`;
        
        // Use Promise.all to fetch everything concurrently for faster loading
        const [
            devaraResult,
            songResults,
            artistDetailsResults
        ] = await Promise.all([
            fetchSongs('Chuttamalle Devara'), // Dynamically fetch the default song
            Promise.all([
                fetchSongs('telugu latest'),
                fetchSongs('latest english'),
                fetchSongs('hindi new releases'),
                fetchSongs('tamil new songs'),
                fetchSongs('malayalam latest'),
            ]),
            Promise.all(
                ['Sid Sriram', 'Arijit Singh', 'Shreya Ghoshal', 'Anirudh Ravichander', 'A. R. Rahman', 'Sonu Nigam', 'Sunidhi Chauhan', 'Jubin Nautiyal', 'Pritam', 'Badshah', 'K.S. Chithra', 'Justin Bieber']
                .map(name => fetch(`https://saavn.dev/api/search/artists?query=${encodeURIComponent(name)}`).then(res => res.json()))
            )
        ]);
        
        // Set the default song using the live data
        const defaultSong = devaraResult.songs[0];
        if (defaultSong) {
            setDefaultPlayerState(defaultSong);
        } else if (songResults[0]?.songs[0]) {
            // Fallback to the first available song if Devara song isn't found
            setDefaultPlayerState(songResults[0].songs[0]);
        }

        bannerPlaylist = [...new Map(songResults.flatMap(result => result.songs).map(item => [item['id'], item])).values()].slice(0, 5);
        const topArtists = artistDetailsResults.map(res => res.data?.results?.[0]).filter(Boolean);
        
        const initialData = {};
        const recentlyPlayed = getFromStorage('recentlyPlayedSongs');
        if (recentlyPlayed.length > 0) {
            initialData.recentlyPlayed = { title: 'Recently Played', songs: recentlyPlayed };
        }
        
        Object.assign(initialData, { 
            telugu: { title: 'Latest in Telugu', songs: songResults[0].songs }, 
            english: { title: 'Latest English Hits', songs: songResults[1].songs }, 
            hindi: { title: 'New Hindi Releases', songs: songResults[2].songs }, 
            tamil: { title: 'New in Tamil', songs: songResults[3].songs }, 
            malayalam: { title: 'Latest Malayalam', songs: songResults[4].songs } 
        });
        
        window.homePageData = initialData;
        
        if (!isReload) setupEventListeners();
        
        const persistedVolume = parseFloat(localStorage.getItem('volume') || '0.8');
        if (!Number.isNaN(persistedVolume)) audioPlayer.volume = persistedVolume;
        
        const persistedRate = parseFloat(localStorage.getItem('playbackRate') || '1');
        const rateIndex = playbackRates.indexOf(persistedRate);
        currentRateIndex = rateIndex !== -1 ? rateIndex : 0;
        audioPlayer.playbackRate = playbackRates[currentRateIndex];
        playbackSpeedBtn.textContent = `${audioPlayer.playbackRate}x`;
        playbackSpeedBtn.classList.toggle('active', audioPlayer.playbackRate !== 1);
        
        if (premiumToggleInput) premiumToggleInput.checked = getBooleanFromStorage('isPremium', false);
        
        updateVolumeDisplay();
        renderUserPlaylists();
        showHomePage(initialData);
        renderTopArtists(topArtists);
    }
    
    audioPlayer.addEventListener('volumechange', () => { localStorage.setItem('volume', String(audioPlayer.volume)); });
    
    init();
});