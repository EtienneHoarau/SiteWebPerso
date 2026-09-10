const SUPABASE_URL = "https://zrmqjigijvowczychcud.supabase.co";
const SUPABASE_KEY = "sb_publishable_-3c7PHAuezwlOSgv-sa0vA_L7Hho4F6";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let myInfo = null;
let myPpURL = null;

function getNestedValue(obj, path) {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

function cleanUrl(value) {
  if (typeof value !== "string" || !value.trim()) {
    return value;
  }

  const trimmed = value.trim();

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("mailto:")
  ) {
    return trimmed;
  }

  const markdownMatch = trimmed.match(
    /^\[.*?\]\((https?:\/\/[^\s)]+)(?:\s+["'][^"']*["'])?\)$/,
  );

  if (markdownMatch) {
    return markdownMatch[1];
  }

  return trimmed;
}

function buildLinkUrl(value) {
  const cleaned = cleanUrl(value);

  if (!cleaned) {
    return "";
  }

  if (cleaned.startsWith("mailto:")) {
    return cleaned;
  }

  if (
    cleaned.includes("@") &&
    !cleaned.startsWith("http://") &&
    !cleaned.startsWith("https://")
  ) {
    return "mailto:" + cleaned;
  }

  return cleaned;
}

async function getProjects() {
  console.log("Appel de get_projects()...");

  const { data, error } = await supabaseClient.rpc("get_projects");

  console.log("Supabase data (projects) :", data);
  console.log("Supabase error (projects) :", error);

  if (error) {
    throw error;
  }

  return data || [];
}

async function getCompetences() {
  console.log("Appel de getCompetences()...");

  const { data, error } = await supabaseClient
    .from("competences")
    .select("id, name")
    .order("name");

  console.log("Supabase data (competences) :", data);
  console.log("Supabase error (competences) :", error);

  if (error) {
    throw error;
  }

  return data || [];
}

function parseExperienceDate(dateStr, isEnd = true) {
  const frenchMonths = {
    janvier: 0,
    février: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    août: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    décembre: 11,
  };

  const trimmed = dateStr.trim();

  if (/^\d{4}$/.test(trimmed)) {
    const year = parseInt(trimmed);
    return isEnd ? new Date(year, 11, 31) : new Date(year, 0, 1);
  }

  const parts = trimmed.split(" ");

  if (parts.length === 2) {
    const month = frenchMonths[parts[0].toLowerCase()];
    const year = parseInt(parts[1]);

    if (month !== undefined && !isNaN(year)) {
      return new Date(year, month, 1);
    }
  }

  return new Date(0);
}

async function loadMe() {
  try {
    console.log("Appel de get_me()...");

    const { data, error } = await supabaseClient.rpc("get_me");

    console.log("Supabase data (me) :", data);
    console.log("Supabase error (me) :", error);

    if (error) {
      throw error;
    }

    if (!data) {
      console.error("Aucune donnée de profil reçue.");
      return;
    }

    myInfo = data;

    console.log("Profil :", myInfo);

    document.querySelectorAll("[data-profile]").forEach((element) => {
      const property = element.getAttribute("data-profile");
      let value = myInfo[property];

      if (value === undefined || value === null) {
        return;
      }

      if (property === "photo_url") {
        value = cleanUrl(value);
      }

      if (element.tagName === "IMG") {
        element.src = value;
      } else {
        element.textContent = value;
      }
    });

    const contactContainer = document.getElementById("contact-links");

    if (contactContainer) {
      contactContainer.innerHTML = "";

      if (Array.isArray(myInfo.links)) {
        myInfo.links.forEach((link) => {
          if (!link || !link.url || !link.icon) {
            return;
          }

          const url = buildLinkUrl(link.url);
          const icon = cleanUrl(link.icon);

          if (!url || !icon) {
            return;
          }

          const a = document.createElement("a");
          const img = document.createElement("img");

          a.href = url;
          a.target = "_blank";
          a.rel = "noopener noreferrer";

          img.src = icon;
          img.alt = link.name || "Lien";

          a.appendChild(img);
          contactContainer.appendChild(a);
        });
      }
    }

    myPpURL = cleanUrl(myInfo.photo_url);

    console.log("Photo de profil :", myPpURL);
  } catch (error) {
    console.error("Erreur lors du chargement du profil :", error);
  }
}

