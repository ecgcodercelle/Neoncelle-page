document.addEventListener("DOMContentLoaded", () => {
    let currentVerseId = ""; 

    function getCurrentDayOfCycle() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const diff = now - startOfYear;
        const oneDay = 1000 * 60 * 60 * 24;
        const dayOfYear = Math.floor(diff / oneDay);
        
        const yearCycle = now.getFullYear() % 3; 
        return (yearCycle * 365) + dayOfYear;
    }

    const currentDay = getCurrentDayOfCycle();

    fetch('bibelverse.json')
        .then(response => {
            if (!response.ok) throw new Error('JSON konnte nicht geladen werden.');
            return response.json();
        })
        .then(data => {
            let todaysVerse = data.find(item => parseInt(item.day) === currentDay);
            
            if (!todaysVerse) {
                todaysVerse = data[currentDay % data.length];
            }

            if (todaysVerse) {
                currentVerseId = `verse_day_${todaysVerse.day}`;

                document.getElementById('bible-text').innerText = todaysVerse.verse;
                document.getElementById('bible-ref').innerText = todaysVerse.reference;

                // Like-Zustand für den geladenen Vers initialisieren
                setupLikeSystem();
            }
        })
        .catch(error => {
            console.error('Fehler:', error);
            document.getElementById('bible-text').innerText = "Fehler beim Laden.";
        });

    function setupLikeSystem() {
        const likeBtn = document.getElementById('like-trigger');
        const likeCountDisplay = document.getElementById('like-count');

        // Basis-Anzahl der globalen Likes simulieren/auslesen
        let totalLikes = parseInt(localStorage.getItem(`global_likes_${currentVerseId}`) || Math.floor(Math.random() * 40) + 10);
        
        // Prüfen, ob der User diesen Vers schon geliked hat (0 oder 1)
        let userHasLiked = localStorage.getItem(`user_liked_${currentVerseId}`) === "true";

        // Ansicht beim Laden aufbauen
        if (userHasLiked) {
            likeBtn.classList.add('liked');
        }
        likeCountDisplay.innerText = totalLikes;

        likeBtn.addEventListener('click', () => {
            if (userHasLiked) {
                // Wenn schon geliked: Like wieder abziehen
                totalLikes -= 1;
                userHasLiked = false;
                likeBtn.classList.remove('liked');
                localStorage.setItem(`user_liked_${currentVerseId}`, "false");
            } else {
                // Wenn noch nicht geliked: Einmalig hochzählen
                totalLikes += 1;
                userHasLiked = true;
                likeBtn.classList.add('liked');
                localStorage.setItem(`user_liked_${currentVerseId}`, "true");
            }

            // Neuen Wert im Speicher sichern
            localStorage.setItem(`global_likes_${currentVerseId}`, totalLikes);
            likeCountDisplay.innerText = totalLikes;
        });
    }
});
