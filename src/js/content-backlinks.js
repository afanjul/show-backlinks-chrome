{
var showInternalLinks = false; // State to determine which links to include

function extractDomain(url) {
    let domain;
    try {
        domain = new URL(url).hostname;
    } catch (e) {
        domain = '';
    }
    return domain;
}

const isValidUrl = urlString => {
    var urlPattern = new RegExp('^(https?:\\/\\/)?' + // validate protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // validate domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // validate OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // validate port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // validate query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // validate fragment locator
    return !!urlPattern.test(urlString);
}

async function checkLinkStatus(url) {
    try {
        const response = await fetch(url, {method: 'HEAD'});
        return response.status === 200 ? 'Active' : 'Broken';
    } catch (e) {
        return 'Unknown';
    }
}

async function scrapeBacklinks() {
    const currentDomain = window.location.hostname;
    const mainContent = findMainContentBlock();

    const options = await chrome.storage.sync.get(['highlightLinks', 'checkLinkStatus']);

    mainContent.find('a').each(async function () {
        const href = this.href;
        const domain = extractDomain(href);
        const isInternalLink = domain === currentDomain;

        if (!isValidUrl(href) || ((showInternalLinks && !isInternalLink) || (!showInternalLinks && isInternalLink))) return;

        const text = $(this).html().trim();
        const followType = $(this).attr('rel')?.includes('nofollow') ? 'No-Follow' : 'Follow';
        const status = options.checkLinkStatus ? await checkLinkStatus(href) : 'Not checked';

        if (options.highlightLinks) {
            $(this).addClass('is-a-backlink');
        }

        chrome.runtime.sendMessage({backlink: {href, text, followType, domain, status}});
    });
}

function findMainContentBlock() {
    const mainContentSelector = 'main, article, section, div';
    const excludedSelectors = 'nav, header, footer, sidebar, aside, .navbar, .footer, .sidebar, .aside';
    let mainContent = $(mainContentSelector).not(excludedSelectors);

    if (mainContent.length <= 1) return mainContent.length ? mainContent : $('body');

    return $(Array.from(mainContent).sort((a, b) =>
        $(b).text().length - $(a).text().length)[0]);
}

function cleanupHighlights() {
    $('a').each(function () {
        $(this).removeClass('is-a-backlink');
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "analyze") {
        showInternalLinks = request.showInternalLinks;
        cleanupHighlights();
        scrapeBacklinks();
    }

    if (request.command === "cleanupHighlights") {
        cleanupHighlights();
    }

    if (request.scrollToLink) {
        const targetHref = request.scrollToLink;
        const targetLink = document.querySelector(`a[href="${targetHref}"]`);

        if (targetLink) {
            targetLink.classList.add('pulse');
            targetLink.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    }
});
}