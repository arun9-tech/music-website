document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let currentPlaylist = [];
    let currentViewPlaylist = []; // The playlist currently displayed on screen
    let currentSongIndex = 0;
    let isPlaying = false;
    let lastVolume = 1;
    let navigationHistory = [];
    let historyIndex = -1;
    let searchTimeout;
    const colorThief = new ColorThief(); // For dynamic background

    // --- DOM SELECTIONS ---
    const audioPlayer = new Audio();
    const mainContent = document.querySelector('.main-content');
    const contentSection = document.querySelector('.content-section');
    const contentTitle = document.getElementById("content-title");
    const songCardContainer = document.getElementById("song-card-container");
    const topArtistsContainer = document.getElementById("top-artists-container");
    const playPauseBtn = document.querySelector(".play-pause");
    const nowPlayingImg = document.querySelector(".now-playing img");
    const nowPlayingTitle = document.querySelector(".track-name");
    const nowPlayingArtist = document.querySelector(".track-artist");
    const menuHome = document.getElementById('menu-home');
    const menuLikedSongs = document.getElementById('menu-liked-songs');
    const searchInput = document.querySelector(".search-bar input");
    const backBtn = document.getElementById("back-btn");
    const forwardBtn = document.getElementById("forward-btn");
    const mobileSearchBtn = document.getElementById("mobile-search-btn");
    const topNavbar = document.querySelector(".top-navbar");
    const mobileSearchCloseBtn = document.getElementById("mobile-search-close-btn");
    const playerHeartIconWrapper = document.getElementById("player-heart-icon-wrapper");
    const playIcon = document.getElementById("play-icon");
    const pauseIcon = document.getElementById("pause-icon");
    const progressBar = document.querySelector(".player-controls .progress-bar");
    const progress = progressBar.querySelector(".progress");
    const currentTimeDisplay = document.querySelector(".time.current-time");
    const durationDisplay = document.querySelector(".time.duration");
    const prevBtn = document.querySelector(".player-controls button[aria-label='Previous Track']");
    const nextBtn = document.querySelector(".player-controls button[aria-label='Next Track']");
    const volumeIconBtn = document.getElementById("volume-icon-btn");
    const volumeUpIcon = document.getElementById("volume-up-icon");
    const volumeDownIcon = document.getElementById("volume-down-icon");
    const volumeMuteIcon = document.getElementById("volume-mute-icon");
    const volumeProgress = document.querySelector(".volume-bar .volume-progress");

    // --- STORAGE HELPERS ---
    const getFromStorage = (key) => JSON.parse(localStorage.getItem(key)) || {};
    const saveToStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    
    // --- API & DATA HANDLING ---
    async function fetchSongs(query) {
        const url = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=40`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network response was not ok`);
            const data = await response.json();
            return {
                songs: mapApiDataToSongs(data.data?.results || []),
                rawData: data.data?.results || []
            };
        } catch (error) { console.error("Error fetching songs:", error); return { songs: [], rawData: [] }; }
    }
    
    async function fetchSongsByArtist(artistId) {
        const url = `https://saavn.dev/api/artists/${artistId}/songs?page=1&limit=50`;
         try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network response was not ok`);
            const data = await response.json();
            return mapApiDataToSongs(data.data?.songs || []);
        } catch (error) { console.error(`Error fetching songs for artist ${artistId}:`, error); return []; }
    }

    async function fetchAlbumSongs(albumId) {
        const url = `https://saavn.dev/api/albums?id=${albumId}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network response was not ok`);
            const data = await response.json();
            return mapApiDataToSongs(data.data?.songs || []);
        } catch (error) { console.error(`Error fetching songs for album ${albumId}:`, error); return []; }
    }

    function mapApiDataToSongs(apiSongs) {
        const likedSongs = getFromStorage('likedSongs') || [];
        return apiSongs.map(song => {
            let artistName = song.artists?.primary?.map(artist => artist.name).join(', ') || "Unknown Artist";
            let songTitle = song.name?.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'") || "Untitled Track";
            let coverUrl = song.image?.find(q => q.quality === '500x500')?.url || song.image?.slice(-1)[0]?.url;
            let audioUrl = song.downloadUrl?.find(q => q.quality === '320kbps')?.url || song.downloadUrl?.slice(-1)[0]?.url;
            let albumId = song.album?.id || null;
            let albumName = song.album?.name?.replace(/&quot;/g, '"') || null;
            
            if (coverUrl && audioUrl) {
                return { id: song.id, title: songTitle, artist: artistName, audioSrc: audioUrl, cover: coverUrl, liked: Array.isArray(likedSongs) && likedSongs.some(ls => ls.id === song.id), albumId, albumName };
            }
            return null;
        }).filter(song => song !== null);
    }

    // --- LIKED SONGS LOGIC ---
    function isSongInList(songId, list) { return list.some(s => s.id === songId); }
    
    function toggleLike() {
        if (!currentPlaylist[currentSongIndex]) return;
        playerHeartIconWrapper.classList.add('pop');
        setTimeout(() => playerHeartIconWrapper.classList.remove('pop'), 300);

        const song = currentPlaylist[currentSongIndex];
        let likedData = getFromStorage('likedSongs');
        if (!Array.isArray(likedData)) likedData = [];

        if (isSongInList(song.id, likedData)) {
            likedData = likedData.filter(s => s.id !== song.id);
        } else {
            likedData.push(song);
        }
        saveToStorage('likedSongs', likedData);
        updateLikeIcon();
        if (contentTitle.textContent === "Liked Songs") {
            updateView({ title: "Liked Songs", songs: likedData, view: "songs", activeMenu: menuLikedSongs });
        }
    }

    function updateLikeIcon() {
        if (!currentPlaylist[currentSongIndex]) return;
        const likedSongs = getFromStorage('likedSongs');
        if (!Array.isArray(likedSongs)) return;
        const isLiked = isSongInList(currentPlaylist[currentSongIndex].id, likedSongs);
        playerHeartIconWrapper.classList.toggle('active', isLiked);
        playerHeartIconWrapper.querySelector('.fa-heart.fas').style.display = isLiked ? 'inline-block' : 'none';
        playerHeartIconWrapper.querySelector('.fa-heart.far').style.display = isLiked ? 'none' : 'inline-block';
    }
    
    // --- RENDERING ---
    function renderCards(songArray) {
        // UPDATED: More aggressive column change for very small cards
        songCardContainer.className = 'row g-3 row-cols-3 row-cols-md-5 row-cols-lg-8 grid-view';
        if (songArray.length === 0) {
            songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">No songs found in this collection.</p>`;
            return;
        }
        songCardContainer.innerHTML = songArray.map((song, index) => `
            <div class="col" data-index="${index}" data-album-id="${song.albumId}" data-album-name="${song.albumName}">
                <div class="song-circle-item">
                    <div class="image-container">
                        <img src="${song.cover}" alt="${song.title} cover" crossorigin="anonymous">
                        <button class="play-button" aria-label="Play ${song.title}">
                            <i class="bi bi-play-circle-fill"></i>
                        </button>
                    </div>
                    <h5><a href="#">${song.title}</a></h5>
                    <p>${song.artist}</p>
                </div>
            </div>`).join('');
        updateNowPlayingIndicator();
    }

    function renderHomePageContent(languageSections) {
        songCardContainer.className = '';
        songCardContainer.innerHTML = Object.entries(languageSections).map(([language, data]) => {
            if (data.songs.length > 0) {
                const songCards = data.songs.map(song => `
                    <div class="col" data-identifier="${song.id}" data-playlist-key="${language}" data-album-id="${song.albumId}" data-album-name="${song.albumName}">
                        <div class="song-circle-item">
                            <div class="image-container">
                                <img src="${song.cover}" alt="${song.title} cover" crossorigin="anonymous">
                                <button class="play-button" aria-label="Play ${song.title}">
                                    <i class="bi bi-play-circle-fill"></i>
                                </button>
                            </div>
                            <h5><a href="#">${song.title}</a></h5>
                            <p>${song.artist}</p>
                        </div>
                    </div>`).join('');
                return `
                    <div class="language-section">
                        <h2 class="section-title">${data.title}</h2>
                        <div class="song-row-scrollable">${songCards}</div>
                    </div>`;
            }
            return '';
        }).join('');
        updateNowPlayingIndicator();
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

    // --- UI/VIEW MANAGEMENT ---
    function updateMainContentBackground(imageUrl, isDefault = false) {
        if (isDefault) {
            mainContent.style.setProperty('--default-bg-color', '#282828');
            return;
        }
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const dominantColor = colorThief.getColor(img);
            mainContent.style.setProperty('--default-bg-color', `rgb(${dominantColor.join(',')})`);
        };
        img.onerror = () => { // Fallback if image fails to load
            mainContent.style.setProperty('--default-bg-color', '#282828');
        };
    }
    
    async function updateView(state, addToHistory = false) {
        const footer = document.querySelector('.site-footer');
        document.querySelectorAll(".sidebar .nav-link.active").forEach(link => link.classList.remove("active"));
        topNavbar.classList.remove('search-active');

        contentSection.classList.add('loading'); // Start fade out animation

        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for fade out

        contentTitle.style.display = 'none';

        if (state.view === "home") {
            footer.style.display = 'block';
            renderHomePageContent(state.languageSections);
            updateMainContentBackground(null, true); // Reset to default background
        } else {
            contentTitle.style.display = 'block';
            contentTitle.textContent = state.title;
            footer.style.display = 'none';
            currentViewPlaylist = state.songs;
            renderCards(state.songs);
            // Set background based on the first song of the view
            if (state.songs.length > 0) {
                updateMainContentBackground(state.songs[0].cover);
            } else {
                updateMainContentBackground(null, true);
            }
        }
        
        contentSection.classList.remove('loading'); // Fade in new content
        
        if (state.activeMenu) state.activeMenu.classList.add("active");
        if (addToHistory) {
            if (historyIndex < navigationHistory.length - 1) { navigationHistory = navigationHistory.slice(0, historyIndex + 1); }
            navigationHistory.push(state);
            historyIndex++;
        }
        updateNavButtonsState();
    }

    function goBack() { if (historyIndex > 0) { historyIndex--; updateView(navigationHistory[historyIndex]); } }
    function goForward() { if (historyIndex < navigationHistory.length - 1) { historyIndex++; updateView(navigationHistory[historyIndex]); } }
    function updateNavButtonsState() { backBtn.disabled = historyIndex <= 0; forwardBtn.disabled = historyIndex >= navigationHistory.length - 1; backBtn.classList.toggle("disabled", backBtn.disabled); forwardBtn.classList.toggle("disabled", forwardBtn.disabled); }
    function showHomePage(addToHistory = false, initialData) { updateView({ title: "Home", view: "home", activeMenu: menuHome, languageSections: initialData }, addToHistory); }
    function showLikedSongs(addToHistory = false) { const likedSongs = getFromStorage('likedSongs'); updateView({ title: "Liked Songs", songs: Array.isArray(likedSongs) ? likedSongs : [], view: "songs", activeMenu: menuLikedSongs }, addToHistory); }
    async function showArtistSongs(artistId, artistName, addToHistory = false) { const artistSongs = await fetchSongsByArtist(artistId); updateView({ title: `${artistName}`, songs: artistSongs, view: "songs", activeMenu: null }, addToHistory); }
    async function showAlbumSongs(albumId, albumName, addToHistory = false) { const albumSongs = await fetchAlbumSongs(albumId); updateView({ title: albumName, songs: albumSongs, view: "songs" }, addToHistory); }

    // --- PLAYER CONTROLS & LOGIC ---
    function loadSong(index) {
        if (!currentPlaylist || index < 0 || index >= currentPlaylist.length) return;
        currentSongIndex = index;
        const song = currentPlaylist[index];
        nowPlayingImg.src = song.cover;
        nowPlayingTitle.innerHTML = `<a href="#">${song.title}</a>`;
        nowPlayingArtist.innerHTML = `<a href="#">${song.artist}</a>`;
        audioPlayer.src = song.audioSrc;
        updateMainContentBackground(song.cover); // Update BG when song changes
        updateLikeIcon();
        updateNowPlayingIndicator();
    }
    function playAudio() { if(!audioPlayer.src) return; audioPlayer.play().then(() => { isPlaying = true; updatePlayPauseIcon(); updateCardPlayPauseIcon(); }).catch(error => { console.error("Audio playback failed:", error); isPlaying = false; updatePlayPauseIcon(); updateCardPlayPauseIcon(); }); }
    function pauseAudio() { isPlaying = false; audioPlayer.pause(); updatePlayPauseIcon(); updateCardPlayPauseIcon(); }
    function togglePlay() { if (!audioPlayer.src && currentPlaylist?.length > 0) { loadSong(0); playAudio(); } else { isPlaying ? pauseAudio() : playAudio(); } }
    function prevSong() { if (!currentPlaylist?.length) return; const wasPlaying = isPlaying; const newIndex = (currentSongIndex - 1 + currentPlaylist.length) % currentPlaylist.length; loadSong(newIndex); if (wasPlaying) playAudio(); }
    function nextSong() { if (!currentPlaylist?.length) return; const wasPlaying = isPlaying; const newIndex = (currentSongIndex + 1) % currentPlaylist.length; loadSong(newIndex); if (wasPlaying) playAudio(); }
    function setProgress(e) { const width = e.currentTarget.clientWidth; const clickX = e.offsetX; if (audioPlayer.duration) { audioPlayer.currentTime = (clickX / width) * audioPlayer.duration; } }
    function setVolume(e) { const width = e.currentTarget.clientWidth; const clickX = e.offsetX; audioPlayer.volume = clickX / width; updateVolumeDisplay(); }
    function toggleMute() { if (audioPlayer.volume > 0) { lastVolume = audioPlayer.volume; audioPlayer.volume = 0; } else { audioPlayer.volume = lastVolume; } updateVolumeDisplay(); }

    // --- UI UPDATES ---
    function formatTime(seconds) { const min = Math.floor(seconds / 60); const sec = Math.floor(seconds % 60); return `${min}:${sec < 10 ? '0' : ''}${sec}`; }
    function updateProgress() { const { duration, currentTime } = audioPlayer; if (duration) { progress.style.width = `${(currentTime / duration) * 100}%`; currentTimeDisplay.textContent = formatTime(currentTime); if (!isNaN(duration)) { durationDisplay.textContent = formatTime(duration); } } }
    function updatePlayPauseIcon() { playIcon.style.display = isPlaying ? "none" : "block"; pauseIcon.style.display = isPlaying ? "block" : "none"; }
    function updateVolumeDisplay() { const vol = audioPlayer.volume; volumeProgress.style.width = `${vol * 100}%`; volumeUpIcon.style.display = vol > 0.5 ? "block" : "none"; volumeDownIcon.style.display = vol > 0 && vol <= 0.5 ? "block" : "none"; volumeMuteIcon.style.display = vol === 0 ? "block" : "none"; }
    function updateCardPlayPauseIcon() { document.querySelectorAll(".col.now-playing .play-button i").forEach(icon => { icon.className = isPlaying ? "bi bi-pause-circle-fill" : "bi bi-play-circle-fill"; }); }
    
    function updateNowPlayingIndicator() {
        document.querySelectorAll(".col.now-playing").forEach(card => card.classList.remove("now-playing"));
        if (currentPlaylist?.[currentSongIndex]) {
            const songId = currentPlaylist[currentSongIndex].id;
            let currentCard = document.querySelector(`.col[data-identifier="${songId}"]`);
            if (!currentCard) {
                const currentViewSongId = currentViewPlaylist[currentSongIndex]?.id;
                if (songId === currentViewSongId) {
                    currentCard = document.querySelector(`.col[data-index="${currentSongIndex}"]`);
                }
            }
            if (currentCard) {
                currentCard.classList.add("now-playing");
                updateCardPlayPauseIcon();
            }
        }
    }
    
    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        playPauseBtn.addEventListener("click", togglePlay);
        prevBtn.addEventListener("click", prevSong);
        nextBtn.addEventListener("click", nextSong);
        progressBar.addEventListener("click", setProgress);
        playerHeartIconWrapper.addEventListener("click", toggleLike);
        volumeIconBtn.addEventListener("click", toggleMute);
        document.querySelector(".volume-bar").addEventListener("click", setVolume);
        backBtn.addEventListener("click", goBack);
        forwardBtn.addEventListener("click", goForward);
        audioPlayer.addEventListener("timeupdate", updateProgress);
        audioPlayer.addEventListener("ended", nextSong);
        
        mainContent.addEventListener('scroll', () => {
            topNavbar.classList.toggle('scrolled', mainContent.scrollTop > 10);
        });

        menuHome.addEventListener('click', e => { e.preventDefault(); const homeState = navigationHistory.find(s => s.view === 'home'); if (homeState) { updateView(homeState, true); } else { init(); } });
        menuLikedSongs.addEventListener('click', e => { e.preventDefault(); showLikedSongs(true); });
        
        searchInput.addEventListener("keyup", (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.toLowerCase().trim();
            if (query) {
                searchTimeout = setTimeout(async () => {
                    songCardContainer.innerHTML = `<div class="loading-spinner"></div>`;
                    const { songs } = await fetchSongs(query);
                    updateView({ title: `Results for "${query}"`, songs: songs, view: "songs" }, true);
                }, 500);
            }
        });
        
        songCardContainer.addEventListener("click", e => {
            const songItem = e.target.closest(".col[data-album-id]");
            if (!songItem) return;

            const playButtonClicked = e.target.closest(".play-button");
            
            if (playButtonClicked) {
                let playlistToUse, songIdToFind;
                if (songItem.dataset.playlistKey) { // Clicked from Home page
                    const homeState = navigationHistory.find(s => s.view === 'home');
                    playlistToUse = homeState.languageSections[songItem.dataset.playlistKey].songs;
                    songIdToFind = songItem.dataset.identifier;
                } else { // Clicked from a list view (album, artist, etc.)
                    playlistToUse = currentViewPlaylist;
                    songIdToFind = playlistToUse[parseInt(songItem.dataset.index, 10)]?.id;
                }

                const indexToPlay = playlistToUse.findIndex(s => s.id === songIdToFind);
                if (indexToPlay >= 0) {
                    const isDifferentPlaylist = currentPlaylist[currentSongIndex]?.id !== playlistToUse[indexToPlay]?.id;
                    currentPlaylist = [...playlistToUse]; // Set the new playing queue
                    
                    if (!isDifferentPlaylist && indexToPlay === currentSongIndex && isPlaying) {
                        pauseAudio();
                    } else {
                        loadSong(indexToPlay);
                        playAudio();
                    }
                }
            } else { // Clicked on the card itself, not the play button
                const { albumId, albumName } = songItem.dataset;
                if (albumId && albumName !== 'null') { showAlbumSongs(albumId, albumName, true); }
            }
        });
        
        topArtistsContainer.addEventListener('click', e => { const artistItem = e.target.closest('.artist-circle-item'); if (artistItem) { const { artistId, artistName } = artistItem.dataset; showArtistSongs(artistId, artistName, true); } });
        mobileSearchBtn.addEventListener("click", () => { topNavbar.classList.add("search-active"); searchInput.focus(); });
        mobileSearchCloseBtn.addEventListener("click", () => { topNavbar.classList.remove("search-active"); });
        const sidebarElement = document.getElementById("sidebarMenu"); if (sidebarElement) { const offcanvas = new bootstrap.Offcanvas(sidebarElement); sidebarElement.addEventListener("click", e => { if (e.target.closest(".nav-link") || e.target.closest(".dropdown-item")) { offcanvas.hide(); } }); }
    }
    
    function extractAndDisplayTopArtists(songDataArrays) {
        const artistMap = new Map();
        songDataArrays.forEach(category => {
            if (category && category.rawData) {
                category.rawData.forEach(song => {
                    song.artists?.primary?.forEach(artist => {
                        if (!artistMap.has(artist.id) && artist.image) {
                            artistMap.set(artist.id, artist);
                        }
                    });
                });
            }
        });
        renderTopArtists(Array.from(artistMap.values()));
    }

    // --- INITIALIZATION ---
    async function init() {
        songCardContainer.innerHTML = `<div class="loading-spinner"></div>`;
        
        const songResults = await Promise.all([
            fetchSongs('telugu trending'), fetchSongs('english top 40'),
            fetchSongs('hindi latest'), fetchSongs('tamil trending'),
            fetchSongs('malayalam trending'),
        ]);

        const initialData = {
            telugu: { title: 'Trending in Telugu', songs: songResults[0].songs },
            english: { title: 'Global Top Hits', songs: songResults[1].songs },
            hindi: { title: 'Latest Hindi', songs: songResults[2].songs },
            tamil: { title: 'Hot in Tamil', songs: songResults[3].songs },
            malayalam: { title: 'Malayalam Chartbusters', songs: songResults[4].songs }
        };

        setupEventListeners();
        updateVolumeDisplay();
        showHomePage(true, initialData);
        extractAndDisplayTopArtists(songResults);
    }

    init();
});