async function loadContent() {
  try {
    const response = await fetch("data/content.json");
    const data = await response.json();

    document.querySelectorAll("[data-content]").forEach((element) => {
      const path = element.getAttribute("data-content");
      const value = getNestedValue(data, path);

      if (value) {
        element.textContent = value;
      }
    });

    document.querySelectorAll("[data-src]").forEach((element) => {
      const path = element.getAttribute("data-src");
      const value = getNestedValue(data, path);

      if (value) {
        element.src = value;
      }
    });

    document.querySelectorAll("[data-href]").forEach((element) => {
      const path = element.getAttribute("data-href");
      const prefix = element.getAttribute("data-href-prefix") || "";

      const value = getNestedValue(data, path);

      if (value) {
        element.href = prefix + value;
      }
    });

    if (data.site?.title) {
      document.title = data.site.title;
    }

    if (data.experiences) {
      const experiencesSection = document.querySelector("#experiences");

      if (!experiencesSection) {
        return;
      }

      const placeholder = experiencesSection.querySelector("p");

      if (placeholder) {
        placeholder.remove();
      }

      const expEntries = Object.entries(data.experiences).map(([key, exp]) => ({
        key,
        ...exp,
        _endDate: parseExperienceDate(exp.fin, true),
        _startDate: parseExperienceDate(exp.debut, false),
      }));

      expEntries.sort((a, b) => {
        const startDiff = b._startDate - a._startDate;

        if (startDiff !== 0) {
          return startDiff;
        }

        return b._endDate - a._endDate;
      });

      const container = document.createElement("div");

      container.className = "timeline-container";

      const bar = document.createElement("div");

      bar.className = "timeline-bar";

      container.appendChild(bar);

      const viewport = document.createElement("div");

      viewport.className = "timeline-viewport";

      function buildCardHTML(exp) {
        const entrepriseHTML = exp.lien
          ? `<a href="${exp.lien}" target="_blank" rel="noopener noreferrer">${exp.entreprise}</a>`
          : exp.entreprise;

        let infoSupHTML = "";

        if (exp.infoSup) {
          infoSupHTML = `
            <p class="timeline-info-sup">
              ${exp.infoSup}
            </p>
          `;
        }

        let projetsHTML = "";

        if (exp.projets && exp.projets.length > 0) {
          projetsHTML = `
            <ul class="timeline-projets">
              ${exp.projets.map((p) => `<li>${p}</li>`).join("")}
            </ul>
          `;
        }

        return `
          <div class="timeline-card-header">
            <h3>${exp.poste}</h3>
            <span class="timeline-statut">
              ${exp.statut}
            </span>
          </div>

          <p class="timeline-entreprise">
            ${entrepriseHTML}
          </p>

          <p class="timeline-lieu">
            ${exp.lieu}
          </p>

          <p class="timeline-dates">
            ${exp.debut} - ${exp.fin}
          </p>

          ${infoSupHTML}

          ${projetsHTML}
        `;
      }

      expEntries.forEach((exp, i) => {
        const entry = document.createElement("div");

        entry.className = "timeline-entry";

        const dot = document.createElement("div");

        dot.className = "timeline-dot";

        entry.appendChild(dot);

        const card = document.createElement("div");

        card.className = "timeline-card";

        card.innerHTML = buildCardHTML(exp);

        entry.addEventListener("click", () => {
          currentIndex = i;
          updateCarousel();
        });

        entry.appendChild(card);
        viewport.appendChild(entry);
      });

      container.appendChild(viewport);
      experiencesSection.appendChild(container);

      let currentIndex = 0;

      function updateCarousel() {
        const allEntries = viewport.querySelectorAll(".timeline-entry");

        const total = allEntries.length;

        let start = currentIndex - 1;

        let end = currentIndex + 1;

        if (start < 0) {
          start = 0;
          end = Math.min(2, total - 1);
        }

        if (end >= total) {
          end = total - 1;

          start = Math.max(0, total - 3);
        }

        allEntries.forEach((entry, i) => {
          entry.classList.remove(
            "timeline-active",
            "timeline-adjacent",
            "timeline-hidden",
          );

          if (i === currentIndex) {
            entry.classList.add("timeline-active");
          } else if (i >= start && i <= end) {
            entry.classList.add("timeline-adjacent");
          } else {
            entry.classList.add("timeline-hidden");
          }
        });
      }

      container.addEventListener("wheel", (e) => {
        e.preventDefault();

        if (e.deltaY > 0 && currentIndex < expEntries.length - 1) {
          currentIndex++;
          updateCarousel();
        } else if (e.deltaY < 0 && currentIndex > 0) {
          currentIndex--;
          updateCarousel();
        }
      });

      window.navigateExperiences = (direction) => {
        if (direction === "up" && currentIndex > 0) {
          currentIndex--;
          updateCarousel();
        } else if (
          direction === "down" &&
          currentIndex < expEntries.length - 1
        ) {
          currentIndex++;
          updateCarousel();
        }
      };

      updateCarousel();
    }
  } catch (error) {
    console.error("Erreur lors du chargement des données :", error);
  }
}

