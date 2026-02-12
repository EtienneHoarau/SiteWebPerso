// Script uniquement pour le chargement des données JSON

// Fonction pour accéder à une propriété imbriquée via une chaîne "a.b.c"
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
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
                Object.values(data.projets).forEach(projet => {
                    const card = document.createElement('div');
                    card.className = 'project-onglet';
                    card.innerHTML = `<h3>${projet.nom}</h3>`;
                    card.innerHTML += `<p>${projet.description}</p>`;
                    projectsListOnglet.appendChild(card);
                });
            }

        }

    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
    }
}

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', loadContent);
