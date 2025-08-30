document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let currentPlaylist = [];
    let currentSongIndex = 0;
    let isPlaying = false;
    let lastVolume = 1;
    let navigationHistory = [];
    let historyIndex = -1;
    let createPlaylistModal, addToPlaylistModal;
    let searchTimeout; // Re-added for live search

    // --- DOM SELECTIONS ---
    const audioPlayer = new Audio();
    const contentTitle = document.getElementById("content-title");
    const songCardContainer = document.getElementById("song-card-container");
    const topArtistsContainer = document.getElementById("top-artists-container");
    const playPauseBtn = document.querySelector(".play-pause");
    const nowPlayingImg = document.querySelector(".now-playing img");
    const nowPlayingTitle = document.querySelector(".track-name");
    const nowPlayingArtist = document.querySelector(".track-artist");
    const menuHome = document.getElementById('menu-home');
    const menuLikedSongs = document.getElementById('menu-liked-songs');
    const createPlaylistBtn = document.getElementById('create-playlist-btn');
    const playlistLinksContainer = document.getElementById('playlist-links-container');
    const deletePlaylistPageBtn = document.getElementById('delete-playlist-page-btn');
    const searchInput = document.querySelector(".search-bar input");
    const backBtn = document.getElementById("back-btn");
    const forwardBtn = document.getElementById("forward-btn");
    const mobileSearchBtn = document.getElementById("mobile-search-btn");
    const topNavbar = document.querySelector(".top-navbar");
    const mobileSearchCloseBtn = document.getElementById("mobile-search-close-btn");
    const playerHeartIconWrapper = document.getElementById("player-heart-icon-wrapper");
    const addToPlaylistIconWrapper = document.getElementById("add-to-playlist-icon-wrapper");
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
    const newPlaylistForm = document.getElementById('new-playlist-form');
    const newPlaylistNameInput = document.getElementById('inline-playlist-name');
    const savePlaylistBtn = document.getElementById('save-inline-playlist-btn');
    const cancelPlaylistBtn = document.getElementById('cancel-inline-playlist-btn');
    const modalPlaylistList = document.getElementById('modal-playlist-list');
    const sidebarPlaylists = document.querySelector('.sidebar-playlists');

    // --- STORAGE HELPERS ---
    const getFromStorage = (key) => JSON.parse(localStorage.getItem(key)) || {};
    const saveToStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    
    // --- API & DATA HANDLING ---
    async function fetchSongs(query) {
        const url = `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`;
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

    // --- LIKED/PLAYLIST LOGIC ---
    function isSongInList(songId, list) { return list.some(s => s.id === songId); }
    
    function toggleLike() {
        if (!currentPlaylist[currentSongIndex]) return;
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
        songCardContainer.innerHTML = "";
        songCardContainer.className = 'row g-3 row-cols-2 row-cols-md-3 row-cols-lg-6';
        if (songArray.length === 0) {
            songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">No songs found.</p>`;
            return;
        }
        songArray.forEach((song, index) => {
            const cardHTML = `<div class="col" data-index="${index}" data-album-id="${song.albumId}" data-album-name="${song.albumName}"><div class="song-circle-item"><img src="${song.cover}" alt="${song.title} cover"><h5><a href="#">${song.title}</a></h5><p>${song.artist}</p><button class="play-button" aria-label="Play ${song.title}"><i class="bi bi-play-circle-fill"></i></button></div></div>`;
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
                    scrollableRow.innerHTML += `<div class="col" data-identifier="${song.id}" data-playlist-key="${language}" data-album-id="${song.albumId}" data-album-name="${song.albumName}"><div class="song-circle-item"><img src="${song.cover}" alt="${song.title} cover"><h5><a href="#">${song.title}</a></h5><p>${song.artist}</p><button class="play-button" aria-label="Play ${song.title}"><i class="bi bi-play-circle-fill"></i></button></div></div>`;
                });
                section.appendChild(scrollableRow);
                songCardContainer.appendChild(section);
            }
        });
        updateNowPlayingIndicator();
    }
    
    function renderTopArtists(artists) {
        topArtistsContainer.innerHTML = '';
        artists.slice(0, 10).forEach(artist => {
            let imageUrl = artist.image?.find(q => q.quality === '500x500')?.url || artist.image?.slice(-1)[0]?.url;
            if (imageUrl) {
                topArtistsContainer.innerHTML += `<div class="artist-circle-item" role="button" data-artist-id="${artist.id}" data-artist-name="${artist.name}"><img src="${imageUrl}" alt="${artist.name}"><span>${artist.name}</span></div>`;
            }
        });
    }

    function renderPlaylistsInSidebar() {
        const playlists = getFromStorage('harmonyPlaylists') || {};
        playlistLinksContainer.innerHTML = '';
        Object.keys(playlists).sort().forEach(name => {
            const a = document.createElement('a');
            a.href = '#';
            a.className = 'nav-link playlist-link';
            a.dataset.playlistName = name;
            a.innerHTML = `<span>${name}</span> <i class="fas fa-times playlist-delete-icon" data-playlist-name="${name}"></i>`;
            playlistLinksContainer.appendChild(a);
        });
    }

    // --- UI/VIEW MANAGEMENT ---
    function updateView(state, addToHistory = false) {
        const footer = document.querySelector('.site-footer');
        document.querySelectorAll(".sidebar .nav-link.active").forEach(link => link.classList.remove("active"));
        topNavbar.classList.remove('search-active');

        contentTitle.classList.remove('animated');
        void contentTitle.offsetWidth;
        contentTitle.classList.add('animated');

        deletePlaylistPageBtn.style.display = 'none';

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
            if(state.view === 'playlist') {
                deletePlaylistPageBtn.style.display = 'block';
                deletePlaylistPageBtn.dataset.playlistName = state.title;
            }
        }
        
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
    async function showArtistSongs(artistId, artistName, addToHistory = false) { const artistSongs = await fetchSongsByArtist(artistId); updateView({ title: `Songs by ${artistName}`, songs: artistSongs, view: "songs", activeMenu: null }, addToHistory); }
    async function showAlbumSongs(albumId, albumName, addToHistory = false) { const albumSongs = await fetchAlbumSongs(albumId); updateView({ title: albumName, songs: albumSongs, view: "songs" }, addToHistory); }
    function showPlaylistSongs(playlistName, addToHistory = false) { const playlists = getFromStorage('harmonyPlaylists') || {}; updateView({ title: playlistName, songs: playlists[playlistName] || [], view: "playlist" }, addToHistory); }

    // --- PLAYER CONTROLS & LOGIC ---
    function loadSong(index) { if (!currentPlaylist || index < 0 || index >= currentPlaylist.length) return; currentSongIndex = index; const song = currentPlaylist[index]; nowPlayingImg.src = song.cover; nowPlayingTitle.innerHTML = `<a href="#">${song.title}</a>`; nowPlayingArtist.innerHTML = `<a href="#">${song.artist}</a>`; audioPlayer.src = song.audioSrc; updateLikeIcon(); updateNowPlayingIndicator(); }
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
    function updateCardPlayPauseIcon() { const currentCard = songCardContainer.querySelector(".now-playing"); if (currentCard) { const buttonIcon = currentCard.querySelector(".play-button i"); if (buttonIcon) { buttonIcon.className = isPlaying ? "bi bi-pause-circle-fill" : "bi bi-play-circle-fill"; } } }
    function updateNowPlayingIndicator() { document.querySelectorAll(".col[data-index], .col[data-identifier]").forEach(card => card.classList.remove("now-playing")); if (currentPlaylist?.[currentSongIndex]) { const songId = currentPlaylist[currentSongIndex].id; const currentCard = songCardContainer.querySelector(`[data-index="${currentSongIndex}"]`) || songCardContainer.querySelector(`[data-identifier="${songId}"]`); if (currentCard) { currentCard.classList.add("now-playing"); updateCardPlayPauseIcon(); } } }

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
        
        menuHome.addEventListener('click', e => { e.preventDefault(); const homeState = navigationHistory.find(s => s.view === 'home'); if (homeState) { updateView(homeState, true); } else { init(); } });
        menuLikedSongs.addEventListener('click', e => { e.preventDefault(); showLikedSongs(true); });
        createPlaylistBtn.addEventListener('click', () => { sidebarPlaylists.classList.add('form-active'); newPlaylistNameInput.focus(); });
        cancelPlaylistBtn.addEventListener('click', () => sidebarPlaylists.classList.remove('form-active'));
        savePlaylistBtn.addEventListener('click', () => {
            const name = newPlaylistNameInput.value.trim();
            if (name) {
                const playlists = getFromStorage('harmonyPlaylists');
                if (!playlists[name]) {
                    playlists[name] = [];
                    saveToStorage('harmonyPlaylists', playlists);
                    renderPlaylistsInSidebar();
                    sidebarPlaylists.classList.remove('form-active');
                    newPlaylistNameInput.value = '';
                    showPlaylistSongs(name, true);
                } else { alert('A playlist with this name already exists.'); }
            }
        });
        
        const deletePlaylistAction = (playlistName) => {
            if (confirm(`Are you sure you want to delete the playlist "${playlistName}"?`)) {
                const playlists = getFromStorage('harmonyPlaylists');
                delete playlists[playlistName];
                saveToStorage('harmonyPlaylists', playlists);
                renderPlaylistsInSidebar();
                if (contentTitle.textContent === playlistName) {
                    showHomePage(true, navigationHistory.find(s => s.view === 'home')?.languageSections);
                }
            }
        };

        playlistLinksContainer.addEventListener('click', e => {
            const link = e.target.closest('.playlist-link');
            const deleteIcon = e.target.closest('.playlist-delete-icon');
            if (deleteIcon) { e.preventDefault(); e.stopPropagation(); deletePlaylistAction(deleteIcon.dataset.playlistName); } 
            else if (link) { e.preventDefault(); showPlaylistSongs(link.dataset.playlistName, true); }
        });

        deletePlaylistPageBtn.addEventListener('click', e => {
            const playlistName = e.currentTarget.dataset.playlistName;
            if(playlistName) deletePlaylistAction(playlistName);
        });

        addToPlaylistIconWrapper.addEventListener('click', () => {
            if (!currentPlaylist[currentSongIndex]) return;
            const playlists = getFromStorage('harmonyPlaylists');
            modalPlaylistList.innerHTML = '';
            if (Object.keys(playlists).length === 0) {
                modalPlaylistList.innerHTML = '<li class="list-group-item">No playlists created yet.</li>';
            } else {
                Object.keys(playlists).sort().forEach(name => {
                    const li = document.createElement('li');
                    li.className = 'list-group-item';
                    li.textContent = name;
                    li.dataset.playlistName = name;
                    modalPlaylistList.appendChild(li);
                });
            }
            addToPlaylistModal.show();
        });

        modalPlaylistList.addEventListener('click', e => {
            if (e.target.tagName === 'LI' && e.target.dataset.playlistName) {
                const song = currentPlaylist[currentSongIndex];
                const playlistName = e.target.dataset.playlistName;
                const playlists = getFromStorage('harmonyPlaylists');
                if (song && playlists && playlists[playlistName] && !isSongInList(song.id, playlists[playlistName])) {
                    playlists[playlistName].push(song);
                    saveToStorage('harmonyPlaylists', playlists);
                }
                addToPlaylistModal.hide();
            }
        });

        // --- THIS IS THE CORRECTED "LIVE SEARCH" LOGIC ---
        searchInput.addEventListener("keyup", (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.toLowerCase().trim();
            if (query) {
                searchTimeout = setTimeout(async () => {
                    songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">Searching...</p>`;
                    const { songs } = await fetchSongs(query);
                    updateView({ title: `Results for "${query}"`, songs: songs, view: "songs" }, true);
                }, 500); // Wait 500ms after user stops typing
            }
        });
        
        songCardContainer.addEventListener("click", e => {
            const songItem = e.target.closest(".col[data-album-id]");
            if (!songItem) return;
            if (e.target.closest(".play-button")) {
                let playlistToUse, songIdToFind;
                if (songItem.dataset.playlistKey) { const homeState = navigationHistory.find(s => s.view === 'home'); playlistToUse = homeState.languageSections[songItem.dataset.playlistKey].songs; songIdToFind = songItem.dataset.identifier; } 
                else { playlistToUse = currentPlaylist; songIdToFind = playlistToUse[parseInt(songItem.dataset.index, 10)]?.id; }
                const indexToPlay = playlistToUse.findIndex(s => s.id === songIdToFind);
                if (indexToPlay >= 0) { currentPlaylist = playlistToUse; if (indexToPlay === currentSongIndex && isPlaying) { pauseAudio(); } else { loadSong(indexToPlay); playAudio(); } }
            } else {
                const { albumId, albumName } = songItem.dataset;
                if (albumId && albumName) { showAlbumSongs(albumId, albumName, true); }
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
        songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">Loading your music...</p>`;
        
        addToPlaylistModal = new bootstrap.Modal(document.getElementById('addToPlaylistModal'));
        
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
        renderPlaylistsInSidebar();
        showHomePage(true, initialData);
        extractAndDisplayTopArtists(songResults);
    }

    init();
});