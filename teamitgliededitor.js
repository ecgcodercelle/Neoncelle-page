let currentTeamMember = {
    "name": "Neon Leader",
    "dabeiSeit": "2024",
    "ueberMich": "Hi! Ich bin Teil der Jugendleitung bei Neon Celle.",
    "funFact": "Kann 3 Pizzen hintereinander essen.",
    "instagram": "",
    "email": "",
    "image": "" // Hält den Base64-Datenstrom des Bildes
};

window.addEventListener('DOMContentLoaded', () => {
    const savedData = localStorage.getItem('neon_team_data');
    if(savedData) {
        currentTeamMember = JSON.parse(savedData);
    }
    
    document.getElementById('input-name').value = currentTeamMember.name;
    document.getElementById('input-seit').value = currentTeamMember.dabeiSeit;
    document.getElementById('input-ueber').value = currentTeamMember.ueberMich;
    document.getElementById('input-fun').value = currentTeamMember.funFact;
    document.getElementById('input-insta').value = currentTeamMember.instagram;
    document.getElementById('input-email').value = currentTeamMember.email;

    refreshCardDisplay();
    setupLiveListeners();
});

function setupLiveListeners() {
    const syncField = (inputId, viewId) => {
        document.getElementById(inputId).addEventListener('input', (e) => {
            document.getElementById(viewId).innerText = e.target.value || '-';
        });
    };

    syncField('input-name', 'view-name');
    syncField('input-seit', 'view-seit');
    syncField('input-ueber', 'view-ueber');
    syncField('input-fun', 'view-fun');

    // Live Bild-Umschalter
    document.getElementById('input-image').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                currentTeamMember.image = event.target.result; // Als Base64 speichern
                
                const imgEl = document.getElementById('view-image');
                const txtEl = document.getElementById('view-image-text');
                imgEl.src = currentTeamMember.image;
                imgEl.style.display = 'block';
                txtEl.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    document.getElementById('input-insta').addEventListener('input', (e) => {
        const instaEl = document.getElementById('link-insta');
        if(e.target.value) {
            instaEl.href = `https://instagram.com{e.target.value}`;
            instaEl.style.display = 'flex';
        } else {
            instaEl.style.display = 'none';
        }
    });

    document.getElementById('input-email').addEventListener('input', (e) => {
        const emailEl = document.getElementById('link-email');
        if(e.target.value) {
            emailEl.href = `mailto:${e.target.value}`;
            emailEl.style.display = 'flex';
        } else {
            emailEl.style.display = 'none';
        }
    });
}

function refreshCardDisplay() {
    document.getElementById('view-name').innerText = currentTeamMember.name || '-';
    document.getElementById('view-seit').innerText = currentTeamMember.dabeiSeit || '-';
    document.getElementById('view-ueber').innerText = currentTeamMember.ueberMich || '-';
    document.getElementById('view-fun').innerText = currentTeamMember.funFact || '-';

    const imgEl = document.getElementById('view-image');
    const txtEl = document.getElementById('view-image-text');
    if(currentTeamMember.image) {
        imgEl.src = currentTeamMember.image;
        imgEl.style.display = 'block';
        txtEl.style.display = 'none';
    } else {
        imgEl.style.display = 'none';
        txtEl.style.display = 'block';
    }

    const instaEl = document.getElementById('link-insta');
    if(currentTeamMember.instagram) {
        instaEl.href = `https://instagram.com{currentTeamMember.instagram}`;
        instaEl.style.display = 'flex';
    } else {
        instaEl.style.display = 'none';
    }

    const emailEl = document.getElementById('link-email');
    if(currentTeamMember.email) {
        emailEl.href = `mailto:${currentTeamMember.email}`;
        emailEl.style.display = 'flex';
    } else {
        emailEl.style.display = 'none';
    }
}

function saveTeamData() {
    currentTeamMember.name = document.getElementById('input-name').value;
    currentTeamMember.dabeiSeit = document.getElementById('input-seit').value;
    currentTeamMember.ueberMich = document.getElementById('input-ueber').value;
    currentTeamMember.funFact = document.getElementById('input-fun').value;
    currentTeamMember.instagram = document.getElementById('input-insta').value;
    currentTeamMember.email = document.getElementById('input-email').value;

    localStorage.setItem('neon_team_data', JSON.stringify(currentTeamMember));

    const jsonContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentTeamMember, null, 4));
    const downloadElement = document.createElement('a');
    downloadElement.setAttribute("href", jsonContent);
    downloadElement.setAttribute("download", "team.json");
    document.body.appendChild(downloadElement);
    
    downloadElement.click();
    downloadElement.remove();

    alert("Erfolgreich! Deine 'team.json' wurde mit Bild generiert.");
}
