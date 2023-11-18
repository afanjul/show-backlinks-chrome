$(function () {
    let currentTabId = 0;


    async function setCurrentTabId() {
        let tabs = await chrome.tabs.query({active: true, currentWindow: true});
        currentTabId = tabs[0].id;
    }

    async function initializePopup() {
        debugger;
        bindEventListeners();
        await setCurrentTabId();
        injectContentScripts().then(() => {
            analyzeCurrentTab()});
    }

    function bindEventListeners() {
        $('#copyCSV').on('click', copyTableToCSV);
        $('#refreshBacklinks').on('click', analyzeCurrentTab);
        $(document).on('click', '.backlink-anchor-link', handleLinkClick);
        $('.filter-input').on('input', filterTable);
        $('#toggleInternalLinks').on('change', toggleInternalLinks);
    }

    function toggleInternalLinks() {
        showInternalLinks = this.checked;
        analyzeCurrentTab(showInternalLinks);
    }


    function handleLinkClick(event) {
        event.preventDefault();
        const href = $(this).prop('href');
        chrome.tabs.sendMessage(currentTabId, {scrollToLink: href});
    }

    async function analyzeCurrentTab(showInternalLinks = false) {
        $('#backlinks-table tbody').empty();
        return chrome.tabs.sendMessage(currentTabId, {command: "analyze", showInternalLinks: showInternalLinks}).then(() => {console.log('analyzing')});
    }


    chrome.runtime.onMessage.addListener((message) => {
        if (message.backlink) {
            addBacklinkToTable(message.backlink);
        }
    });

    function addBacklinkToTable(link) {
        const row = $('<tr></tr>');
        row.append(`<td class="backlink-anchor"><a href="${link.href}" target="_blank" class="backlink-anchor-link link-primary">${link.text}</a></td>`);
        row.append(`<td class="backlink-follow">${link.followType}</td>`);
        row.append(`<td class="backlink-domain">${link.domain}</td>`);
        row.append(`<td class="backlink-status">${link.status || 'Pending'}</td>`);
        $('#backlinks-table tbody').append(row);
    }

    function filterTable() {
        const column = $(this).data('column');
        const value = $(this).val().toLowerCase();

        $('#backlinks-table tbody tr').each(function () {
            const row = $(this);
            const cellText = row.find('td').eq(column).text().toLowerCase();

            if (cellText.includes(value)) {
                row.show();
            } else {
                row.hide();
            }
        });
    }

    async function copyTableToCSV() {
        const table = $('#backlinks-table');
        let csvContent = '';

        // Header Row
        const headers = table.find('thead th').map(function () {
            return $(this).text();
        }).get().join(',');
        csvContent += headers + '\r\n';

        // Data Rows
        table.find('tbody tr').each(function () {
            const row = $(this).find('td').map(function () {
                let cellText = $(this).text();
                // Handle commas and line breaks in cell content
                cellText = cellText.replace(/"/g, '""');
                if (cellText.includes(',') || cellText.includes('\n') || cellText.includes(';')) {
                    cellText = `"${cellText}"`;
                }
                return cellText;
            }).get().join(';');
            csvContent += row + '\r\n';
        });

        // Copy to Clipboard
        try {
            await navigator.clipboard.writeText(csvContent);
            alert('CSV copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy CSV:', err);
            alert('Failed to copy CSV to clipboard.');
        }
    }

    async function injectContentScripts() {
        await chrome.scripting.insertCSS({
            target: {tabId: currentTabId},
            files: ['css/content-styles.css']
        }).then(() => {
            console.log('injecting backlink styles');
        });

        await chrome.scripting.executeScript({
            target: {tabId: currentTabId},
            files: ['resources/js/cash.min.js', 'js/content-backlinks.js']
        }).then(() => {
            console.log('injecting backlinks js');
        });
    }


    async function unloadExtension() {
        let response = await chrome.tabs.sendMessage(currentTabId, {command: "cleanupHighlights"});
        return response;
    }

    window.onblur = unloadExtension;

    initializePopup();

});
