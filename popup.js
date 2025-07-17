// popup.js

document.addEventListener('DOMContentLoaded', () => {
    const saveTabsBtn = document.getElementById('saveTabsBtn');
    const manageTabsBtn = document.getElementById('manageTabsBtn');
    const messageBox = document.getElementById('message-box');
    const messageText = document.getElementById('message-text');

    // Function to show messages to the user
    function showMessage(message, type = 'success') {
        messageText.textContent = message;
        messageBox.classList.remove('hidden');
        if (type === 'success') {
            messageBox.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
            messageBox.classList.add('bg-green-100', 'border-green-400', 'text-green-700');
        } else if (type === 'error') {
            messageBox.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
            messageBox.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
        }
        setTimeout(() => {
            messageBox.classList.add('hidden');
        }, 3000); // Hide message after 3 seconds
    }

    // Event listener for saving tabs
    saveTabsBtn.addEventListener('click', async () => {
        const groupName = prompt("Introduce un nombre para este grupo de pestañas:");

        if (groupName === null || groupName.trim() === '') {
            showMessage("Nombre de grupo no válido. Las pestañas no se guardaron.", "error");
            return;
        }

        try {
            // Get all tabs in the current window
            const tabs = await chrome.tabs.query({ currentWindow: true });
            const tabUrls = tabs.map(tab => ({ url: tab.url, title: tab.title }));

            // Retrieve existing tab groups
            const result = await chrome.storage.local.get('tabGroups');
            const tabGroups = result.tabGroups || [];

            // Add the new group
            tabGroups.push({
                id: Date.now().toString(), // Unique ID for the group
                name: groupName.trim(),
                tabs: tabUrls,
                timestamp: new Date().toLocaleString()
            });

            // Save updated tab groups
            await chrome.storage.local.set({ tabGroups: tabGroups });
            showMessage(`Grupo "${groupName.trim()}" guardado con éxito.`);
        } catch (error) {
            console.error("Error al guardar las pestañas:", error);
            showMessage("Error al guardar las pestañas. Inténtalo de nuevo.", "error");
        }
    });

    // Event listener for opening the management page
    manageTabsBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'management.html' });
    });
});
