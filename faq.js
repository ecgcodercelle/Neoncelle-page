window.addEventListener('DOMContentLoaded', () => {
    loadMainFaqData();
});

// Lädt alle FAQs live über die Schnittstelle (api.php)
function loadMainFaqData() {
    fetch(API_BASE + '?action=faq_list')
        .then(res => res.json())
        .then(faqList => {
            renderFaqAccordion(faqList);
        })
        .catch(err => {
            console.error("Fehler beim Laden der FAQs:", err);
            const container = document.getElementById('main-faq-target');
            if (container) {
                container.innerHTML = `<p style="color: #D7EC2D; text-align: center; font-family: var(--font-alt);">FAQ-Bereich konnte nicht geladen werden.</p>`;
            }
        });
}

// Generiert die goldenen Balken im Schleifenverfahren
function renderFaqAccordion(faqList) {
    const container = document.getElementById('main-faq-target');
    if (!container) return;

    container.innerHTML = "";

    if (!faqList || faqList.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted); font-style: italic; text-align: center; font-family: var(--font-alt);">Aktuell sind keine Fragen verfügbar.</p>`;
        return;
    }

    faqList.forEach(item => {
        const accordionItem = document.createElement('div');
        accordionItem.className = 'faq-accordion-item';

        // Erzeugt den goldenen Balken mit schwarzer Schrift und dem Pfeil
        accordionItem.innerHTML = `
            <button class="faq-accordion-header">
                <span>${item.frage || '-'}</span>
                <span class="faq-icon-arrow">⬇</span>
            </button>
            <div class="faq-accordion-content">
                <div class="faq-accordion-body">
                    ${item.antwort || '-'}
                </div>
            </div>
        `;

        const headerBtn = accordionItem.querySelector('.faq-accordion-header');
        const contentBox = accordionItem.querySelector('.faq-accordion-content');

        headerBtn.addEventListener('click', () => {
            const isActive = accordionItem.classList.contains('active');
            
            // Schließt alle anderen geöffneten Boxen (Akkordeon-Funktion)
            document.querySelectorAll('.faq-accordion-item').forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.faq-accordion-content').style.maxHeight = null;
            });

            // Wenn es zu war, öffne es jetzt flüssig
            if (!isActive) {
                accordionItem.classList.add('active');
                contentBox.style.maxHeight = contentBox.scrollHeight + "px";
            }
        });

        container.appendChild(accordionItem);
    });
}
