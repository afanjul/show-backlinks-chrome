document.getElementById('saveOptions').addEventListener('click', () => {
    const highlightLinks = document.getElementById('highlightLinks').checked;
    const checkLinkStatus = document.getElementById('checkLinkStatus').checked;

    chrome.storage.sync.set({highlightLinks, checkLinkStatus}, () => {
        console.log('Options saved.');
    });
});

// Load saved options
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['highlightLinks', 'checkLinkStatus'], (options) => {
        document.getElementById('highlightLinks').checked = options.highlightLinks;
        document.getElementById('checkLinkStatus').checked = options.checkLinkStatus;
    });
});
