// ==========================================================================
// NEON CELLE — Umfrage-Erstellung (Admin)
// Spricht mit der eigenen /api/umfrage/* API (IONOS-MySQL-Datenbank),
// kein Supabase mehr nötig.
// ==========================================================================

function initUmfragenAdmin() {
    const surveyForm = document.getElementById("create-survey-form");
    if (!surveyForm) return; // Beendet das Skript, falls das Formular auf der Seite fehlt

    const isExternalCheckbox = document.getElementById("is-external-link");
    const customLinkWrapper = document.getElementById("custom-link-wrapper");
    const questionsWrapper = document.getElementById("questions-wrapper");
    const questionsContainer = document.getElementById("questions-container");
    const addQuestionBtn = document.getElementById("add-question-trigger");
    const statusBox = document.getElementById("form-status");

    let questionCounter = 0;

    // Erstellt ein Google-Forms-Fragenfeld und bindet die Klick-Events lokal ein
    function createQuestionBlock() {
        if (!questionsContainer) return;
        questionCounter++;
        const qId = questionCounter;

        const block = document.createElement("div");
        block.className = "question-block";
        block.dataset.questionId = qId;

        block.innerHTML = `
            <div class="question-header">
                <span class="question-title-label">Frage ${qId}</span>
                <select class="type-select question-type-select">
                    <option value="choice">Multiple-Choice (Kreise)</option>
                    <option value="checkbox">Mehrfachauswahl (Kästchen)</option>
                    <option value="dropdown">Dropdown-Menü</option>
                    <option value="text">Freitext (Absatz)</option>
                </select>
            </div>
            <div class="form-group">
                <input type="text" class="form-control question-text-input" placeholder="Formuliere deine Frage..." required>
            </div>
            <div class="options-wrapper-div">
                <label style="font-size: 0.85rem; color: #888;">Antwortoptionen</label>
                <div class="options-list">
                    <div class="option-item"><input type="text" class="form-control option-text-input" placeholder="Option 1" required style="flex: 1;"></div>
                    <div class="option-item"><input type="text" class="form-control option-text-input" placeholder="Option 2" required style="flex: 1;"></div>
                </div>
                <div class="btn-add-option">+ Option hinzufügen</div>
            </div>
        `;

        const typeSelect = block.querySelector(".question-type-select");
        const optionsWrapper = block.querySelector(".options-wrapper-div");
        const addOptionBtn = block.querySelector(".btn-add-option");
        const optionsList = block.querySelector(".options-list");

        // Event: Fragetyp wechseln
        typeSelect.addEventListener("change", () => {
            if (typeSelect.value === "text") {
                optionsWrapper.classList.add("hidden");
                optionsList.querySelectorAll("input").forEach(i => i.removeAttribute("required"));
            } else {
                optionsWrapper.classList.remove("hidden");
                optionsList.querySelectorAll("input").forEach(i => i.setAttribute("required", "true"));
            }
        });

        // Event: Option innerhalb dieser Frage hinzufügen
        addOptionBtn.addEventListener("click", () => {
            const optCount = optionsList.children.length + 1;
            const optDiv = document.createElement("div");
            optDiv.className = "option-item";
            optDiv.innerHTML = `<input type="text" class="form-control option-text-input" placeholder="Option ${optCount}" required style="flex: 1;">`;
            optionsList.appendChild(optDiv);
        });

        questionsContainer.appendChild(block);
    }

    // Erste Startfrage generieren
    if (questionsContainer && questionsContainer.children.length === 0) {
        createQuestionBlock();
    }

    if (addQuestionBtn) {
        addQuestionBtn.addEventListener("click", createQuestionBlock);
    }

    // Umschalten zu externem Link
    if (isExternalCheckbox) {
        isExternalCheckbox.addEventListener("change", () => {
            const surveyLinkInput = document.getElementById("survey-link");
            if (isExternalCheckbox.checked) {
                if (customLinkWrapper) customLinkWrapper.classList.remove("hidden");
                if (surveyLinkInput) surveyLinkInput.setAttribute("required", "true");
                if (questionsWrapper) questionsWrapper.classList.add("hidden");
                toggleRequiredFields(false);
            } else {
                if (customLinkWrapper) customLinkWrapper.classList.add("hidden");
                if (surveyLinkInput) surveyLinkInput.removeAttribute("required");
                if (questionsWrapper) questionsWrapper.classList.remove("hidden");
                toggleRequiredFields(true);
            }
        });
    }

    function toggleRequiredFields(state) {
        if (!questionsContainer) return;
        questionsContainer.querySelectorAll("input").forEach(input => {
            if (state) input.setAttribute("required", "true");
            else input.removeAttribute("required");
        });
    }

    // Baut aus dem Formular das JSON-Objekt für die API
    function buildPayload(isExternal) {
        const titel = document.getElementById("survey-title").value.trim();
        const beschreibung = document.getElementById("survey-desc").value.trim();
        const surveyLinkInput = document.getElementById("survey-link");
        const custom_link = (isExternal && surveyLinkInput) ? surveyLinkInput.value.trim() : null;

        const fragen = [];
        if (!isExternal && questionsContainer) {
            questionsContainer.querySelectorAll(".question-block").forEach(block => {
                const frage_text = block.querySelector(".question-text-input").value.trim();
                const frage_typ = block.querySelector(".question-type-select").value;
                const frage = { frage_text, frage_typ };

                if (frage_typ !== "text") {
                    frage.optionen = Array.from(block.querySelectorAll(".option-text-input"))
                        .map(input => input.value.trim())
                        .filter(text => text !== "");
                }
                fragen.push(frage);
            });
        }

        return { titel, beschreibung: beschreibung || null, custom_link, fragen };
    }

    // Absende-Logik an die eigene API
    surveyForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const isExternal = isExternalCheckbox ? isExternalCheckbox.checked : false;
        const payload = buildPayload(isExternal);

        if (statusBox) {
            statusBox.className = "status-msg";
            statusBox.innerText = "Speichere Umfrage...";
            statusBox.classList.remove("hidden");
        }

        try {
            const res = await fetch(API_BASE + "?action=umfrage_save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Unbekannter Fehler beim Speichern.");

            if (statusBox) {
                statusBox.className = "status-msg status-success";
                statusBox.innerText = "Umfrage erfolgreich gespeichert! 🎉";
            }

            surveyForm.reset();
            if (questionsContainer) questionsContainer.innerHTML = "";
            questionCounter = 0;
            createQuestionBlock();
            if (customLinkWrapper) customLinkWrapper.classList.add("hidden");
            if (questionsWrapper) questionsWrapper.classList.remove("hidden");

            if (typeof loadUmfrageListe === "function") loadUmfrageListe();

        } catch (err) {
            console.error(err);
            if (statusBox) {
                statusBox.className = "status-msg status-error";
                statusBox.innerText = "Fehler: " + err.message;
            }
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUmfragenAdmin);
} else {
    initUmfragenAdmin();
}
