// management.js

document.addEventListener('DOMContentLoaded', () => {
    loadTabGroups();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }

    document.addEventListener('click', (event) => {
        document.querySelectorAll('.dropdown-menu').forEach(dropdown => {
            const hamburgerBtn = dropdown.previousElementSibling;
            const groupCard = hamburgerBtn.closest('.group-card');
            if (dropdown.style.display === 'flex' && !hamburgerBtn.contains(event.target) && !dropdown.contains(event.target)) {
                dropdown.style.display = 'none';
                // He eliminado el z-index en el groupCard para evitar conflictos
                const dropdownContainer = dropdown.closest('.dropdown-container');
                if (dropdownContainer) {
                    dropdownContainer.classList.remove('active');
                }
            }
        });
    });
});

const tabGroupsContainer = document.getElementById('tabGroupsContainer');
const noGroupsMessage = document.getElementById('noGroupsMessage');
const notificationContainer = document.getElementById('notification-container');
let allTabGroups = [];
let lastState = null;

// Modal
const mainModal = document.getElementById('main-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalInput = document.getElementById('modal-input');
const modalConfirmBtn = document.getElementById('modal-confirm');
const modalCancelBtn = document.getElementById('modal-cancel');
const modalCloseBtn = document.querySelector('.modal-close-btn');

function showNotification(message, type = 'success', withUndo = false) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);
    
    if (withUndo) {
        const undoButton = document.createElement('button');
        undoButton.className = 'undo-btn';
        undoButton.textContent = 'Deshacer';
        undoButton.onclick = async () => {
            if (lastState) {
                await chrome.storage.local.set({ tabGroups: lastState });
                allTabGroups = lastState;
                showNotification("Acción deshecha.", "success");
                performSearch();
                lastState = null; // Clear state after undo
            } else {
                showNotification("No hay nada que deshacer.", "error");
            }
            notification.classList.remove('show');
            notification.classList.add('hide');
        };
        notification.appendChild(undoButton);
    }

    notificationContainer.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.classList.add('show');
    });

    // Animate out and remove after 6 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, 6000);
}

function promptWithModal(title, message, placeholder, defaultValue = '') {
    return new Promise((resolve) => {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        modalInput.value = defaultValue;
        modalInput.placeholder = placeholder;
        modalInput.style.display = 'block';
        modalConfirmBtn.style.display = 'inline-block';
        modalCancelBtn.style.display = 'inline-block';
        mainModal.classList.add('active');
        
        const handleConfirm = () => {
            const value = modalInput.value;
            mainModal.classList.remove('active');
            resolve(value);
            cleanupListeners();
        };

        const handleCancel = () => {
            mainModal.classList.remove('active');
            resolve(null);
            cleanupListeners();
        };

        const cleanupListeners = () => {
            modalConfirmBtn.removeEventListener('click', handleConfirm);
            modalCancelBtn.removeEventListener('click', handleCancel);
            modalCloseBtn.removeEventListener('click', handleCancel);
        };

        modalConfirmBtn.addEventListener('click', handleConfirm);
        modalCancelBtn.addEventListener('click', handleCancel);
        modalCloseBtn.addEventListener('click', handleCancel);
    });
}

async function loadTabGroups() {
    try {
        const result = await chrome.storage.local.get('tabGroups');
        allTabGroups = result.tabGroups || [];
        // Sort groups once in descending order by timestamp
        allTabGroups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        displayTabGroups(allTabGroups);
    } catch (error) {
        console.error("Error al cargar los grupos de pestañas:", error);
        showNotification("Error al cargar los grupos de pestañas.", "error");
    }
}

