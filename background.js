// background.js
// This script is optional for this simple extension, but good practice for future features.
// It runs in the background and can listen for events or perform tasks even when the popup is closed.

// Example: Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('TabStacker extension installed.');
    // You could set initial storage values or perform other setup here.
});

// No specific functionality required in background.js for the current requirements,
// as all operations are user-initiated from the popup or management page.
