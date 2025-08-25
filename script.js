document.addEventListener('DOMContentLoaded', () => {
    // Data
    const songs = [ { id: 1, title: "Blinding Lights", artistId: 1, audioSrc: "audio/1.mp3", cover: "img/1.jpg", liked: false, language: 'english' }, { id: 2, title: "God's Plan", artistId: 2, audioSrc: "audio/2.mp3", cover: "img/2.jpg", liked: true, language: 'english' }, { id: 3, title: "Don't Start Now", artistId: 3, audioSrc: "audio/3.mp3", cover: "img/3.jpg", liked: false, language: 'english' }, { id: 4, title: "Say So", artistId: 4, audioSrc: "audio/4.mp3", cover: "img/4.jpg", liked: false, language: 'english' }, { id: 5, title: "HUMBLE.", artistId: 5, audioSrc: "audio/5.mp3", cover: "img/5.jpg", liked: true, language: 'english' }, { id: 6, title: "Shape of You", artistId: 6, audioSrc: "audio/6.mp3", cover: "img/6.jpg", liked: false, language: 'english' }, { id: 7, title: "bad guy", artistId: 7, audioSrc: "audio/7.mp3", cover: "img/7.jpg", liked: false, language: 'english' }, { id: 8, title: "Circles", artistId: 8, audioSrc: "audio/8.mp3", cover: "img/8.jpg", liked: false, language: 'english' }, { id: 9, title: "Kesariya", artistId: 9, audioSrc: "audio/9.mp3", cover: "img/9.jpg", liked: true, language: 'hindi' }, { id: 10, title: "Raatan Lambiyan", artistId: 10, audioSrc: "audio/10.mp3", cover: "img/10.jpg", liked: false, language: 'hindi' }, { id: 11, title: "Ghungroo", artistId: 11, audioSrc: "audio/11.mp3", cover: "img/11.jpg", liked: false, language: 'hindi' }, { id: 12, title: "Apna Bana Le", artistId: 12, audioSrc: "audio/12.mp3", cover: "img/12.jpg", liked: false, language: 'hindi' }, { id: 13, title: "Kalank", artistId: 13, audioSrc: "audio/13.mp3", cover: "img/13.jpg", liked: false, language: 'hindi' }, { id: 14, title: "Shayad", artistId: 14, audioSrc: "audio/14.mp3", cover: "img/14.jpg", liked: true, language: 'hindi' }, { id: 15, title: "Bekhayali", artistId: 15, audioSrc: "audio/15.mp3", cover: "img/15.jpg", liked: false, language: 'hindi' }, { id: 16, title: "Makhna", artistId: 1, audioSrc: "audio/16.mp3", cover: "img/16.jpg", liked: false, language: 'hindi' }, { id: 17, title: "ButtaBomma", artistId: 3, audioSrc: "audio/17.mp3", cover: "img/17.jpg", liked: false, language: 'telugu' }, { id: 18, title: "Ramuloo Ramulaa", artistId: 4, audioSrc: "audio/18.mp3", cover: "img/18.jpg", liked: false, language: 'telugu' }, { id: 19, title: "Samajavaragamana", artistId: 6, audioSrc: "audio/19.mp3", cover: "img/19.jpg", liked: false, language: 'telugu' }, { id: 20, title: "Kalaavathi", artistId: 7, audioSrc: "audio/20.mp3", cover: "img/20.jpg", liked: false, language: 'telugu' }, { id: 21, title: "Nee Kannu Neeli", artistId: 8, audioSrc: "audio/21.mp3", cover: "img/21.jpg", liked: false, language: 'telugu' }, { id: 22, title: "Choosi Chudangane", artistId: 9, audioSrc: "audio/22.mp3", cover: "img/22.jpg", liked: false, language: 'telugu' }, { id: 23, title: "Hamsa Naava", artistId: 10, audioSrc: "audio/23.mp3", cover: "img/23.jpg", liked: false, language: 'telugu' }, { id: 24, title: "Inkem Inkem Kaavaale", artistId: 11, audioSrc: "audio/24.mp3", cover: "img/24.jpg", liked: false, language: 'telugu' }, { id: 25, title: "Vachinde", artistId: 12, audioSrc: "audio/25.mp3", cover: "img/25.jpg", liked: false, language: 'telugu' }, { id: 26, title: "Adiga Adiga", artistId: 13, audioSrc: "audio/26.mp3", cover: "img/26.jpg", liked: false, language: 'telugu' } ];
    const artists = [ { id: 1, name: "The Weeknd", image: "img/21.jpg" }, { id: 2, name: "Drake", image: "img/22.jpg" }, { id: 3, name: "Dua Lipa", image: "img/23.jpg" }, { id: 4, name: "Doja Cat", image: "img/24.jpg" }, { id: 5, name: "Kendrick Lamar", image: "img/25.jpg" }, { id: 6, name: "Ed Sheeran", image: "img/26.jpg" }, { id: 7, name: "Billie Eilish", image: "img/27.jpg" }, { id: 8, name: "Post Malone", image: "img/28.jpg" }, { id: 9, name: "Harry Styles", image: "img/29.jpg" }, { id: 10, name: "Olivia Rodrigo", image: "img/30.jpg" }, { id: 11, name: "Justin Bieber", image: "img/31.jpg" }, { id: 12, name: "The Kid LAROI", image: "img/32.jpg" }, { id: 13, name: "Glass Animals", image: "img/33.jpg" }, { id: 14, name: "Lil Nas X", image: "img/34.jpg" }, { id: 15, name: "Imagine Dragons", image: "img/35.jpg" } ];
    
    let currentSongIndex = 0, isPlaying = false, lastVolume = 1;
    let navigationHistory = [], historyIndex = -1;

    // DOM Selections
    const audioPlayer = new Audio();
    const topArtistsContainer = document.getElementById('top-artists-container');
    const contentTitle=document.getElementById("content-title"),songCardContainer=document.getElementById("song-card-container"),playPauseBtn=document.querySelector(".play-pause"),nowPlayingImg=document.querySelector(".now-playing img"),nowPlayingTitle=document.querySelector(".track-name"),nowPlayingArtist=document.querySelector(".track-artist"),menuDropdownToggle=document.getElementById("menu-dropdown-toggle"),menuAllSongsDropdown=document.getElementById("menu-all-songs-dropdown"),menuLikedSongsDropdown=document.getElementById("menu-liked-songs-dropdown"),searchInput=document.querySelector(".search-bar input"),backBtn=document.getElementById("back-btn"),forwardBtn=document.getElementById("forward-btn"),progressBar=document.querySelector(".player-controls .progress-bar"),progress=progressBar.querySelector(".progress"),currentTimeDisplay=document.querySelector(".time.current-time"),durationDisplay=document.querySelector(".time.duration"),prevBtn=document.querySelector(".player-controls button[aria-label='Previous Track']"),nextBtn=document.querySelector(".player-controls button[aria-label='Next Track']"),volumeIconBtn=document.getElementById("volume-icon-btn"),volumeBar=document.querySelector(".volume-bar"),volumeProgress=volumeBar.querySelector(".volume-progress");
    const playIcon=document.getElementById("play-icon"),pauseIcon=document.getElementById("pause-icon"),heartIconWrapper=document.getElementById("player-heart-icon-wrapper"),heartIconLiked=document.getElementById("heart-icon-liked"),heartIconUnliked=document.getElementById("heart-icon-unliked"),volumeUpIcon=document.getElementById("volume-up-icon"),volumeDownIcon=document.getElementById("volume-down-icon"),volumeMuteIcon=document.getElementById("volume-mute-icon");

    function renderCards(songArray){
        songCardContainer.innerHTML = "";
        songCardContainer.className = 'row g-3'; 
        songArray.forEach(song=>{
            const artist=artists.find(a=>a.id===song.artistId)||{name:"Unknown",image:"img/default.jpg"};
            const originalIndex=songs.findIndex(s=>s.audioSrc===song.audioSrc);
            const cardHTML=`
                <div class="col-4 col-md-3 col-lg-2" data-original-index="${originalIndex}">
                    <div class="card song-grid-card">
                        <img src="${song.cover}" class="card-img" alt="Album Cover">
                        <h5 class="card-title"><a href="#">${song.title}</a></h5>
                        <p class="card-text">
                            <a href="#" class="artist-link">
                                <img src="${artist.image}" alt="${artist.name}">
                                <span>${artist.name}</span>
                            </a>
                        </p>
                        <button class="play-button" aria-label="Play ${song.title}"><i class="bi bi-play-circle-fill"></i></button>
                    </div>
                </div>`;
            songCardContainer.innerHTML+=cardHTML;
        });
        updateNowPlayingIndicator();
    }

    function renderHomePageContent() {
        songCardContainer.innerHTML = '';
        songCardContainer.className = ''; 
        const languages = [ { id: 'telugu', title: 'Telugu Songs' }, { id: 'english', title: 'English Songs' }, { id: 'hindi', title: 'Hindi Songs' } ];
        languages.forEach(lang => {
            const languageSongs = songs.filter(song => song.language === lang.id);
            if (languageSongs.length > 0) {
                const section = document.createElement('div');
                section.className = 'language-section';
                const title = document.createElement('h2');
                title.className = 'section-title';
                title.textContent = lang.title;
                section.appendChild(title);
                const scrollableRow = document.createElement('div');
                scrollableRow.className = 'song-row-scrollable';
                languageSongs.forEach(song => {
                    const artist = artists.find(a => a.id === song.artistId) || { name: "Unknown" };
                    const originalIndex = songs.findIndex(s => s.audioSrc === song.audioSrc);
                    const songItemHTML = `<div class="song-circle-item" data-original-index="${originalIndex}"><img src="${song.cover}" alt="${song.title} cover"><h5><a href="#">${song.title}</a></h5><p>${artist.name}</p><button class="play-button" aria-label="Play ${song.title}"><i class="bi bi-play-circle-fill"></i></button></div>`;
                    scrollableRow.innerHTML += songItemHTML;
                });
                section.appendChild(scrollableRow);
                songCardContainer.appendChild(section);
            }
        });
        updateNowPlayingIndicator();
    }
    
    function renderTopArtists() {
        topArtistsContainer.innerHTML = "";
        artists.forEach(artist => {
            const artistHTML = `
                <a href="#" class="artist-circle-item">
                    <img src="${artist.image}" alt="${artist.name}">
                    <span>${artist.name}</span>
                </a>
            `;
            topArtistsContainer.innerHTML += artistHTML;
        });
    }

    function setupEventListeners(){
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
        audioPlayer.addEventListener("loadedmetadata", () => durationDisplay.textContent = formatTime(audioPlayer.duration));
        audioPlayer.addEventListener("ended", nextSong);
        
        // Use a generic listener for the home page, triggered by clicking the logo as well
        document.querySelector('.logo').addEventListener('click', e => { e.preventDefault(); showHomePage(true); });
        menuAllSongsDropdown.addEventListener("click", e => { e.preventDefault(); showAllSongsGrid(true); });
        menuLikedSongsDropdown.addEventListener("click", e => { e.preventDefault(); showLikedSongs(true); });

        searchInput.addEventListener("keyup", () => {
            const query = searchInput.value.toLowerCase().trim();
            if (query) {
                const filteredSongs = songs.filter(song => {
                    const artist = artists.find(a => a.id === song.artistId);
                    return artist.name.toLowerCase().includes(query) || song.title.toLowerCase().includes(query);
                });
                renderSearchResults(filteredSongs, query);
            } else {
                goBack() || showHomePage(false);
            }
        });

        songCardContainer.addEventListener("click", e => {
            const songItem = e.target.closest("[data-original-index]");
            if (!songItem) return;
            
            const indexToPlay = parseInt(songItem.dataset.originalIndex, 10);
            if (e.target.closest(".play-button")) {
                if (indexToPlay === currentSongIndex && isPlaying) pauseAudio();
                else {
                    if (indexToPlay !== currentSongIndex) loadSong(indexToPlay);
                    playAudio();
                }
            }
        });

        const sidebarElement = document.getElementById("sidebarMenu");
        if (sidebarElement) {
            const offcanvas = new bootstrap.Offcanvas(sidebarElement);
            sidebarElement.addEventListener("click", e => {
                if (e.target.closest(".nav-link") || e.target.closest(".dropdown-item")) {
                    offcanvas.hide();
                }
            });
        }
    }
    
    function updateCardPlayPauseIcon(){const currentCard=songCardContainer.querySelector(".now-playing");if(currentCard){const buttonIcon=currentCard.querySelector(".play-button i");buttonIcon&&(buttonIcon.classList.toggle("bi-pause-circle-fill",isPlaying),buttonIcon.classList.toggle("bi-play-circle-fill",!isPlaying))}}
    function updateNowPlayingIndicator(){document.querySelectorAll(".card, .song-circle-item").forEach(card=>{card.classList.remove("now-playing");const icon=card.querySelector(".play-button i");icon&&(icon.className="bi bi-play-circle-fill")});const currentCard=songCardContainer.querySelector(`[data-original-index="${currentSongIndex}"]`);currentCard&&(currentCard.classList.add("now-playing"),updateCardPlayPauseIcon())}
    function playAudio(){isPlaying=!0,audioPlayer.play(),updatePlayPauseIcon(),updateCardPlayPauseIcon()}
    function pauseAudio(){isPlaying=!1,audioPlayer.pause(),updatePlayPauseIcon(),updateCardPlayPauseIcon()}
    function loadSong(index){currentSongIndex=index;const song=songs[index],artist=artists.find(a=>a.id===song.artistId)||"Unknown";nowPlayingImg.src=song.cover,nowPlayingTitle.innerHTML=`<a href="#">${song.title}</a>`,nowPlayingArtist.innerHTML=`<a href="#">${artist.name}</a>`,audioPlayer.src=song.audioSrc,updateHeartIcon(),updateNowPlayingIndicator()}
    
    function renderSearchResults(filteredSongs = [], query = "") {
        contentTitle.textContent = `Results for "${query}"`;
        contentTitle.style.display = 'block';
        document.querySelector('.site-footer').style.display = 'none';
        document.querySelectorAll(".sidebar .nav-link.active").forEach(l => l.classList.remove("active"));
        if (filteredSongs.length > 0) {
            renderCards(filteredSongs);
        } else {
            songCardContainer.className = '';
            songCardContainer.innerHTML = `<p class="text-center text-muted fs-5 mt-4">No results found for "${query}"</p>`;
        }
    }
    
    function updateView(e, t = false) {
        const footer = document.querySelector('.site-footer');
        if (e.view === "home") {
            contentTitle.style.display = 'none';
            if (footer) footer.style.display = 'block';
            renderHomePageContent();
        } else {
            contentTitle.style.display = 'block';
            contentTitle.textContent = e.title;
            if (footer) footer.style.display = 'none';
            renderCards(e.songs);
        }
    
        document.querySelectorAll(".sidebar .nav-link.active").forEach(link => link.classList.remove("active"));
        if (e.activeMenu) e.activeMenu.classList.add("active");
    
        if (t) {
            const lastState = navigationHistory[historyIndex];
            if (!lastState || lastState.title !== e.title) {
                if (historyIndex < navigationHistory.length - 1) {
                    navigationHistory = navigationHistory.slice(0, historyIndex + 1);
                }
                navigationHistory.push(e);
                historyIndex++;
            }
        }
        updateNavButtonsState();
    }

    function updateNavButtonsState(){backBtn.classList.toggle("disabled",historyIndex<=0),forwardBtn.classList.toggle("disabled",historyIndex>=navigationHistory.length-1)}
    function updatePlayPauseIcon(){playIcon.style.display=isPlaying?"none":"block",pauseIcon.style.display=isPlaying?"block":"none"}
    function updateHeartIcon(){const isLiked=songs[currentSongIndex].liked;heartIconLiked.style.display=isLiked?"block":"none",heartIconUnliked.style.display=isLiked?"none":"block",heartIconWrapper.classList.toggle("liked",isLiked)}
    function updateVolumeDisplay(){const e=audioPlayer.volume;volumeProgress.style.width=`${100*e}%`,volumeUpIcon.style.display="none",volumeDownIcon.style.display="none",volumeMuteIcon.style.display="none",e>.5?volumeUpIcon.style.display="block":e>0?volumeDownIcon.style.display="block":volumeMuteIcon.style.display="block"}
    function togglePlay(){audioPlayer.src||loadSong(0),isPlaying?pauseAudio():playAudio()}
    function prevSong(){const e=isPlaying;currentSongIndex=(currentSongIndex-1+songs.length)%songs.length,loadSong(currentSongIndex),e&&playAudio()}
    function nextSong(){const e=isPlaying;currentSongIndex=(currentSongIndex+1)%songs.length,loadSong(currentSongIndex),e&&playAudio()}
    function toggleLike(){songs[currentSongIndex].liked=!songs[currentSongIndex].liked,updateHeartIcon();if(!songs[currentSongIndex].liked&&contentTitle.textContent.includes("Liked Songs")){const likedSongs=songs.filter(s=>s.liked);navigationHistory[historyIndex].songs=likedSongs,renderCards(likedSongs)}}
    
    function showHomePage(e = false) {
        const t = { title: "Home", view: "home", activeMenu: menuDropdownToggle }; // Menu is now the main 'active' button
        updateView(t, e);
    }
    
    function showAllSongsGrid(e = false) {
        const viewState = { title: "All Songs", songs: songs, view: "songs", activeMenu: null };
        updateView(viewState, e);
    }
    
    function showLikedSongs(e=false){
        const t=songs.filter(e=>e.liked);
        const o={title:"Liked Songs",songs:t,view:"songs",activeMenu: null};
        updateView(o,e);
    }
    
    function goBack(){if(historyIndex>0){historyIndex--,updateView(navigationHistory[historyIndex])}}
    function goForward(){if(historyIndex<navigationHistory.length-1){historyIndex++,updateView(navigationHistory[historyIndex])}}
    function formatTime(e){const t=Math.floor(e/60),o=Math.floor(e%60);return`${t}:${o<10?"0":""}${o}`}
    function updateProgress(){const{duration:e,currentTime:t}=audioPlayer;e&&(progress.style.width=`${t/e*100}%`,currentTimeDisplay.textContent=formatTime(t))}
    function setProgress(e){const t=e.currentTarget.clientWidth,o=e.offsetX;audioPlayer.duration&&(audioPlayer.currentTime=o/t*audioPlayer.duration)}
    function setVolume(e){const t=e.currentTarget.clientWidth,o=e.offsetX;audioPlayer.volume=o/t}
    function toggleMute(){audioPlayer.volume>0?(lastVolume=audioPlayer.volume,audioPlayer.volume=0):(audioPlayer.volume=lastVolume)}
    
    function init() {
        renderTopArtists();
        setupEventListeners();
        updateVolumeDisplay();
        const e = { title: "Home", view: "home", activeMenu: menuDropdownToggle };
        updateView(e, true);

        // This ensures the dropdown menu is always initialized and clickable, fixing the mobile bug
        const dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
        dropdownElementList.map(function (dropdownToggleEl) {
            return new bootstrap.Dropdown(dropdownToggleEl);
        });
    }
    init();
});