function displayTabGroups(tabGroupsToDisplay) {
    tabGroupsContainer.innerHTML = '';

    if (tabGroupsToDisplay.length === 0) {
        noGroupsMessage.style.display = 'block';
        return;
    } else {
        noGroupsMessage.style.display = 'none';
    }

    const dropdownTemplate = document.getElementById('group-actions-template');

    tabGroupsToDisplay.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.className = 'group-card';
        groupElement.innerHTML = `
            <div class="group-header">
                <h2>${group.name}</h2>
                <div id="dropdown-placeholder-${group.id}"></div>
            </div>
            <p class="group-timestamp">Guardado el: ${group.timestamp}</p>
            
            <div class="tab-list">
                ${group.tabs.map((tab, index) => `
                    <div class="tab-list-item">
                        <a href="${tab.url}" target="_blank" title="${tab.title || tab.url}">${tab.title || tab.url}</a>
                        <div class="tab-buttons">
                            <button class="delete-tab-btn" data-group-id="${group.id}" data-tab-index="${index}">
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="M280-120q-33 0-56.5-23.5T200-200v-520q-17 0-28.5-11.5T160-760q0-17 11.5-28.5T200-800h160q0-17 11.5-28.5T400-840h160q17 0 28.5 11.5T600-800h160q17 0 28.5 11.5T800-760q0 17-11.5 28.5T760-720v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM400-280q17 0 28.5-11.5T440-320v-280q0-17-11.5-28.5T400-640q-17 0-28.5 11.5T360-600v280q0 17 11.5 28.5T400-280Zm160 0q17 0 28.5-11.5T600-320v-280q0-17-11.5-28.5T560-640q-17 0-28.5 11.5T520-600v280q0 17 11.5 28.5T560-280ZM280-720v520-520Z"/></svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
            `;
        tabGroupsContainer.appendChild(groupElement);
        const clonedDropdown = dropdownTemplate.content.cloneNode(true);
        clonedDropdown.querySelectorAll('button').forEach(btn => {
            btn.dataset.groupId = group.id;
        });
        clonedDropdown.querySelector('.dropdown-menu').id = `dropdown-menu-${group.id}`;
        groupElement.querySelector(`#dropdown-placeholder-${group.id}`).appendChild(clonedDropdown);
    });
    addEventListeners();
}

function performSearch() {
    const query = document.getElementById('search-input').value.toLowerCase();
    if (query.trim() === '') {
        displayTabGroups(allTabGroups);
        return;
    }
    const filteredGroups = allTabGroups.filter(group =>
        (group.name && group.name.toLowerCase().includes(query)) ||
        (group.timestamp && group.timestamp.toLowerCase().includes(query)) ||
        group.tabs.some(tab =>
            (tab.title && tab.title.toLowerCase().includes(query)) ||
            (tab.url && tab.url.toLowerCase().includes(query))
        )
    );
    displayTabGroups(filteredGroups);
}

function generateShareText(group) {
    let text = `Grupo de Pestañas: ${group.name}\n`;
    text += `Guardado el: ${group.timestamp}\n\n`;
    text += `Pestañas:\n`;
    group.tabs.forEach((tab, index) => {
        text += `${index + 1}. ${tab.title || tab.url}\n${tab.url}\n\n`;
    });
    return text;
}

function shareViaWhatsApp(group) {
    const shareText = encodeURIComponent(generateShareText(group));
    chrome.tabs.create({ url: `https://wa.me/?text=${shareText}` });
}

function shareViaTelegram(group) {
    const shareText = encodeURIComponent(generateShareText(group));
    chrome.tabs.create({ url: `https://t.me/share/url?text=${shareText}` });
}

function shareViaEmail(group) {
    const subject = encodeURIComponent(`Grupo de Pestañas: ${group.name}`);
    const body = encodeURIComponent(generateShareText(group));
    chrome.tabs.create({ url: `mailto:?subject=${subject}&body=${body}` });
}

