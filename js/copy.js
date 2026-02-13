// Script uniquement pour le chargement des données JSON

// Fonction pour accéder à une propriété imbriquée via une chaîne "a.b.c"
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Parser les dates mixtes (année seule ou "Mois Année" en français)
function parseExperienceDate(dateStr, isEnd = true) {
    const frenchMonths = {
        'janvier': 0, 'février': 1, 'mars': 2, 'avril': 3,
        'mai': 4, 'juin': 5, 'juillet': 6, 'août': 7,
        'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11
    };

    const trimmed = dateStr.trim();

    // Année seule (ex: "2020") → fin d'année si isEnd, début d'année sinon
    if (/^\d{4}$/.test(trimmed)) {
        const year = parseInt(trimmed);
        return isEnd ? new Date(year, 11, 31) : new Date(year, 0, 1);
    }

    // "Mois Année" en français (ex: "Septembre 2023")
    const parts = trimmed.split(' ');
    if (parts.length === 2) {
        const month = frenchMonths[parts[0].toLowerCase()];
        const year = parseInt(parts[1]);
        if (month !== undefined && !isNaN(year)) {
            return new Date(year, month, 1);
        }
    }

    return new Date(0);
}

// Charger et appliquer les données JSON
async function loadContent() {
    try {
        const response = await fetch('data/content.json');
        const data = await response.json();

        // Appliquer le contenu textuel
        document.querySelectorAll('[data-content]').forEach(element => {
            const path = element.getAttribute('data-content');
            const value = getNestedValue(data, path);
            if (value) {
                element.textContent = value;
            }
        });

        // Appliquer les sources d'images
        document.querySelectorAll('[data-src]').forEach(element => {
            const path = element.getAttribute('data-src');
            const value = getNestedValue(data, path);
            if (value) {
                element.src = value;
            }
        });

        // Appliquer les liens
        document.querySelectorAll('[data-href]').forEach(element => {
            const path = element.getAttribute('data-href');
            const prefix = element.getAttribute('data-href-prefix') || '';
            const value = getNestedValue(data, path);
            if (value) {
                element.href = prefix + value;
            }
        });

        // Mettre à jour le titre de la page
        if (data.site?.title) {
            document.title = data.site.title;
        }

        // Générer les cartes de projets
        if (data.projets) {
            const projectList = document.querySelector('.project-list');
            const project = document.querySelector('.projects');
            const projectsListOnglet = document.querySelector('.projects-list');
            var card = false;
            if (projectList && card) {
                Object.values(data.projets).forEach(projet => {
                    const card = document.createElement('div');
                    card.className = 'project-card';
                    card.innerHTML = `<h3>${projet.nom}</h3>`;
                    card.innerHTML += `<p>${projet.description}</p>`;
                    projectList.appendChild(card);
                });
            }
            if (projectsListOnglet && !card) {
                const projectDescription = document.querySelector('.project-description');

                Object.values(data.projets).forEach(projet => {
                    // create radio btn
                    const radioPoint = document.createElement('input');
                    radioPoint.type = 'radio';
                    radioPoint.name= 'projectNav';
                    radioPoint.className='nav-project-radio'
                    radioPoint.id='projectNav-'+projet.nom;

                    // Ajouter un écouteur d'événement pour mettre à jour la description
                    radioPoint.addEventListener('change', () => {
                        if (radioPoint.checked && projectDescription) {
                            // Générer les cartes de collaborateurs
                            let collaborateursHTML = '';
                            if (projet.collaborateurs) {
                                const collabList = Array.isArray(projet.collaborateurs)
                                    ? projet.collaborateurs
                                    : projet.collaborateurs.split(',').map(c => c.trim());

                                collaborateursHTML = `
                                    <div class="collaborateurs-section">
                                        <p><strong>Collaborateurs:</strong></p>
                                        <div class="collaborateurs-cards">
                                            ${collabList.map(collab => {
                                                // Récupérer le LinkedIn du collaborateur depuis data.collaborateurs
                                                const collabInfo = data.collaborateurs?.[collab];
                                                const linkedinUrl = collabInfo?.linkedin;

                                                // Si le LinkedIn existe et n'est pas vide, créer un lien
                                                if (linkedinUrl && linkedinUrl !== '') {
                                                    return `
                                                        <a href="${linkedinUrl}" target="_blank" class="collaborateur-card">
                                                            ${collab}
                                                        </a>
                                                    `;
                                                } else {
                                                    // Sinon, créer juste un span non cliquable
                                                    return `
                                                        <span class="collaborateur-card collaborateur-card-no-link">
                                                            ${collab}
                                                        </span>
                                                    `;
                                                }
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }

                            // Générer les liens du projet
                            let liensHTML = '';
                            if (projet.liens && projet.liens.length > 0) {
                                liensHTML = `
                                    <div class="liens-section">
                                        <p><strong>Liens:</strong></p>
                                        <div class="liens-cards">
                                            ${projet.liens.map(lien => `
                                                <a href="${lien.url}" target="_blank" class="lien-card" data-type="${lien.icone || 'link'}">
                                                    ${lien.icone
                                                        ? `<img src="${lien.icone}" alt="${lien.nom}" class="lien-icon-img">`
                                                        : `<span class="lien-icon">${lien.nom}</span>`
                                                    }
                                                    <span class="lien-nom">${lien.nom}</span>
                                                </a>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                            }

                            // Générer les cartes de compétences
                            let competencesHTML = '';
                            if (projet.competences && projet.competences.length > 0) {
                                competencesHTML = `
                                    <div class="competences-section">
                                        <p><strong>Compétences:</strong></p>
                                        <div class="competences-cards">
                                            ${projet.competences.map(competence => `
                                                <span class="competence-card">${competence}</span>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                            }

                            projectDescription.innerHTML = `
                                <h2>${projet.nom}</h2>
                                <p>${projet.description}</p>
                                ${collaborateursHTML}
                                ${liensHTML}
                                ${competencesHTML}
                            `;
                        }
                    });

                    project.appendChild(radioPoint);

                    // create project card
                    const card = document.createElement('label');
                    card.className = 'project-onglet';
                    card.setAttribute('for', 'projectNav-'+projet.nom);
                    card.innerHTML = `<h3>${projet.nom}</h3>`;
                    card.innerHTML += `<p>${projet.description}</p>`;
                    projectsListOnglet.appendChild(card);
                });
            }

        }

        // Générer le carousel vertical des expériences
        if (data.experiences) {
            const experiencesSection = document.querySelector('#experiences');
            const placeholder = experiencesSection.querySelector('p');
            if (placeholder) placeholder.remove();

            // Convertir en tableau et trier par date de début décroissante
            const expEntries = Object.entries(data.experiences).map(([key, exp]) => ({
                key,
                ...exp,
                _endDate: parseExperienceDate(exp.fin, true),
                _startDate: parseExperienceDate(exp.debut, false)
            }));

            expEntries.sort((a, b) => {
                const startDiff = b._startDate - a._startDate;
                if (startDiff !== 0) return startDiff;
                return b._endDate - a._endDate;
            });

            // Créer le conteneur
            const container = document.createElement('div');
            container.className = 'timeline-container';

            const bar = document.createElement('div');
            bar.className = 'timeline-bar';
            container.appendChild(bar);

            const viewport = document.createElement('div');
            viewport.className = 'timeline-viewport';

            // Générer le HTML de chaque carte
            function buildCardHTML(exp) {
                let entrepriseHTML = exp.lien
                    ? `<a href="${exp.lien}" target="_blank">${exp.entreprise}</a>`
                    : exp.entreprise;

                let infoSupHTML = '';
                if (exp.infoSup) {
                    infoSupHTML = `<p class="timeline-info-sup">${exp.infoSup}</p>`;
                }

                let projetsHTML = '';
                if (exp.projets && exp.projets.length > 0) {
                    projetsHTML = `
                        <ul class="timeline-projets">
                            ${exp.projets.map(p => `<li>${p}</li>`).join('')}
                        </ul>
                    `;
                }

                return `
                    <div class="timeline-card-header">
                        <h3>${exp.poste}</h3>
                        <span class="timeline-statut">${exp.statut}</span>
                    </div>
                    <p class="timeline-entreprise">${entrepriseHTML}</p>
                    <p class="timeline-lieu">${exp.lieu}</p>
                    <p class="timeline-dates">${exp.debut} - ${exp.fin}</p>
                    ${infoSupHTML}
                    ${projetsHTML}
                `;
            }

            // Créer toutes les entrées
            expEntries.forEach(exp => {
                const entry = document.createElement('div');
                entry.className = 'timeline-entry';

                const dot = document.createElement('div');
                dot.className = 'timeline-dot';
                entry.appendChild(dot);

                const card = document.createElement('div');
                card.className = 'timeline-card';
                card.innerHTML = buildCardHTML(exp);

                entry.appendChild(card);
                viewport.appendChild(entry);
            });

            container.appendChild(viewport);
            experiencesSection.appendChild(container);

            // Index actuel (centre du carousel)
            let currentIndex = 0;

            function updateCarousel() {
                const allEntries = viewport.querySelectorAll('.timeline-entry');
                const total = allEntries.length;

                // Calculer la fenêtre de 3 éléments visibles
                let start = currentIndex - 1;
                let end = currentIndex + 1;

                // Ajuster aux bords pour toujours afficher 3
                if (start < 0) {
                    start = 0;
                    end = Math.min(2, total - 1);
                }
                if (end >= total) {
                    end = total - 1;
                    start = Math.max(0, total - 3);
                }

                allEntries.forEach((entry, i) => {
                    entry.classList.remove('timeline-active', 'timeline-adjacent', 'timeline-hidden');

                    if (i === currentIndex) {
                        entry.classList.add('timeline-active');
                    } else if (i >= start && i <= end) {
                        entry.classList.add('timeline-adjacent');
                    } else {
                        entry.classList.add('timeline-hidden');
                    }
                });
            }

            // Navigation à la roulette
            container.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY > 0 && currentIndex < expEntries.length - 1) {
                    // Scroll bas → plus ancien
                    currentIndex++;
                    updateCarousel();
                } else if (e.deltaY < 0 && currentIndex > 0) {
                    // Scroll haut → plus récent
                    currentIndex--;
                    updateCarousel();
                }
            });

            // Initialiser l'affichage
            updateCarousel();
        }

    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', loadContent);
