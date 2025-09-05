document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let currentPlaylist = []; let shuffledPlaylist = []; let bannerPlaylist = []; let currentViewPlaylist = [];
    let currentSongIndex = 0; let isPlaying = false; let isShuffled = false; let repeatMode = 'none';
    let lastVolume = 1; let searchTimeout; let initialSong = null;
    const colorThief = new ColorThief();

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
    const bannerContainer = document.getElementById("song-banner-carousel-container");
    const bannerIndicators = document.getElementById("banner-indicators");
    const bannerInner = document.getElementById("banner-inner");
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
    const menuHome = document.getElementById('menu-home');
    const menuSearch = document.getElementById('menu-search');
    const menuLibrary = document.getElementById('menu-library');
    const menuLikedSongs = document.getElementById('menu-liked-songs');
    const userPlaylistsNav = document.getElementById('user-playlists-nav');
    const miniPlayer = document.querySelector('.mini-player');
    const miniPlayerProgress = document.querySelector('.mini-player-progress');
    const miniPlayerPlayPauseBtn = document.querySelector('.mini-player .play-pause');
    const mobileNavHome = document.getElementById('mobile-nav-home');
    const mobileNavSearch = document.getElementById('mobile-nav-search');
    const mobileNavLibrary = document.getElementById('mobile-nav-library');
    const mobileSearchCloseBtn = document.getElementById("mobile-search-close-btn");
    const mobileCreatePlaylistBtn = document.getElementById('mobile-create-playlist-btn');
    const toastContainer = document.getElementById('toast-container');

    // --- UTILITY & API FUNCTIONS ---
    const getFromStorage = (key) => JSON.parse(localStorage.getItem(key)) || {};
    const saveToStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    async function fetchSongs(query) { try { const response = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=40`); if (!response.ok) throw new Error(`Network error`); const data = await response.json(); return { songs: mapApiDataToSongs(data.data?.results || []), rawData: data.data?.results || [] }; } catch (error) { console.error("Error fetching songs:", error); return { songs: [], rawData: [] }; } }
    async function fetchArtistByName(name) { try { const response = await fetch(`https://saavn.dev/api/search/artists?query=${encodeURIComponent(name)}`); if (!response.ok) return null; const data = await response.json(); return data.data?.results[0] || null; } catch (error) { console.error(`Error fetching artist ${name}:`, error); return null; } }
    async function fetchSongsByArtist(artistId) { try { const response = await fetch(`https://saavn.dev/api/artists/${artistId}/songs?page=1&limit=50`); if (!response.ok) throw new Error(`Network error`); const data = await response.json(); return mapApiDataToSongs(data.data?.songs || []); } catch (error) { console.error(`Error fetching songs for artist ${artistId}:`, error); return []; } }
    async function fetchAlbumSongs(albumId) { try { const response = await fetch(`https://saavn.dev/api/albums?id=${albumId}`); if (!response.ok) throw new Error(`Network error`); const data = await response.json(); return mapApiDataToSongs(data.data?.songs || []); } catch (error) { console.error(`Error fetching songs for album ${albumId}:`, error); return []; } }
    function mapApiDataToSongs(apiSongs) { const likedSongs = getFromStorage('likedSongs') || []; return apiSongs.map(song => { let artistName = song.artists?.primary?.map(artist => artist.name).join(', ') || "Unknown Artist"; let songTitle = song.name?.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#039;/g, "'") || "Untitled Track"; let coverUrl = song.image?.find(q => q.quality === '500x500')?.url || song.image?.slice(-1)[0]?.url; let audioUrl = song.downloadUrl?.find(q => q.quality === '320kbps')?.url || song.downloadUrl?.slice(-1)[0]?.url; let albumId = song.album?.id || null; let albumName = song.album?.name?.replace(/&quot;/g, '"') || "Single"; if (coverUrl && audioUrl) { return { id: song.id, title: songTitle, artist: artistName, audioSrc: audioUrl, cover: coverUrl, liked: Array.isArray(likedSongs) && likedSongs.some(ls => ls.id === song.id), albumId, albumName }; } return null; }).filter(song => song !== null); }

    // --- LIKED SONGS & PLAYLIST MANAGEMENT ---
    function toggleLike() { const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (!activePlaylist[currentSongIndex]) return; playerHeartIconWrapper.classList.add('pop'); setTimeout(() => playerHeartIconWrapper.classList.remove('pop'), 300); const song = activePlaylist[currentSongIndex]; let likedData = getFromStorage('likedSongs'); if (!Array.isArray(likedData)) likedData = []; if (likedData.some(s => s.id === song.id)) { likedData = likedData.filter(s => s.id !== song.id); } else { likedData.push(song); } saveToStorage('likedSongs', likedData); updateLikeIcon(); if (contentTitle.textContent === "Liked Songs") { updateView({ title: "Liked Songs", songs: likedData, view: "playlist", activeMenu: menuLikedSongs }); } }
    function updateLikeIcon() { const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (!activePlaylist[currentSongIndex]) return; const likedSongs = getFromStorage('likedSongs') || []; const isLiked = likedSongs.some(s => s.id === activePlaylist[currentSongIndex].id); playerHeartIconWrapper.classList.toggle('active', isLiked); playerHeartIconWrapper.querySelector('.fa-heart.fas').style.display = isLiked ? 'inline-block' : 'none'; playerHeartIconWrapper.querySelector('.fa-heart.far').style.display = isLiked ? 'none' : 'inline-block'; }
    function createPlaylist() {
        createPlaylistForm.reset();
        createPlaylistModal.show();
        setTimeout(() => playlistNameInput.focus(), 500);
    }
    function deletePlaylist(playlistName) { if (confirm(`Are you sure you want to delete the playlist "${playlistName}"?`)) { const playlists = getFromStorage('userPlaylists'); if (playlists && playlists[playlistName]) { delete playlists[playlistName]; saveToStorage('userPlaylists', playlists); renderUserPlaylists(); showToast(`Playlist "${playlistName}" deleted.`); if (contentTitle.textContent === "Your Library") { showLibraryIndex(); } else if (contentTitle.textContent === playlistName) { init(true); } } } }
    function addSongToPlaylist(playlistName) { if (!songToAdd) return; const playlists = getFromStorage('userPlaylists'); if (playlists[playlistName]) { const isAlreadyInPlaylist = playlists[playlistName].some(s => s.id === songToAdd.id); if (isAlreadyInPlaylist) { showToast(`"${songToAdd.title}" is already in "${playlistName}".`, 'info'); } else { playlists[playlistName].push(songToAdd); saveToStorage('userPlaylists', playlists); showToast(`Added "${songToAdd.title}" to "${playlistName}".`); } } addToPlaylistModal.hide(); songToAdd = null; }
    function renderUserPlaylists() { const playlists = getFromStorage('userPlaylists') || {}; userPlaylistsNav.innerHTML = Object.keys(playlists).map(name => `<li><a class="nav-link" href="#" data-playlist-name="${name}">${name}</a><button class="delete-playlist-btn" data-playlist-name="${name}" title="Delete playlist"><i class="fas fa-trash-alt"></i></button></li>`).join(''); }

    // --- RENDERING & UI UPDATES ---
    function renderCards(songArray) { songCardContainer.className = 'row g-2 g-md-2 row-cols-2 row-cols-sm-3 row-cols-md-5 row-cols-lg-8 row-cols-xl-10 grid-view'; songCardContainer.innerHTML = songArray.map((song, index) => `<div class="col" data-index="${index}" data-song-id="${song.id}" data-album-id="${song.albumId}" data-album-name="${song.albumName}"><div class="song-circle-item"><div class="image-container"><img src="${song.cover}" alt="${song.title} cover" crossorigin="anonymous"><button class="play-button" aria-label="Play ${song.title}"><i class="bi bi-play-circle-fill"></i></button></div><h5><a href="#">${song.title}</a></h5><p>${song.artist}</p></div></div>`).join(''); updateNowPlayingIndicator(); }
    function renderSongList(songArray) { songCardContainer.className = 'song-list-container'; const header = `<div class="song-list-header"><div>#</div><div class="title-header">Title</div><div class="album-header">Album</div><div></div></div>`; const listItems = songArray.map((song, index) => `<div class="song-list-item" data-index="${index}" data-song-id="${song.id}"><div class="index-container"><span class="index">${index + 1}</span><i class="bi bi-play-fill play-icon"></i></div><div class="title-artist"><img src="${song.cover}" alt="${song.title}" class="cover-art"><div class="details"><div class="title"><a href="#">${song.title}</a></div><div class="artist">${song.artist}</div></div></div><div class="album">${song.albumName}</div><i class="bi bi-plus-lg add-to-playlist-icon" title="Add to playlist" data-song-id="${song.id}"></i></div>`).join(''); songCardContainer.innerHTML = songArray.length > 0 ? header + listItems : `<p class="text-center text-muted fs-5 mt-4">No songs found.</p>`; updateNowPlayingIndicator(); }
    
    // === NEW RENDERING FUNCTION for Mobile Library ===
    function renderLibraryIndex() {
        const playlists = getFromStorage('userPlaylists') || {};
        const likedSongsItem = `
            <div class="library-index-item" data-action="show-liked">
                <div class="icon icon-liked"><i class="fas fa-heart"></i></div>
                <div class="title">Liked Songs</div>
                <div class="chevron"><i class="fas fa-chevron-right"></i></div>
            </div>`;
        const userPlaylists = Object.keys(playlists).map(name => `
            <div class="library-index-item" data-playlist-name="${name}">
                <div class="icon icon-playlist"><i class="fas fa-music"></i></div>
                <div class="title">${name}</div>
                <div class="chevron"><i class="fas fa-chevron-right"></i></div>
            </div>`).join('');
        
        songCardContainer.className = 'library-index-container';
        songCardContainer.innerHTML = likedSongsItem + userPlaylists;
    }

    function renderHomePageContent(languageSections) { songCardContainer.className = ''; songCardContainer.innerHTML = Object.entries(languageSections).map(([language, data]) => { if (data.songs.length > 0) { const songCards = data.songs.map(song => `<div class="col" data-identifier="${song.id}" data-song-id="${song.id}" data-playlist-key="${language}" data-album-id="${song.albumId}" data-album-name="${song.albumName}"><div class="song-circle-item"><div class="image-container"><img src="${song.cover}" alt="${song.title} cover" crossorigin="anonymous"><button class="play-button" aria-label="Play ${song.title}"><i class="bi bi-play-circle-fill"></i></button></div><h5><a href="#">${song.title}</a></h5><p>${song.artist}</p></div></div>`).join(''); return `<div class="language-section"><h2 class="section-title">${data.title}</h2><div class="song-row-scrollable">${songCards}</div></div>`; } return ''; }).join(''); updateNowPlayingIndicator(); }
    function showToast(message, type = 'success') { const toast = document.createElement('div'); toast.className = `toast-message toast-${type}`; toast.textContent = message; toastContainer.appendChild(toast); setTimeout(() => { toast.remove(); }, 3000); }
    function renderBanner(songs) { if (!songs || songs.length === 0) { bannerContainer.style.display = 'none'; return; } bannerPlaylist = songs; bannerContainer.style.display = 'block'; let indicatorsHTML = ''; let innerHTML = ''; songs.forEach((song, index) => { const isActive = index === 0 ? 'active' : ''; indicatorsHTML += `<button type="button" data-bs-target="#song-banner-carousel" data-bs-slide-to="${index}" class="${isActive}" aria-current="${isActive ? 'true' : 'false'}" aria-label="Slide ${index + 1}"></button>`; innerHTML += `<div class="carousel-item ${isActive}" data-index="${index}"><img src="${song.cover}" class="d-block w-100" alt="${song.title}"><div class="banner-content"><h3>${song.title}</h3><p>${song.artist}</p><div class="banner-buttons"><button class="banner-btn play banner-play-btn"><i class="fas fa-play"></i>Play</button><button class="banner-btn follow banner-follow-btn">Follow</button></div></div></div>`; }); bannerIndicators.innerHTML = indicatorsHTML; bannerInner.innerHTML = innerHTML; }
    function renderTopArtists(artists) { topArtistsContainer.innerHTML = artists.slice(0, 10).map(artist => { let imageUrl = artist.image?.find(q => q.quality === '500x500')?.url || artist.image?.slice(-1)[0]?.url; if (imageUrl) { return `<div class="artist-circle-item" role="button" data-artist-id="${artist.id}" data-artist-name="${artist.name}"><img src="${imageUrl}" alt="${artist.name}"><span>${artist.name}</span></div>`; } return ''; }).join(''); }
    function updateHeaderBackground(imageUrl, isDefault = false) { if (isDefault || !imageUrl) { topNavbar.style.setProperty('--navbar-bg-color', 'transparent'); return; } const img = new Image(); img.crossOrigin = "Anonymous"; img.src = imageUrl; img.onload = () => { const dominantColor = colorThief.getColor(img); topNavbar.style.setProperty('--navbar-bg-color', `rgb(${dominantColor.join(',')})`); }; img.onerror = () => { topNavbar.style.setProperty('--navbar-bg-color', 'transparent'); }; }

    // --- NAVIGATION & VIEW MANAGEMENT ---
    async function updateView(state) {
        document.querySelectorAll(".sidebar .nav-link.active, .mobile-nav-bar .nav-item.active").forEach(link => link.classList.remove("active"));
        topNavbar.classList.remove('search-active');
        contentSection.classList.add('loading');
        
        if (state.view === 'playlist' || state.view === 'libraryIndex') {
            mainContent.classList.add('library-view');
        } else {
            mainContent.classList.remove('library-view');
        }

        mainContent.classList.remove('home-view');
        if (state.view !== 'home') bannerContainer.style.display = 'none';
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        contentTitle.style.animation = 'none';
        const footer = document.querySelector('.site-footer');
        currentViewPlaylist = state.songs || [];
        
        contentTitle.textContent = state.title; // Set title for all views now
        if (state.view === "home") {
            mainContent.classList.add('home-view');
            footer.style.display = 'block';
            renderHomePageContent(state.languageSections);
            renderBanner(bannerPlaylist);
            updateHeaderBackground(null, true);
        } else if (state.view === "libraryIndex") { // New Case for Library view
            footer.style.display = 'none';
            renderLibraryIndex();
            updateHeaderBackground(null, true);
        } else { // All other list views (search, playlist, liked, etc.)
            footer.style.display = 'none';
            renderSongList(state.songs);
            if (state.songs && state.songs.length > 0) {
                updateHeaderBackground(state.songs[0].cover);
            } else {
                updateHeaderBackground(null, true);
            }
        }
        
        void contentTitle.offsetWidth;
        contentTitle.style.animation = 'fadeInUp 0.5s ease-out both';
        contentSection.classList.remove('loading');
        
        if (state.activeMenu) {
            state.activeMenu.classList.add("active");
            const mobileEquivalentId = state.activeMenu.id.replace('menu-', 'mobile-nav-');
            const mobileEquivalent = document.getElementById(mobileEquivalentId);
            if (mobileEquivalent) mobileEquivalent.classList.add('active');
        }
    }
    function showHomePage(initialData) { updateView({ title: "Home", view: "home", activeMenu: menuHome, languageSections: initialData }); }
    // === NEW FUNCTION to show the library index ===
    function showLibraryIndex() {
        updateView({ title: "Your Library", view: "libraryIndex", activeMenu: menuLibrary });
    }
    function showLikedSongs() { const likedSongs = getFromStorage('likedSongs') || []; updateView({ title: "Liked Songs", songs: likedSongs, view: "playlist", activeMenu: menuLikedSongs }); }
    function showUserPlaylist(playlistName) { const playlists = getFromStorage('userPlaylists') || {}; const songs = playlists[playlistName] || []; updateView({ title: playlistName, songs, view: "playlist", activeMenu: menuLibrary }); }
    async function showArtistSongs(artistId, artistName) { const artistSongs = await fetchSongsByArtist(artistId); updateView({ title: artistName, songs: artistSongs, view: "playlist", activeMenu: menuLibrary }); }
    async function showAlbumSongs(albumId, albumName) { const albumSongs = await fetchAlbumSongs(albumId); updateView({ title: albumName, songs: albumSongs, view: "playlist", activeMenu: menuLibrary }); }
    function showSearchView(query = "") { if (query) { searchInput.value = query; searchInput.dispatchEvent(new KeyboardEvent('keyup', {'key': 'Enter'})); } else { updateView({ title: `Search`, songs: [], view: "search", activeMenu: menuSearch }); } }

    // --- PLAYER CORE & CONTROLS ---
    // ... (This entire section remains unchanged) ...
    function setDefaultPlayerState(song) { initialSong = song; playerBar.classList.add('song-loaded'); nowPlayingImg.src = song.cover; nowPlayingTitle.innerHTML = `<a href="#">${song.title}</a>`; nowPlayingArtist.innerHTML = `<a href="#">${song.artist}</a>`; miniPlayer.classList.add('visible', 'song-loaded'); document.querySelector('.mini-player .track-cover-art img').src = song.cover; document.querySelector('.mini-player .track-name').innerHTML = `<a>${song.title}</a>`; document.querySelector('.mini-player .track-artist').innerHTML = `<a>${song.artist}</a>`; const miniPlayerImgEl = new Image(); miniPlayerImgEl.crossOrigin = "Anonymous"; miniPlayerImgEl.src = song.cover; miniPlayerImgEl.onload = () => { const dominantColor = colorThief.getColor(miniPlayerImgEl); miniPlayer.style.backgroundColor = `rgb(${dominantColor.join(',')})`; }; }
    function loadSong(index) { const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (!activePlaylist || index < 0 || index >= activePlaylist.length) return; currentSongIndex = index; const song = activePlaylist[index]; setDefaultPlayerState(song); initialSong = null; audioPlayer.src = song.audioSrc; updateLikeIcon(); updateNowPlayingIndicator(); }
    function playAudio() { if(!audioPlayer.src) return; audioPlayer.play().then(() => { isPlaying = true; updatePlayPauseIcon(); updateCardPlayPauseIcon(); }).catch(error => { console.error("Audio playback failed:", error); isPlaying = false; updatePlayPauseIcon(); }); }
    function pauseAudio() { isPlaying = false; audioPlayer.pause(); updatePlayPauseIcon(); updateCardPlayPauseIcon(); }
    function togglePlay() { if (!isPlaying && !audioPlayer.src && initialSong) { currentPlaylist = [initialSong]; loadSong(0); playAudio(); return; } if (!audioPlayer.src && currentPlaylist?.length > 0) { loadSong(0); playAudio(); } else { isPlaying ? pauseAudio() : playAudio(); } }
    function prevSong() { const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (!activePlaylist?.length) return; const wasPlaying = isPlaying; const newIndex = (currentSongIndex - 1 + activePlaylist.length) % activePlaylist.length; loadSong(newIndex); if (wasPlaying) playAudio(); }
    function nextSong() { const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (!activePlaylist?.length) return; const wasPlaying = isPlaying; let newIndex = currentSongIndex + 1; if (newIndex >= activePlaylist.length) { if (repeatMode === 'all' || isShuffled) { newIndex = 0; } else { pauseAudio(); loadSong(0); audioPlayer.currentTime = 0; updateProgress(); return; } } loadSong(newIndex); if (wasPlaying) playAudio(); }
    function handleSongEnd() { if (repeatMode === 'one') { audioPlayer.currentTime = 0; playAudio(); } else { nextSong(); } }
    function toggleShuffle() { isShuffled = !isShuffled; updateShuffleIcon(); shuffleBtn.classList.add('pop'); setTimeout(() => shuffleBtn.classList.remove('pop'), 300); if (isShuffled && currentPlaylist.length > 0) { const currentSong = currentPlaylist[currentSongIndex]; shuffledPlaylist = [...currentPlaylist].sort(() => Math.random() - 0.5); const playingIndex = shuffledPlaylist.findIndex(song => song.id === currentSong.id); if (playingIndex > -1) { const [item] = shuffledPlaylist.splice(playingIndex, 1); shuffledPlaylist.unshift(item); } currentSongIndex = 0; } }
    function toggleRepeat() { repeatBtn.classList.add('pop'); setTimeout(() => repeatBtn.classList.remove('pop'), 300); if (repeatMode === 'none') repeatMode = 'all'; else if (repeatMode === 'all') repeatMode = 'one'; else repeatMode = 'none'; updateRepeatIcon(); }
    function setProgress(e) { const width = e.currentTarget.clientWidth; const clickX = e.offsetX; if (audioPlayer.duration) audioPlayer.currentTime = (clickX / width) * audioPlayer.duration; }
    function setVolume(e) { const width = e.currentTarget.clientWidth; const clickX = e.offsetX; audioPlayer.volume = clickX / width; updateVolumeDisplay(); }
    function toggleMute() { if (audioPlayer.volume > 0) { lastVolume = audioPlayer.volume; audioPlayer.volume = 0; } else { audioPlayer.volume = lastVolume; } updateVolumeDisplay(); }
    function formatTime(seconds) { const min = Math.floor(seconds / 60); const sec = Math.floor(seconds % 60); return `${min}:${sec < 10 ? '0' : ''}${sec}`; }
    function updateProgress() { const { duration, currentTime } = audioPlayer; if (duration) { const progressPercent = `${(currentTime / duration) * 100}%`; progress.style.width = progressPercent; currentTimeDisplay.textContent = formatTime(currentTime); durationDisplay.textContent = isNaN(duration) ? '0:00' : formatTime(duration); miniPlayerProgress.style.width = progressPercent; } }
    function updatePlayPauseIcon() { const isPlayingState = isPlaying ? "none" : "inline-block"; const isPausedState = isPlaying ? "inline-block" : "none"; playIcon.style.display = isPlayingState; pauseIcon.style.display = isPausedState; const miniPlay = miniPlayerPlayPauseBtn.querySelector('.bi-play-circle-fill'); const miniPause = miniPlayerPlayPauseBtn.querySelector('.bi-pause-circle-fill'); if(miniPlay) miniPlay.style.display = isPlayingState; if(miniPause) miniPause.style.display = isPausedState; }
    function updateVolumeDisplay() { const vol = audioPlayer.volume; volumeProgress.style.width = `${vol * 100}%`; volumeUpIcon.style.display = vol > 0.5 ? "block" : "none"; volumeDownIcon.style.display = vol > 0 && vol <= 0.5 ? "block" : "none"; volumeMuteIcon.style.display = vol === 0 ? "block" : "none"; }
    function updateCardPlayPauseIcon() { document.querySelectorAll(".now-playing .play-button i, .now-playing .play-icon").forEach(icon => { icon.className = isPlaying ? "bi bi-pause-fill play-icon" : "bi bi-play-fill play-icon"; }); }
    function updateShuffleIcon() { shuffleBtn.classList.toggle('active', isShuffled); }
    function updateRepeatIcon() { const icon = repeatBtn.querySelector('i'); repeatBtn.classList.remove('active', 'repeat-one'); if (repeatMode === 'all') { icon.className = 'bi bi-repeat'; repeatBtn.classList.add('active'); } else if (repeatMode === 'one') { icon.className = 'bi bi-repeat-1'; repeatBtn.classList.add('active', 'repeat-one'); } else { icon.className = 'bi bi-repeat'; } }
    function updateNowPlayingIndicator() { document.querySelectorAll(".now-playing").forEach(item => item.classList.remove("now-playing")); const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist; if (activePlaylist?.[currentSongIndex]) { const songId = activePlaylist[currentSongIndex].id; const currentItem = document.querySelector(`.song-list-item[data-song-id="${songId}"], .col[data-song-id="${songId}"]`); if (currentItem) { currentItem.classList.add("now-playing"); updateCardPlayPauseIcon(); } } }
    
    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        document.querySelectorAll(".play-pause").forEach(btn => btn.addEventListener("click", togglePlay));
        prevBtn.addEventListener("click", prevSong);
        nextBtn.addEventListener("click", nextSong);
        shuffleBtn.addEventListener("click", toggleShuffle);
        repeatBtn.addEventListener("click", toggleRepeat);
        progressBar.addEventListener("click", setProgress);
        playerHeartIconWrapper.addEventListener("click", toggleLike);
        volumeIconBtn.addEventListener("click", toggleMute);
        volumeBar.addEventListener("click", setVolume);
        audioPlayer.addEventListener("timeupdate", updateProgress);
        audioPlayer.addEventListener("ended", handleSongEnd);
        
        document.getElementById('navbar-logo').addEventListener('click', e => { e.preventDefault(); init(true); });
        menuHome.addEventListener('click', e => { e.preventDefault(); init(true); });
        menuSearch.addEventListener('click', e => { e.preventDefault(); showSearchView(); searchInput.focus(); });
        
        menuLibrary.addEventListener('click', e => { 
            if (e.target.closest('.create-playlist-icon')) {
                e.preventDefault(); 
                e.stopPropagation(); 
                createPlaylist(); 
            } else { 
                e.preventDefault(); 
                showLikedSongs(); 
            } 
        });
        
        menuLikedSongs.addEventListener('click', e => { e.preventDefault(); showLikedSongs(); });
        
        userPlaylistsNav.addEventListener('click', e => {
            const playlistLink = e.target.closest('a[data-playlist-name]');
            const deleteBtn = e.target.closest('.delete-playlist-btn');
            if (deleteBtn) { e.preventDefault(); deletePlaylist(deleteBtn.dataset.playlistName); } 
            else if (playlistLink) { e.preventDefault(); showUserPlaylist(playlistLink.dataset.playlistName); }
        });

        searchInput.addEventListener("keyup", e => { clearTimeout(searchTimeout); const query = e.target.value.trim(); if (query) { searchTimeout = setTimeout(async () => { songCardContainer.innerHTML = `<div class="loading-spinner"></div>`; const { songs } = await fetchSongs(query); updateView({ title: `Results for "${query}"`, songs, view: "search", activeMenu: menuSearch }); }, 500); } });
        
        mobileNavHome.addEventListener('click', e => { e.preventDefault(); init(true); });
        mobileNavSearch.addEventListener('click', e => { e.preventDefault(); topNavbar.classList.add("search-active"); showSearchView(); searchInput.focus(); });
        // === UPDATED Mobile Library Button Action ===
        mobileNavLibrary.addEventListener('click', e => { e.preventDefault(); showLibraryIndex(); });
        mobileSearchCloseBtn.addEventListener("click", () => topNavbar.classList.remove("search-active"));
        mainContent.addEventListener('scroll', () => topNavbar.classList.toggle('scrolled', mainContent.scrollTop > 10));
        
        mobileCreatePlaylistBtn.addEventListener('click', createPlaylist);

        songCardContainer.addEventListener("click", e => {
            // === NEW LISTENER LOGIC for Library Index Page ===
            const libraryItem = e.target.closest(".library-index-item");
            if (libraryItem) {
                if (libraryItem.dataset.action === 'show-liked') {
                    showLikedSongs();
                } else if (libraryItem.dataset.playlistName) {
                    showUserPlaylist(libraryItem.dataset.playlistName);
                }
                return;
            }

            const songItem = e.target.closest(".col, .song-list-item");
            const addToPlaylistBtn = e.target.closest(".add-to-playlist-icon");

            if (addToPlaylistBtn) {
                e.stopPropagation();
                const songId = addToPlaylistBtn.dataset.songId;
                const foundSong = currentViewPlaylist.find(s => s.id === songId);
                if (foundSong) {
                    songToAdd = foundSong;
                    const modalBody = document.getElementById('playlist-modal-body');
                    const playlists = getFromStorage('userPlaylists') || {};
                    if (Object.keys(playlists).length > 0) {
                        modalBody.innerHTML = `<ul class="list-group list-group-flush">${Object.keys(playlists).map(name => `<li class="list-group-item" data-playlist-name="${name}">${name}</li>`).join('')}</ul>`;
                    } else {
                        modalBody.innerHTML = '<p class="text-center text-muted">You have no playlists. Create one from "Your Library".</p>';
                    }
                    addToPlaylistModal.show();
                }
                return;
            }

            if (!songItem) return;
            const playButtonClicked = e.target.closest(".play-button") || e.target.closest(".index-container");
            
            if (playButtonClicked || (e.target.closest('.title-artist') && songItem.classList.contains('song-list-item'))) {
                let playlistToUse, songIdToFind;
                if (songItem.dataset.playlistKey) {
                    playlistToUse = window.homePageData[songItem.dataset.playlistKey].songs;
                    songIdToFind = songItem.dataset.identifier;
                } else {
                    playlistToUse = currentViewPlaylist;
                    songIdToFind = playlistToUse[parseInt(songItem.dataset.index, 10)]?.id;
                }
                if (!songIdToFind) return;
                const indexToPlay = playlistToUse.findIndex(s => s.id === songIdToFind);

                if (indexToPlay >= 0) {
                    const isNewPlaylist = JSON.stringify(currentPlaylist) !== JSON.stringify(playlistToUse);
                    if (isNewPlaylist) {
                        currentPlaylist = [...playlistToUse];
                        if (isShuffled) { isShuffled = false; toggleShuffle(); } 
                    }
                    const activePlaylist = isShuffled ? shuffledPlaylist : currentPlaylist;
                    const indexInActivePlaylist = activePlaylist.findIndex(s => s.id === songIdToFind);
                    if (indexInActivePlaylist === currentSongIndex && isPlaying && !isNewPlaylist) {
                        pauseAudio();
                    } else {
                        loadSong(indexInActivePlaylist);
                        playAudio();
                    }
                }
            } else if (songItem.dataset.albumId && songItem.dataset.albumName !== 'null') {
                showAlbumSongs(songItem.dataset.albumId, songItem.dataset.albumName);
            }
        });
        
        createPlaylistForm.addEventListener('submit', (e) => {
            e.preventDefault(); 
            const playlistName = playlistNameInput.value.trim();

            if (playlistName) {
                const playlists = getFromStorage('userPlaylists') || {};
                if (playlists[playlistName]) {
                    showToast(`Playlist "${playlistName}" already exists.`, 'error');
                } else {
                    playlists[playlistName] = [];
                    saveToStorage('userPlaylists', playlists);
                    renderUserPlaylists();
                    showToast(`Playlist "${playlistName}" created`);
                    createPlaylistModal.hide();
                    // If we were on the library index, refresh it to show the new playlist
                    if (contentTitle.textContent === "Your Library") {
                        showLibraryIndex();
                    }
                }
            }
        });

        document.getElementById('playlist-modal-body').addEventListener('click', e => { const playlistItem = e.target.closest('.list-group-item'); if (playlistItem) addSongToPlaylist(playlistItem.dataset.playlistName); });
        topArtistsContainer.addEventListener('click', e => { const artistItem = e.target.closest('.artist-circle-item'); if (artistItem) showArtistSongs(artistItem.dataset.artistId, artistItem.dataset.artistName); });
        bannerContainer.addEventListener('click', e => { const playBtn = e.target.closest('.banner-play-btn'); if (playBtn) { const slideItem = e.target.closest('.carousel-item'); if (slideItem) { const indexToPlay = parseInt(slideItem.dataset.index, 10); if (bannerPlaylist[indexToPlay]) { currentPlaylist = [...bannerPlaylist]; if (isShuffled) { isShuffled = false; toggleShuffle(); } loadSong(indexToPlay); playAudio(); } } } if (e.target.closest('.banner-follow-btn')) { alert("Follow feature coming soon!"); } });
    }

    // --- INITIALIZATION ---
    async function init(isReload = false) {
        if (isReload && window.homePageData) { showHomePage(window.homePageData); return; }
        songCardContainer.innerHTML = `<div class="loading-spinner"></div>`;
        const songResults = await Promise.all([ fetchSongs('telugu latest'), fetchSongs('latest english'), fetchSongs('hindi new releases'), fetchSongs('tamil new songs'), fetchSongs('malayalam latest'), ]);
        if (songResults[0].songs[0]) setDefaultPlayerState(songResults[0].songs[0]);
        const allSongs = songResults.flatMap(result => result.songs);
        bannerPlaylist = [...new Map(allSongs.map(s => [s.id, s])).values()].sort(() => 0.5 - Math.random()).slice(0, 5);
        const artistNames = ['Sid Sriram', 'Arijit Singh', 'Shreya Ghoshal', 'Anirudh Ravichander', 'Billie Eilish'];
        const artists = (await Promise.all(artistNames.map(name => fetchArtistByName(name)))).filter(Boolean);
        const initialData = { telugu: { title: 'Latest in Telugu', songs: songResults[0].songs }, english: { title: 'Latest English Hits', songs: songResults[1].songs }, hindi: { title: 'New Hindi Releases', songs: songResults[2].songs }, tamil: { title: 'New in Tamil', songs: songResults[3].songs }, malayalam: { title: 'Latest Malayalam', songs: songResults[4].songs } };
        window.homePageData = initialData;
        if (!isReload) setupEventListeners();
        updateVolumeDisplay();
        renderUserPlaylists();
        showHomePage(initialData);
        const allArtists = artists.concat(...songResults.flatMap(res => res.rawData).flatMap(song => song.artists?.primary || []));
        renderTopArtists([...new Map(allArtists.map(artist => [artist.id, artist])).values()]);
    }

    init();
});