function addEventListeners() {
    document.querySelectorAll('.hamburger-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            const groupId = event.currentTarget.dataset.groupId;
            const dropdownMenu = document.getElementById(`dropdown-menu-${groupId}`);
            const dropdownContainer = event.currentTarget.closest('.dropdown-container');
            
            // Cerrar otros menús y desactivar su clase 'active'
            document.querySelectorAll('.dropdown-container').forEach(otherContainer => {
                if (otherContainer !== dropdownContainer) {
                    otherContainer.classList.remove('active');
                    const otherMenu = otherContainer.querySelector('.dropdown-menu');
                    if (otherMenu) {
                        otherMenu.style.display = 'none';
                    }
                }
            });
            
            // Alternar el menú actual y su clase 'active'
            const isMenuVisible = dropdownMenu.style.display === 'flex';
            dropdownMenu.style.display = isMenuVisible ? 'none' : 'flex';
            
            if (dropdownContainer) {
                if (isMenuVisible) {
                    dropdownContainer.classList.remove('active');
                } else {
                    dropdownContainer.classList.add('active');
                }
            }
        });
    });

    document.querySelectorAll('.rename-group-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const groupId = event.currentTarget.dataset.groupId;
            const group = allTabGroups.find(g => g.id === groupId);
            if (!group) return;

            const newName = await promptWithModal("Renombrar grupo", "Introduce el nuevo nombre para el grupo:", "Nuevo nombre...", group.name);

            if (newName && newName.trim() !== "" && newName !== group.name) {
                lastState = JSON.parse(JSON.stringify(allTabGroups)); // Save current state
                group.name = newName.trim();
                await chrome.storage.local.set({ tabGroups: allTabGroups });
                showNotification(`Grupo renombrado a "${group.name}".`, "success", true); // Add Undo button
                performSearch();
            } else if (newName !== null) {
                showNotification("El nombre no ha cambiado o es inválido.", "error");
            }
        });
    });
    
    document.querySelectorAll('.add-current-tab-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const groupId = event.currentTarget.dataset.groupId;
            const group = allTabGroups.find(g => g.id === groupId);
            if (!group) return;

            const newUrl = await promptWithModal("Añadir nueva pestaña", "Introduce la URL de la página que quieres añadir:", "https://ejemplo.com");
            
            if (!newUrl) {
                showNotification("Operación cancelada.", "error");
                return;
            }

            try {
                lastState = JSON.parse(JSON.stringify(allTabGroups)); // Save current state
                const url = new URL(newUrl);
                const newTab = {
                    title: `Página añadida: ${url.hostname}`,
                    url: url.href
                };

                group.tabs.push(newTab);
                await chrome.storage.local.set({ tabGroups: allTabGroups });
                showNotification(`Pestaña añadida a "${group.name}".`, "success", true); // Add Undo button
                performSearch();
            } catch(e) {
                showNotification("La URL introducida no es válida.", "error");
            }
        });
    });

    document.querySelectorAll('.open-all-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const groupId = event.currentTarget.dataset.groupId;
            const group = allTabGroups.find(g => g.id === groupId);
            if (group) {
                chrome.windows.create({ url: group.tabs.map(tab => tab.url) });
            }
        });
    });
    
    document.querySelectorAll('.open-current-window-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const groupId = event.currentTarget.dataset.groupId;
            const group = allTabGroups.find(g => g.id === groupId);
            if (group) {
                group.tabs.forEach(tab => chrome.tabs.create({ url: tab.url, active: false }));
            }
        });
    });

    document.querySelectorAll('.delete-group-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            const groupId = event.currentTarget.dataset.groupId;
            const groupName = allTabGroups.find(g => g.id === groupId)?.name || 'desconocido';

            lastState = JSON.parse(JSON.stringify(allTabGroups)); // Save current state
            allTabGroups = allTabGroups.filter(group => group.id !== groupId);
            await chrome.storage.local.set({ tabGroups: allTabGroups });
            showNotification(`Grupo "${groupName}" eliminado.`, "success", true); // Add Undo button
            performSearch();
        });
    });

    document.querySelectorAll('.delete-tab-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
            event.stopPropagation();
            const groupId = event.currentTarget.dataset.groupId;
            const tabIndex = parseInt(event.currentTarget.dataset.tabIndex);
            const groupIndex = allTabGroups.findIndex(g => g.id === groupId);

            if (groupIndex !== -1 && allTabGroups[groupIndex].tabs[tabIndex]) {
                lastState = JSON.parse(JSON.stringify(allTabGroups)); // Save current state
                const tabTitle = allTabGroups[groupIndex].tabs[tabIndex].title;
                allTabGroups[groupIndex].tabs.splice(tabIndex, 1);

                if (allTabGroups[groupIndex].tabs.length === 0) {
                    const groupName = allTabGroups[groupIndex].name;
                    allTabGroups.splice(groupIndex, 1);
                    showNotification(`Pestaña eliminada. El grupo "${groupName}" quedó vacío y fue eliminado.`, "success", true); // Add Undo button
                } else {
                    showNotification(`Pestaña "${tabTitle}" eliminada.`, "success", true); // Add Undo button
                }

                await chrome.storage.local.set({ tabGroups: allTabGroups });
                performSearch();
            } else {
                showNotification("No se pudo eliminar la pestaña.", "error");
            }
        });
    });

    document.querySelectorAll('.share-whatsapp-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const groupId = event.currentTarget.dataset.groupId;
            const group = allTabGroups.find(g => g.id === groupId);
            if (group) shareViaWhatsApp(group);
        });
    });

    document.querySelectorAll('.share-telegram-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const groupId = event.currentTarget.dataset.groupId;
            const group = allTabGroups.find(g => g.id === groupId);
            if (group) shareViaTelegram(group);
        });
    });

    document.querySelectorAll('.share-email-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const groupId = event.currentTarget.dataset.groupId;
            const group = allTabGroups.find(g => g.id === groupId);
            if (group) shareViaEmail(group);
        });
    });
}