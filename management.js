// management.js

document.addEventListener('DOMContentLoaded', () => {
    loadTabGroups(); // Load groups initially
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }
});

const tabGroupsContainer = document.getElementById('tabGroupsContainer');
const noGroupsMessage = document.getElementById('noGroupsMessage');
const messageBox = document.getElementById('message-box');
const messageText = document.getElementById('message-text');
const closeMessageBtn = document.querySelector('#message-box .close-message-btn'); // Select the close button within message-box

// Store all tab groups loaded from storage
let allTabGroups = [];

// Function to show messages to the user
function showMessage(message, type = 'success') {
    messageText.textContent = message;
    messageBox.style.display = 'block'; // Show message box
    if (type === 'success') {
        messageBox.classList.remove('error'); // Remove error class if present
        messageBox.style.backgroundColor = '#d1fae5'; // bg-green-100
        messageBox.style.borderColor = '#34d399'; // border-green-400
        messageBox.style.color = '#065f46'; // text-green-700
        messageBox.querySelector('svg').style.color = '#10b981'; // text-green-500 for SVG
    } else if (type === 'error') {
        messageBox.classList.add('error'); // Add error class
        messageBox.style.backgroundColor = '#fee2e2'; // bg-red-100
        messageBox.style.borderColor = '#ef4444'; // border-red-400
        messageBox.style.color = '#b91c1c'; // text-red-700
        messageBox.querySelector('svg').style.color = '#dc2626'; // text-red-500 for SVG
    }
    setTimeout(() => {
        messageBox.style.display = 'none'; // Hide message after 3 seconds
    }, 3000);
}

// Event listener for closing the message box
if (closeMessageBtn) {
    closeMessageBtn.addEventListener('click', () => {
        messageBox.style.display = 'none';
    });
}

// Function to load and display tab groups
async function loadTabGroups() {
    try {
        const result = await chrome.storage.local.get('tabGroups');
        allTabGroups = result.tabGroups || []; // Store all groups
        displayTabGroups(allTabGroups); // Display all groups initially
    } catch (error) {
        console.error("Error al cargar los grupos de pestañas:", error);
        showMessage("Error al cargar los grupos de pestañas.","error");
    }
}

// Function to display tab groups (can be filtered)
function displayTabGroups(tabGroupsToDisplay) {
    tabGroupsContainer.innerHTML = ''; // Clear previous content

    if (tabGroupsToDisplay.length === 0) {
        noGroupsMessage.style.display = 'block'; // Show no groups message
        return;
    } else {
        noGroupsMessage.style.display = 'none'; // Hide no groups message
    }

    tabGroupsToDisplay.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.className = 'group-card'; // Custom class for group card
        groupElement.innerHTML = `
            <div class="group-header">
                <h2>${group.name}</h2>
                <div class="group-buttons">
                    <button class="open-all-btn" data-group-id="${group.id}">
                        Abrir Todas
                    </button>
                    <button class="delete-group-btn" data-group-id="${group.id}">
                        Eliminar Grupo
                    </button>
                </div>
            </div>
            <p class="group-timestamp">Guardado el: ${group.timestamp}</p>
            <div class="tab-list">
                ${group.tabs.map((tab, index) => `
                    <div class="tab-list-item">
                        <a href="${tab.url}" target="_blank" title="${tab.title || tab.url}">${tab.title || tab.url}</a>
                        <div class="tab-buttons">
                            <button class="open-tab-btn" data-group-id="${group.id}" data-tab-index="${index}">
                                Abrir
                            </button>
                            <button class="delete-tab-btn" data-group-id="${group.id}" data-tab-index="${index}">
                                Eliminar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        tabGroupsContainer.appendChild(groupElement);
    });

    // Add event listeners after elements are created
    addEventListeners();
}

// Function to perform search
function performSearch() {
    const query = document.getElementById('search-input').value.toLowerCase();

    if (query.trim() === '') {
        displayTabGroups(allTabGroups); // If query is empty, show all groups
        return;
    }

    const filteredGroups = allTabGroups.filter(group => {
        // Check if group name matches
        if (group.name.toLowerCase().includes(query)) {
            return true;
        }

        // Check if any tab title or URL within the group matches
        return group.tabs.some(tab =>
            (tab.title && tab.title.toLowerCase().includes(query)) ||
            (tab.url && tab.url.toLowerCase().includes(query))
        );
    });

    displayTabGroups(filteredGroups);
}


// Function to add event listeners to dynamically created buttons
function addEventListeners() {
    // Open all tabs in a group
    document.querySelectorAll('.open-all-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const groupId = event.target.dataset.groupId;
            const groupToOpen = allTabGroups.find(group => group.id === groupId);

            if (groupToOpen) {
                // Open tabs in a new window
                chrome.windows.create({ url: groupToOpen.tabs.map(tab => tab.url) });
                showMessage(`Abriendo todas las pestañas del grupo "${groupToOpen.name}".`);
            } else {
                showMessage("Grupo de pestañas no encontrado.", "error");
            }
        });
    });

    // Delete an entire group
    document.querySelectorAll('.delete-group-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const groupId = event.target.dataset.groupId;

            const groupToDelete = allTabGroups.find(group => group.id === groupId);
            if (!groupToDelete) {
                showMessage("Grupo de pestañas no encontrado.", "error");
                return;
            }

            // Filter out the group to be deleted from allTabGroups
            allTabGroups = allTabGroups.filter(group => group.id !== groupId);
            await chrome.storage.local.set({ tabGroups: allTabGroups });
            showMessage(`Grupo "${groupToDelete.name}" eliminado con éxito.`);
            performSearch(); // Re-run search to update the displayed list
        });
    });

    // Open a single tab
    document.querySelectorAll('.open-tab-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const groupId = event.target.dataset.groupId;
            const tabIndex = parseInt(event.target.dataset.tabIndex);

            const group = allTabGroups.find(g => g.id === groupId);

            if (group && group.tabs[tabIndex]) {
                chrome.tabs.create({ url: group.tabs[tabIndex].url });
                showMessage(`Abriendo pestaña: "${group.tabs[tabIndex].title || group.tabs[tabIndex].url}".`);
            } else {
                showMessage("Pestaña no encontrada.", "error");
            }
        });
    });

    // Delete a single tab from a group
    document.querySelectorAll('.delete-tab-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const groupId = event.target.dataset.groupId;
            const tabIndex = parseInt(event.target.dataset.tabIndex);

            const groupIndex = allTabGroups.findIndex(g => g.id === groupId);

            if (groupIndex !== -1 && allTabGroups[groupIndex].tabs[tabIndex]) {
                const tabTitle = allTabGroups[groupIndex].tabs[tabIndex].title || allTabGroups[groupIndex].tabs[tabIndex].url;
                allTabGroups[groupIndex].tabs.splice(tabIndex, 1); // Remove the tab

                // If the group becomes empty, remove the group itself
                if (allTabGroups[groupIndex].tabs.length === 0) {
                    allTabGroups.splice(groupIndex, 1);
                    showMessage(`Pestaña "${tabTitle}" eliminada. El grupo ahora está vacío y ha sido eliminado.`);
                } else {
                    showMessage(`Pestaña "${tabTitle}" eliminada del grupo.`);
                }

                await chrome.storage.local.set({ tabGroups: allTabGroups });
                performSearch(); // Re-run search to update the displayed list
            } else {
                showMessage("Pestaña o grupo no encontrado.", "error");
            }
        });
    });
}