async function loadProjects() {
  let projets = [];
  let competences = [];

  try {
    [projets, competences] = await Promise.all([
      getProjects(),
      getCompetences(),
    ]);
  } catch (error) {
    console.error(
      "Erreur lors du chargement des projets/compétences depuis Supabase :",
      error,
    );

    return;
  }

  let filterList = [];

  const filterButton = document.querySelector(".filter-button");
  const filterOptions = document.querySelector(".filter-options");

  if (filterButton && filterOptions) {
    filterButton.addEventListener("click", () => {
      const isOpen = filterOptions.classList.toggle("is-open");

      filterOptions.setAttribute("aria-hidden", String(!isOpen));
    });
  }

  const updateProjectVisibility = () => {
    document.querySelectorAll(".project-onglet").forEach((onglet) => {
      const radio = document.getElementById(onglet.getAttribute("for"));

      const projectId = radio?.id?.replace("projectNav-", "") || "";

      const projet = projets.find((p) => String(p.id) === projectId);

      if (!projet) {
        onglet.style.display = "none";
        return;
      }

      const competenceIds = (projet.competences || []).map((c) =>
        String(c.id),
      );

      const matchesFilters =
        filterList.length === 0 ||
        filterList.some((selectedId) =>
          competenceIds.includes(selectedId),
        );

      onglet.style.display = matchesFilters ? "block" : "none";
    });
  };

  document.querySelectorAll(".filter-options").forEach((filterContainer) => {
    competences.forEach((competence) => {
      const competenceId = String(competence.id);

      const button = document.createElement("button");

      button.className = "filter-option";
      button.textContent = competence.name;
      button.dataset.competenceId = competenceId;
      button.style.backgroundColor = "#3498db";

      let isSelected = false;

      button.addEventListener("click", () => {
        filterList = filterList.includes(competenceId)
          ? filterList.filter((id) => id !== competenceId)
          : [...filterList, competenceId];

        isSelected = !isSelected;

        button.style.backgroundColor = isSelected
          ? "#BE1818"
          : "#3498db";

        updateProjectVisibility();

        console.log("Filtres sélectionnés (ids) :", filterList);
      });

      filterContainer.appendChild(button);
    });
  });

  const projectList = document.querySelector(".project-list");
  const projectsListOnglet = document.querySelector(".projects-list");

  const card = false;

  if (projectList && card) {
    projets.forEach((projet) => {
      const projectCard = document.createElement("div");

      projectCard.className = "project-card";

      projectCard.innerHTML = `<h3>${projet.name}</h3>`;

      projectCard.innerHTML += `<p>${projet.description}</p>`;

      projectList.appendChild(projectCard);
    });
  }

  if (projectsListOnglet && !card) {
    const projectDescription = document.querySelector(".project-description");

    projets.forEach((projet) => {
      const radioPoint = document.createElement("input");

      radioPoint.type = "radio";
      radioPoint.name = "projectNav";
      radioPoint.className = "nav-project-radio";
      radioPoint.id = "projectNav-" + projet.id;

      radioPoint.addEventListener("change", () => {
        if (!radioPoint.checked || !projectDescription) {
          return;
        }

        let collaborateursHTML = "";

        if (projet.collaborators && projet.collaborators.length > 0) {
          collaborateursHTML = `
            <div class="collaborateurs-section">
              <p>
                <strong>
                  Collaborateurs:
                </strong>
              </p>

              <div class="collaborateurs-cards">
                ${projet.collaborators
                  .map((collab) => {
                    if (collab.links && collab.links.length > 0) {
                      const url = buildLinkUrl(collab.links[0].url);

                      return `
                        <a
                          href="${url}"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="collaborateur-card"
                        >
                          ${collab.name}
                        </a>
                      `;
                    }

                    return `
                      <span
                        class="collaborateur-card collaborateur-card-no-link"
                      >
                        ${collab.name}
                      </span>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        }

        let liensHTML = "";

        if (projet.links && projet.links.length > 0) {
          liensHTML = `
            <div class="liens-section">
              <p>
                <strong>
                  Liens:
                </strong>
              </p>

              <div class="liens-cards">
                ${projet.links
                  .map((lien) => {
                    const url = buildLinkUrl(lien.url);
                    const icon = lien.icon
                      ? cleanUrl(lien.icon)
                      : null;

                    return `
                      <a
                        href="${url}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="lien-card"
                        data-type="${icon ? "image" : "link"}"
                      >
                        ${
                          icon
                            ? `
                              <span class="lien-icon">
                                <img
                                  src="${icon}"
                                  alt="${lien.name || "Lien"}"
                                  class="lien-icon-img"
                                >
                              </span>
                            `
                            : ""
                        }

                        <span class="lien-nom">
                          ${lien.name || "Lien"}
                        </span>
                      </a>
                    `;
                  })
                  .join("")}
              </div>
            </div>
          `;
        }

        let competencesHTML = "";

        if (projet.competences && projet.competences.length > 0) {
          competencesHTML = `
            <div class="competences-section">
              <p>
                <strong>
                  Compétences:
                </strong>
              </p>

              <div class="competences-cards">
                ${projet.competences
                  .map(
                    (competence) => `
                      <span class="competence-card">
                        ${competence.name}
                      </span>
                    `,
                  )
                  .join("")}
              </div>
            </div>
          `;
        }

        projectDescription.innerHTML = `
          <h2>
            ${projet.name}
          </h2>

          <p>
            ${projet.description}
          </p>

          ${collaborateursHTML}

          ${liensHTML}

          ${competencesHTML}
        `;
      });

      const projectCard = document.createElement("label");

      projectCard.className = "project-onglet";

      projectCard.setAttribute(
        "for",
        "projectNav-" + projet.id,
      );

      const description = projet.description
        ? `${projet.description.substring(0, 50)}${
            projet.description.length > 20 ? "..." : ""
          }`
        : "";

      projectCard.innerHTML = `
        <h3>
          ${projet.name}
        </h3>

        <p>
          ${description}
        </p>
      `;

      projectCard.style.display = "block";

      projectsListOnglet.appendChild(radioPoint);
      projectsListOnglet.appendChild(projectCard);
    });

    updateProjectVisibility();
  }
}

