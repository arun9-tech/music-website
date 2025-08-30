document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let currentPlaylist = [];
    let currentSongIndex = 0;
    let isPlaying = false;
    let lastVolume = 1;
    let navigationHistory = [];
    let historyIndex = -1;
    let searchTimeout;

    // --- DOM SELECTIONS ---
    const audioPlayer = new Audio();
    const contentTitle = document.getElementById("content-title");
    const songCardContainer = document.getElementById("song-card-container");
    const topArtistsContainer = document.getElementById("top-artists-container");
    const playPauseBtn = document.querySelector(".play-pause");
    const nowPlayingImg = document.querySelector(".now-playing img");
    const nowPlayingTitle = document.querySelector(".track-name");
    const nowPlayingArtist = document.querySelector(".track-artist");
    const menuDropdownToggle = document.getElementById("menu-dropdown-toggle");
    const menuAllSongsDropdown = document.getElementById("menu-all-songs-dropdown");
    const menuLikedSongsDropdown = document.getElementById("menu-liked-songs-dropdown");
    const searchInput = document.querySelector(".search-bar input");
    const backBtn = document.getElementById("back-btn");
    const forwardBtn = document.getElementById("forward-btn");
    const progressBar = document.querySelector(".player-controls .progress-bar");
    const progress = progressBar.querySelector(".progress");
    const currentTimeDisplay = document.querySelector(".time.current-time");
    const durationDisplay = document.querySelector(".time.duration");
    const prevBtn = document.querySelector(".player-controls button[aria-label='Previous Track']");
    const nextBtn = document.querySelector(".player-controls button[aria-label='Next Track']");
    const volumeIconBtn = document.getElementById("volume-icon-btn");
    const volumeBar = document.querySelector(".volume-bar");
    const volumeProgress = volumeBar.querySelector(".volume-progress");
    const playIcon = document.getElementById("play-icon");
    const pauseIcon = document.getElementById("pause-icon");
    const heartIconWrapper = document.getElementById("player-heart-icon-wrapper");
    const heartIconLiked = document.getElementById("heart-icon-liked");
    const heartIconUnliked = document.getElementById("heart-icon-unliked");
    const volumeUpIcon = document.getElementById("volume-up-icon");
    const volumeDownIcon = document.getElementById("volume-down-icon");
    const volumeMuteIcon = document.getElementById("volume-mute-icon");

    // --- API & DATA HANDLING ---

    async function fetchSongs(query) {
        const url = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network response was not ok`);
            const data = await response.json();
            // Return both mapped songs and the raw data for artist extraction
            return {
                songs: mapApiDataToSongs(data.data?.results || []),
                rawData: data.data?.results || []
            };
        } catch (error) {
            console.error("Error fetching songs:", error);
            return { songs: [], rawData: [] };
        }
    }
    
    async function fetchSongsByArtist(artistId) {
        const url = `https://saavn.dev/api/artists/${artistId}/songs?page=1&limit=50`;
         try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network response was not ok`);
            const data = await response.json();
            return mapApiDataToSongs(data.data?.songs || []);
        } catch (error) {
            console.error(`Error fetching songs for artist ${artistId}:`, error);
            return [];
        }
    }

    async function fetchAlbumSongs(albumId) {
        const url = `https://saavn.dev/api/albums?id=${albumId}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Network response was not ok`);
            const data = await response.json();
            return mapApiDataToSongs(data.data?.songs || []);
        } catch (error) {
            console.error(`Error fetching songs for album ${albumId}:`, error);
            return [];
        }
    }

    function mapApiDataToSongs(apiSongs) {
        const likedSongs = getLikedSongsFromStorage();
        return apiSongs.map(song => {
            let artistName = song.artists?.primary?.map(artist => artist.name).join(', ') || "Unknown Artist";
            let songTitle = song.name?.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'") || "Untitled Track";
            let coverUrl = song.image?.find(q => q.quality === '500x500')?.url || song.image?.slice(-1)[0]?.url;
            let audioUrl = song.downloadUrl?.find(q => q.quality === '320kbps')?.url || song.downloadUrl?.slice(-1)[0]?.url;
            let albumId = song.album?.id || null;
            let albumName = song.album?.name?.replace(/&quot;/g, '"') || null;
            
            if (coverUrl && audioUrl && albumId && albumName) {
                return { id: song.id, title: songTitle, artist: artistName, audioSrc: audioUrl, cover: coverUrl, liked: likedSongs.some(ls => ls.id === song.id), albumId, albumName };
            }
            return null;
        }).filter(song => song !== null);
    }
    
    // --- LIKED SONGS (localStorage) ---
    function getLikedSongsFromStorage() { return JSON.parse(localStorage.getItem('likedSongs')) || []; }
    function saveLikedSongsToStorage(likedSongs) { localStorage.setItem('likedSongs', JSON.stringify(likedSongs)); }
    function toggleLike() {
        if (!currentPlaylist || !currentPlaylist[currentSongIndex]) return;
        const currentSong = currentPlaylist[currentSongIndex];
        currentSong.liked = !currentSong.liked;
        updateHeartIcon();
        let likedSongs = getLikedSongsFromStorage();
        if (currentSong.liked) { if (!likedSongs.some(s => s.id === currentSong.id)) { likedSongs.push(currentSong); } } 
        else { likedSongs = likedSongs.filter(s => s.id !== currentSong.id); }
        saveLikedSongsToStorage(likedSongs);
        if (!currentSong.liked && contentTitle.textContent.includes("Liked Songs")) {
            renderCards(getLikedSongsFromStorage());
        }
    }

    // --- RENDERING ---
    function renderCards(songArray) {
        songCardContainer.innerHTML = "";
        songCardContainer.className = 'row g-3 row-cols-2 row-cols-md-3 row-cols-lg-6';
        if (songArray.length === 0) {
            songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">No songs found.</p>`;
            return;
        }
        songArray.forEach((song, index) => {
            const cardHTML = `
                <div class="col" data-index="${index}" data-album-id="${song.albumId}" data-album-name="${song.albumName}">
                    <div class="song-circle-item">
                        <img src="${song.cover}" alt="${song.title} cover">
                        <h5><a href="#">${song.title}</a></h5>
                        <p>${song.artist}</p>
                        <button class="play-button" aria-label="Play ${song.title}">
                            <i class="bi bi-play-circle-fill"></i>
                        </button>
                    </div>
                </div>`;
            songCardContainer.innerHTML += cardHTML;
        });
        updateNowPlayingIndicator();
    }

    function renderHomePageContent(languageSections) {
        songCardContainer.innerHTML = '';
        songCardContainer.className = '';
        Object.entries(languageSections).forEach(([language, data]) => {
            if (data.songs.length > 0) {
                const section = document.createElement('div');
                section.className = 'language-section';
                section.innerHTML = `<h2 class="section-title">${data.title}</h2>`;
                const scrollableRow = document.createElement('div');
                scrollableRow.className = 'song-row-scrollable';
                data.songs.forEach((song) => {
                    scrollableRow.innerHTML += `
                        <div class="col" data-identifier="${song.id}" data-playlist-key="${language}" data-album-id="${song.albumId}" data-album-name="${song.albumName}">
                            <div class="song-circle-item">
                                <img src="${song.cover}" alt="${song.title} cover">
                                <h5><a href="#">${song.title}</a></h5>
                                <p>${song.artist}</p>
                                <button class="play-button" aria-label="Play ${song.title}">
                                    <i class="bi bi-play-circle-fill"></i>
                                </button>
                            </div>
                        </div>`;
                });
                section.appendChild(scrollableRow);
                songCardContainer.appendChild(section);
            }
        });
        updateNowPlayingIndicator();
    }
    
    function renderTopArtists(artists) {
        topArtistsContainer.innerHTML = '';
        // UPDATED: Show 10 artists as requested
        artists.slice(0, 10).forEach(artist => {
            let imageUrl = artist.image?.find(q => q.quality === '500x500')?.url || artist.image?.slice(-1)[0]?.url;
            if (imageUrl) {
                const artistHTML = `
                    <div class="artist-circle-item" role="button" data-artist-id="${artist.id}" data-artist-name="${artist.name}">
                        <img src="${imageUrl}" alt="${artist.name}">
                        <span>${artist.name}</span>
                    </div>`;
                topArtistsContainer.innerHTML += artistHTML;
            }
        });
    }
    
    // --- UI/VIEW MANAGEMENT ---
    function updateView(state, addToHistory = false) {
        const footer = document.querySelector('.site-footer');
        document.querySelectorAll(".sidebar .nav-link.active").forEach(link => link.classList.remove("active"));

        if (state.view === "home") {
            contentTitle.style.display = 'none';
            footer.style.display = 'block';
            renderHomePageContent(state.languageSections);
        } else {
            contentTitle.style.display = 'block';
            contentTitle.textContent = state.title;
            footer.style.display = 'none';
            currentPlaylist = state.songs;
            renderCards(state.songs);
        }
        
        if (state.activeMenu) state.activeMenu.classList.add("active");

        if (addToHistory) {
            if (historyIndex < navigationHistory.length - 1) {
                navigationHistory = navigationHistory.slice(0, historyIndex + 1);
            }
            navigationHistory.push(state);
            historyIndex++;
        }
        updateNavButtonsState();
    }
    function goBack() { if (historyIndex > 0) { historyIndex--; updateView(navigationHistory[historyIndex]); } }
    function goForward() { if (historyIndex < navigationHistory.length - 1) { historyIndex++; updateView(navigationHistory[historyIndex]); } }
    function updateNavButtonsState() {
        backBtn.disabled = historyIndex <= 0;
        forwardBtn.disabled = historyIndex >= navigationHistory.length - 1;
        backBtn.classList.toggle("disabled", backBtn.disabled);
        forwardBtn.classList.toggle("disabled", forwardBtn.disabled);
    }
    function showHomePage(addToHistory = false, initialData) {
        updateView({ title: "Home", view: "home", activeMenu: menuDropdownToggle, languageSections: initialData }, addToHistory);
    }
    async function showAllSongsGrid(addToHistory = false) {
        songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">Loading all songs...</p>`;
        const { songs } = await fetchSongs("latest songs");
        updateView({ title: "All Songs", songs: songs, view: "songs", activeMenu: null }, addToHistory);
    }
    function showLikedSongs(addToHistory = false) {
        const likedSongs = getLikedSongsFromStorage();
        updateView({ title: "Liked Songs", songs: likedSongs, view: "songs", activeMenu: null }, addToHistory);
    }
    async function showArtistSongs(artistId, artistName, addToHistory = false) {
        songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">Loading songs by ${artistName}...</p>`;
        const artistSongs = await fetchSongsByArtist(artistId);
        updateView({ title: `Songs by ${artistName}`, songs: artistSongs, view: "songs", activeMenu: null }, addToHistory);
    }
    async function showAlbumSongs(albumId, albumName, addToHistory = false) {
        songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">Loading songs from ${albumName}...</p>`;
        const albumSongs = await fetchAlbumSongs(albumId);
        updateView({ title: albumName, songs: albumSongs, view: "songs", activeMenu: null }, addToHistory);
    }

    // --- PLAYER CONTROLS & LOGIC ---
    function loadSong(index) { if (!currentPlaylist || index < 0 || index >= currentPlaylist.length) return; currentSongIndex = index; const song = currentPlaylist[index]; nowPlayingImg.src = song.cover; nowPlayingTitle.innerHTML = `<a href="#">${song.title}</a>`; nowPlayingArtist.innerHTML = `<a href="#">${song.artist}</a>`; audioPlayer.src = song.audioSrc; updateHeartIcon(); updateNowPlayingIndicator(); }
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
    function updateHeartIcon() { if (!currentPlaylist?.[currentSongIndex]) return; const isLiked = currentPlaylist[currentSongIndex].liked; heartIconLiked.style.display = isLiked ? "block" : "none"; heartIconUnliked.style.display = isLiked ? "none" : "block"; heartIconWrapper.classList.toggle("liked", isLiked); }
    function updateVolumeDisplay() { const vol = audioPlayer.volume; volumeProgress.style.width = `${vol * 100}%`; volumeUpIcon.style.display = vol > 0.5 ? "block" : "none"; volumeDownIcon.style.display = vol > 0 && vol <= 0.5 ? "block" : "none"; volumeMuteIcon.style.display = vol === 0 ? "block" : "none"; }
    function updateCardPlayPauseIcon() { const currentCard = songCardContainer.querySelector(".now-playing"); if (currentCard) { const buttonIcon = currentCard.querySelector(".play-button i"); if (buttonIcon) { buttonIcon.className = isPlaying ? "bi bi-pause-circle-fill" : "bi bi-play-circle-fill"; } } }
    function updateNowPlayingIndicator() { document.querySelectorAll(".col[data-index], .col[data-identifier]").forEach(card => card.classList.remove("now-playing")); if (currentPlaylist?.[currentSongIndex]) { const songId = currentPlaylist[currentSongIndex].id; const currentCard = songCardContainer.querySelector(`[data-index="${currentSongIndex}"]`) || songCardContainer.querySelector(`[data-identifier="${songId}"]`); if (currentCard) { currentCard.classList.add("now-playing"); updateCardPlayPauseIcon(); } } }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        playPauseBtn.addEventListener("click", togglePlay);
        prevBtn.addEventListener("click", prevSong);
        nextBtn.addEventListener("click", nextSong);
        progressBar.addEventListener("click", setProgress);
        heartIconWrapper.addEventListener("click", toggleLike);
        volumeIconBtn.addEventListener("click", toggleMute);
        volumeBar.addEventListener("click", setVolume);
        backBtn.addEventListener("click", goBack);
        forwardBtn.addEventListener("click", goForward);
        audioPlayer.addEventListener("timeupdate", updateProgress);
        audioPlayer.addEventListener("volumechange", updateVolumeDisplay);
        audioPlayer.addEventListener("ended", nextSong);
        document.querySelector('.logo').addEventListener('click', e => { e.preventDefault(); const homeState = navigationHistory.find(s => s.view === 'home'); if (homeState) updateView(homeState, true); });
        menuAllSongsDropdown.addEventListener("click", e => { e.preventDefault(); showAllSongsGrid(true); });
        menuLikedSongsDropdown.addEventListener("click", e => { e.preventDefault(); showLikedSongs(true); });
        searchInput.addEventListener("keyup", e => { clearTimeout(searchTimeout); const query = e.target.value.toLowerCase().trim(); if (query) { searchTimeout = setTimeout(async () => { songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">Searching...</p>`; const { songs } = await fetchSongs(query); updateView({ title: `Results for "${query}"`, songs: songs, view: "songs" }, true); }, 500); } });
        
        songCardContainer.addEventListener("click", e => {
            const songItem = e.target.closest(".col[data-album-id]");
            if (!songItem) return;
            if (e.target.closest(".play-button")) {
                let playlistToUse;
                let songIdToFind;
                if (songItem.dataset.playlistKey) {
                    const homeState = navigationHistory.find(s => s.view === 'home');
                    playlistToUse = homeState.languageSections[songItem.dataset.playlistKey].songs;
                    songIdToFind = songItem.dataset.identifier;
                } else {
                    playlistToUse = currentPlaylist;
                    songIdToFind = playlistToUse[parseInt(songItem.dataset.index, 10)]?.id;
                }
                const indexToPlay = playlistToUse.findIndex(s => s.id === songIdToFind);
                if (indexToPlay >= 0) { currentPlaylist = playlistToUse; if (indexToPlay === currentSongIndex && isPlaying) { pauseAudio(); } else { loadSong(indexToPlay); playAudio(); } }
            } else {
                const { albumId, albumName } = songItem.dataset;
                if (albumId && albumName) {
                    showAlbumSongs(albumId, albumName, true);
                }
            }
        });
        
        topArtistsContainer.addEventListener('click', e => { const artistItem = e.target.closest('.artist-circle-item'); if (artistItem) { const { artistId, artistName } = artistItem.dataset; showArtistSongs(artistId, artistName, true); } });
        const sidebarElement = document.getElementById("sidebarMenu"); if (sidebarElement) { const offcanvas = new bootstrap.Offcanvas(sidebarElement); sidebarElement.addEventListener("click", e => { if (e.target.closest(".nav-link") || e.target.closest(".dropdown-item")) { offcanvas.hide(); } }); }
    }
    
    // --- THIS IS THE RESTORED, STABLE LOGIC FOR ARTISTS ---
    function extractAndDisplayTopArtists(songDataArrays) {
        const artistMap = new Map();
        songDataArrays.forEach(category => {
            if (category && category.rawData) {
                category.rawData.forEach(song => {
                    if (song.artists && Array.isArray(song.artists.primary)) {
                        song.artists.primary.forEach(artist => {
                            if (!artistMap.has(artist.id) && artist.image) {
                                artistMap.set(artist.id, artist);
                            }
                        });
                    }
                });
            }
        });
        renderTopArtists(Array.from(artistMap.values()));
    }

    // --- INITIALIZATION ---
    async function init() {
        songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">Loading your music...</p>`;
        
        const songResults = await Promise.all([
            fetchSongs('telugu trending'),
            fetchSongs('english top 40'),
            fetchSongs('hindi latest'),
            fetchSongs('tamil trending'),
            fetchSongs('malayalam trending'),
        ]);

        const initialData = {
            telugu: { title: 'Telugu Songs', songs: songResults[0].songs },
            english: { title: 'English Songs', songs: songResults[1].songs },
            hindi: { title: 'Hindi Songs', songs: songResults[2].songs },
            tamil: { title: 'Tamil Songs', songs: songResults[3].songs },
            malayalam: { title: 'Malayalam Songs', songs: songResults[4].songs }
        };

        setupEventListeners();
        updateVolumeDisplay();
        showHomePage(true, initialData);
        
        // Use the restored, reliable function to get and display artists
        extractAndDisplayTopArtists(songResults);

        const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
        dropdownElementList.map(function (dropdownToggleEl) { return new bootstrap.Dropdown(dropdownToggleEl); });
    }

    init();
});