const connectedGamepads = {};

let previousButtonStates = {};

let pollingActive = false;

function showGamepadButtons() {
  const gamepadButtons = document.querySelectorAll(".gamepad_btn");

  gamepadButtons.forEach((btn) => {
    btn.style.display = "flex";
  });
}

function hideGamepadButtons() {
  const gamepadButtons = document.querySelectorAll(".gamepad_btn");

  gamepadButtons.forEach((btn) => {
    btn.style.display = "none";
  });
}

function navigateCarousel(direction) {
  const navRadios = ["nav-accueil", "nav-experiences", "nav-projets"];

  let currentIndex = navRadios.findIndex(
    (id) => document.getElementById(id).checked,
  );

  if (currentIndex === -1) {
    currentIndex = 0;
  }

  let newIndex;

  if (direction === "left") {
    newIndex = currentIndex > 0 ? currentIndex - 1 : navRadios.length - 1;
  } else {
    newIndex = currentIndex < navRadios.length - 1 ? currentIndex + 1 : 0;
  }

  const radioElement = document.getElementById(navRadios[newIndex]);

  radioElement.checked = true;

  const label = document.querySelector(`label[for="${navRadios[newIndex]}"]`);

  if (label) {
    label.focus();
  }
}

function navigateProjects(direction) {
  const projectRadios = document.querySelectorAll('input[name="projectNav"]');

  if (projectRadios.length === 0) {
    return;
  }

  let currentIndex = -1;

  projectRadios.forEach((radio, index) => {
    if (radio.checked) {
      currentIndex = index;
    }
  });

  if (currentIndex === -1) {
    projectRadios[0].checked = true;

    projectRadios[0].dispatchEvent(new Event("change"));

    return;
  }

  let newIndex;

  if (direction === "up") {
    newIndex = currentIndex > 0 ? currentIndex - 1 : projectRadios.length - 1;
  } else {
    newIndex = currentIndex < projectRadios.length - 1 ? currentIndex + 1 : 0;
  }

  projectRadios[newIndex].checked = true;

  projectRadios[newIndex].dispatchEvent(new Event("change"));

  const label = document.querySelector(
    `label[for="${projectRadios[newIndex].id}"]`,
  );

  if (label) {
    label.focus();
  }
}

function pollGamepad() {
  const gamepads = navigator.getGamepads();

  for (let i = 0; i < gamepads.length; i++) {
    const gamepad = gamepads[i];

    if (gamepad && connectedGamepads[gamepad.index]) {
      if (!previousButtonStates[gamepad.index]) {
        previousButtonStates[gamepad.index] = [];
      }

      gamepad.buttons.forEach((button, buttonIndex) => {
        const wasPressed =
          previousButtonStates[gamepad.index][buttonIndex] || false;

        const isPressed = button.pressed;

        if (isPressed && !wasPressed) {
          console.log(`Bouton ${buttonIndex} pressé`);

          if (buttonIndex === 4 || buttonIndex === 6) {
            navigateCarousel("left");
          } else if (buttonIndex === 5 || buttonIndex === 7) {
            navigateCarousel("right");
          } else if (
            buttonIndex === 12 &&
            document.getElementById("nav-projets").checked
          ) {
            navigateProjects("up");
          } else if (
            buttonIndex === 13 &&
            document.getElementById("nav-projets").checked
          ) {
            navigateProjects("down");
          } else if (
            buttonIndex === 12 &&
            document.getElementById("nav-experiences").checked &&
            window.navigateExperiences
          ) {
            window.navigateExperiences("up");
          } else if (
            buttonIndex === 13 &&
            document.getElementById("nav-experiences").checked &&
            window.navigateExperiences
          ) {
            window.navigateExperiences("down");
          }
        }

        previousButtonStates[gamepad.index][buttonIndex] = isPressed;
      });
    }
  }

  if (Object.keys(connectedGamepads).length > 0) {
    requestAnimationFrame(pollGamepad);
  } else {
    pollingActive = false;
  }
}

function connectGamepad(event) {
  const gamepad = event.gamepad;

  connectedGamepads[gamepad.index] = gamepad;

  showGamepadButtons();

  if (!pollingActive) {
    pollingActive = true;

    requestAnimationFrame(pollGamepad);
  }
}

function disconnectGamepad(event) {
  const gamepad = event.gamepad;

  delete connectedGamepads[gamepad.index];

  delete previousButtonStates[gamepad.index];

  if (Object.keys(connectedGamepads).length === 0) {
    hideGamepadButtons();
  }
}

function checkGamepadOnLoad() {
  if (!navigator.getGamepads) {
    return;
  }

  const gamepads = navigator.getGamepads();

  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i] !== null) {
      connectedGamepads[i] = gamepads[i];
    }
  }

  if (Object.keys(connectedGamepads).length > 0) {
    showGamepadButtons();

    if (!pollingActive) {
      pollingActive = true;

      requestAnimationFrame(pollGamepad);
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadMe();
  await loadContent();
  await loadProjects();

  checkGamepadOnLoad();
});

window.addEventListener("gamepadconnected", connectGamepad);

window.addEventListener("gamepaddisconnected", disconnectGamepad);
