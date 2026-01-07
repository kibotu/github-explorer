// Configuration
let GITHUB_USERNAME = 'kibotu'; // Will be loaded from config
let GITHUB_TOKEN = null; // Will be loaded from config.local.js
const PER_PAGE = 40; // Optimal balance for performance and UX
const API_PER_PAGE = 100; // GitHub API max per request
const SCROLL_TRIGGER = 400; // Load more when 400px from bottom
const PARALLEL_REQUESTS = 3; // Number of parallel API requests

// State
let allRepositories = [];
let filteredRepositories = [];
let displayedCount = 0;
let isLoading = false;
let isLoadingMore = false;
let authenticatedUsername = null; // Store the authenticated user's login

// Language colors (common programming languages)
const languageColors = {
    'JavaScript': '#f1e05a',
    'TypeScript': '#2b7489',
    'Python': '#3572A5',
    'Java': '#b07219',
    'Kotlin': '#A97BFF',
    'Swift': '#ffac45',
    'Go': '#00ADD8',
    'Rust': '#dea584',
    'C++': '#f34b7d',
    'C': '#555555',
    'C#': '#178600',
    'PHP': '#4F5D95',
    'Ruby': '#701516',
    'Shell': '#89e051',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Dart': '#00B4AB',
    'Objective-C': '#438eff',
    'Scala': '#c22d40',
    'R': '#198CE7',
    'Vue': '#41b883',
    'Jupyter Notebook': '#DA5B0B'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration from config.local.js if it exists
    if (window.LOCAL_CONFIG) {
        GITHUB_USERNAME = window.LOCAL_CONFIG.GITHUB_USERNAME || GITHUB_USERNAME;
        GITHUB_TOKEN = window.LOCAL_CONFIG.GITHUB_TOKEN;
        
        // Validate token (basic check)
        if (GITHUB_TOKEN && GITHUB_TOKEN !== 'your_github_token_here') {
            console.log('✓ GitHub token loaded successfully');
        } else {
            GITHUB_TOKEN = null;
            console.warn('⚠ No valid GitHub token found. Public repositories only, rate limit: 60/hour');
        }
    } else {
        console.warn('⚠ config.local.js not found. Public repositories only, rate limit: 60/hour');
    }
    
    setupEventListeners();
    loadRepositories();
});

function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    
    // Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const isActive = chip.dataset.active === 'true';
            chip.dataset.active = !isActive;
            applyFilters();
        });
    });
    
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    document.getElementById('sortOrder').addEventListener('change', applyFilters);
    
    // Infinite scroll
    window.addEventListener('scroll', debounce(handleScroll, 200));
}

function handleScroll() {
    if (isLoadingMore) return;
    
    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;
    
    // Load more when user is near the bottom
    if (scrollPosition >= documentHeight - SCROLL_TRIGGER) {
        loadMoreRepositories();
    }
}

// Fetch all repositories with parallel requests for faster loading
async function loadRepositories() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading(true);
    hideError();
    
    try {
        // Prepare headers with optional authentication
        const headers = {};
        if (GITHUB_TOKEN) {
            headers['Authorization'] = `token ${GITHUB_TOKEN}`;
        }
        
        // Determine which API endpoint to use
        // If authenticated, use /user/repos (includes private repos)
        // If not authenticated, use /users/{username}/repos (public only)
        const reposEndpoint = GITHUB_TOKEN 
            ? 'https://api.github.com/user/repos'
            : `https://api.github.com/users/${GITHUB_USERNAME}/repos`;
        
        // First, get user info
        const userInfoEndpoint = GITHUB_TOKEN
            ? 'https://api.github.com/user'
            : `https://api.github.com/users/${GITHUB_USERNAME}`;
        
        const userResponse = await fetch(userInfoEndpoint, { headers });
        if (!userResponse.ok) throw new Error('Failed to fetch user information');
        const userData = await userResponse.json();
        displayUserInfo(userData);
        
        // Update username if we got it from authenticated endpoint
        if (GITHUB_TOKEN && userData.login) {
            GITHUB_USERNAME = userData.login;
            authenticatedUsername = userData.login; // Store for ownership comparison
        } else {
            authenticatedUsername = GITHUB_USERNAME; // Use configured username
        }
        
        // Fetch repositories with parallel requests
        allRepositories = [];
        let currentPage = 1;
        let hasMore = true;
        let isFirstBatch = true;
        
        while (hasMore) {
            // Fetch multiple pages in parallel
            const pagePromises = [];
            for (let i = 0; i < PARALLEL_REQUESTS && hasMore; i++) {
                const page = currentPage + i;
                pagePromises.push(
                    fetch(
                        `${reposEndpoint}?per_page=${API_PER_PAGE}&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
                        { headers }
                    ).then(async response => {
                        if (!response.ok) {
                            throw new Error(`GitHub API error: ${response.status}`);
                        }
                        const repos = await response.json();
                        return { page, repos };
                    })
                );
            }
            
            // Wait for all parallel requests to complete
            const results = await Promise.all(pagePromises);
            
            // Sort results by page number to maintain order
            results.sort((a, b) => a.page - b.page);
            
            // Process results
            let foundEmpty = false;
            for (const { repos } of results) {
                if (repos.length === 0) {
                    foundEmpty = true;
                    hasMore = false;
                    break;
                } else {
                    allRepositories = allRepositories.concat(repos);
                    
                    // If we got less than the max, we're done
                    if (repos.length < API_PER_PAGE) {
                        hasMore = false;
                        break;
                    }
                }
            }
            
            // Show first batch immediately
            if (isFirstBatch) {
                isFirstBatch = false;
                showLoading(false);
                applyFilters();
                
                // Show loading indicator for additional pages
                if (hasMore) {
                    document.getElementById('loadingMore').style.display = 'block';
                    document.getElementById('loadingMore').textContent = `Loading more repositories... (${allRepositories.length} loaded)`;
                }
            } else {
                // Update display with new repos
                applyFilters();
                
                // Update loading message
                if (hasMore) {
                    document.getElementById('loadingMore').textContent = `Loading more repositories... (${allRepositories.length} loaded)`;
                }
            }
            
            currentPage += PARALLEL_REQUESTS;
            
            // Stop if we found an empty page
            if (foundEmpty) {
                break;
            }
        }
        
        // Hide loading indicator when done
        document.getElementById('loadingMore').style.display = 'none';
        
        // Log summary
        const privateCount = allRepositories.filter(r => r.private).length;
        const publicCount = allRepositories.length - privateCount;
        console.log(`✓ Loaded ${allRepositories.length} repositories (${publicCount} public, ${privateCount} private)`);
        
    } catch (error) {
        showError(`Error loading repositories: ${error.message}`);
        console.error(error);
    } finally {
        isLoading = false;
        showLoading(false);
        document.getElementById('loadingMore').style.display = 'none';
    }
}

function displayUserInfo(user) {
    const userInfoEl = document.getElementById('userInfo');
    userInfoEl.innerHTML = `
        <img src="${user.avatar_url}" alt="${user.name || user.login}" class="avatar">
        <div class="user-details">
            <h2>${user.name || user.login}</h2>
            <p>${user.bio || ''}</p>
            <a href="${user.html_url}" target="_blank" rel="noopener noreferrer">View on GitHub</a>
        </div>
    `;
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // Get filter chip states
    const getFilterState = (filterName) => {
        const chip = document.querySelector(`.filter-chip[data-filter="${filterName}"]`);
        return chip ? chip.dataset.active === 'true' : false;
    };
    
    const showForks = getFilterState('forks');
    const showSources = getFilterState('sources');
    const showPublic = getFilterState('public');
    const showPrivate = getFilterState('private');
    const showOwner = getFilterState('owner');
    const showArchived = getFilterState('archived');
    
    const sortBy = document.getElementById('sortBy').value;
    const sortOrder = document.getElementById('sortOrder').value;
    
    // Filter repositories
    filteredRepositories = allRepositories.filter(repo => {
        // Search filter
        const matchesSearch = !searchTerm || 
            repo.name.toLowerCase().includes(searchTerm) ||
            (repo.description && repo.description.toLowerCase().includes(searchTerm));
        
        // Fork/Source filter
        const matchesForkFilter = (repo.fork && showForks) || (!repo.fork && showSources);
        
        // Public/Private filter
        const matchesVisibility = (repo.private && showPrivate) || (!repo.private && showPublic);
        
        // Owner filter - check if the authenticated user is the owner
        // When active, show only owned repos. When inactive, show only non-owned repos.
        const isOwner = repo.owner && repo.owner.login === authenticatedUsername;
        const matchesOwnerFilter = showOwner ? isOwner : !isOwner;
        
        // Archived filter - only show archived repos if the filter is active
        const matchesArchivedFilter = showArchived ? repo.archived : !repo.archived;
        
        return matchesSearch && matchesForkFilter && matchesVisibility && matchesOwnerFilter && matchesArchivedFilter;
    });
    
    // Sort repositories
    filteredRepositories.sort((a, b) => {
        let compareValue = 0;
        
        switch (sortBy) {
            case 'updated':
                compareValue = new Date(b.updated_at) - new Date(a.updated_at);
                break;
            case 'pushed':
                compareValue = new Date(b.pushed_at || 0) - new Date(a.pushed_at || 0);
                break;
            case 'created':
                compareValue = new Date(b.created_at) - new Date(a.created_at);
                break;
            case 'name':
                compareValue = a.name.toLowerCase().localeCompare(b.name.toLowerCase());
                break;
            case 'stars':
                compareValue = b.stargazers_count - a.stargazers_count;
                break;
            case 'forks':
                compareValue = b.forks_count - a.forks_count;
                break;
        }
        
        return sortOrder === 'asc' ? -compareValue : compareValue;
    });
    
    displayedCount = 0;
    displayRepositories(true);
}

function displayRepositories(reset = false) {
    const container = document.getElementById('repositories');
    
    if (reset) {
        container.innerHTML = '';
        displayedCount = 0;
        document.getElementById('endMessage').style.display = 'none';
    }
    
    document.getElementById('repoCount').textContent = 
        `${filteredRepositories.length} ${filteredRepositories.length === 1 ? 'repository' : 'repositories'}`;
    
    if (filteredRepositories.length === 0) {
        container.innerHTML = '<div class="no-results">No repositories found</div>';
        document.getElementById('endMessage').style.display = 'none';
        return;
    }
    
    const start = displayedCount;
    const end = Math.min(start + PER_PAGE, filteredRepositories.length);
    const pageRepos = filteredRepositories.slice(start, end);
    
    if (pageRepos.length === 0) {
        return;
    }
    
    const repoCards = pageRepos.map(repo => createRepoCard(repo)).join('');
    container.insertAdjacentHTML('beforeend', repoCards);
    
    displayedCount = end;
    
    // Show end message if all repos are displayed
    if (displayedCount >= filteredRepositories.length) {
        document.getElementById('endMessage').style.display = 'block';
    }
    
    // Add event listeners for collapsible sections (only for new cards)
    const newCards = container.querySelectorAll('.metadata-toggle');
    const startIndex = Math.max(0, newCards.length - pageRepos.length);
    
    for (let i = startIndex; i < newCards.length; i++) {
        newCards[i].addEventListener('click', (e) => {
            const content = e.target.nextElementSibling;
            const isExpanded = content.style.display === 'block';
            content.style.display = isExpanded ? 'none' : 'block';
            e.target.textContent = isExpanded ? '▶ Show Details' : '▼ Hide Details';
        });
    }
}

function loadMoreRepositories() {
    if (isLoadingMore || displayedCount >= filteredRepositories.length) {
        return;
    }
    
    isLoadingMore = true;
    document.getElementById('loadingMore').style.display = 'block';
    
    // Simulate a small delay for smooth UX
    setTimeout(() => {
        displayRepositories(false);
        isLoadingMore = false;
        document.getElementById('loadingMore').style.display = 'none';
    }, 300);
}

function createRepoCard(repo) {
    const languages = repo.language ? [repo.language] : [];
    const isOwner = repo.owner && repo.owner.login === authenticatedUsername;
    
    return `
        <div class="repo-card">
            <div class="repo-header">
                <h3>
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer">${repo.name}</a>
                    ${repo.private ? '<span class="badge badge-private">Private</span>' : ''}
                    ${repo.fork ? '<span class="badge badge-fork">Fork</span>' : ''}
                    ${repo.archived ? '<span class="badge badge-archived">Archived</span>' : ''}
                    ${!isOwner ? '<span class="badge badge-collaborator">Collaborator</span>' : ''}
                </h3>
            </div>
            
            ${repo.description ? `<p class="repo-description">${escapeHtml(repo.description)}</p>` : ''}
            
            <div class="repo-languages">
                ${languages.map(lang => createLanguageBadge(lang)).join('')}
            </div>
            
            <div class="repo-stats">
                <span title="Stars">⭐ ${repo.stargazers_count}</span>
                <span title="Forks">🔱 ${repo.forks_count}</span>
                <span title="Open Issues">🐛 ${repo.open_issues_count}</span>
                <span title="Watchers">👁️ ${repo.watchers_count}</span>
                ${repo.size ? `<span title="Size">💾 ${formatSize(repo.size)}</span>` : ''}
            </div>
            
            <button class="metadata-toggle">▶ Show Details</button>
            <div class="metadata-content" style="display: none;">
                <div class="metadata-grid">
                    ${repo.homepage ? `
                        <div class="metadata-item">
                            <strong>Homepage:</strong>
                            <a href="${repo.homepage}" target="_blank" rel="noopener noreferrer">${repo.homepage}</a>
                        </div>
                    ` : ''}
                    
                    <div class="metadata-item">
                        <strong>Created:</strong>
                        <span>${formatDate(repo.created_at)}</span>
                    </div>
                    
                    <div class="metadata-item">
                        <strong>Updated:</strong>
                        <span>${formatDate(repo.updated_at)}</span>
                    </div>
                    
                    ${repo.pushed_at ? `
                        <div class="metadata-item">
                            <strong>Last Push:</strong>
                            <span>${formatDate(repo.pushed_at)}</span>
                        </div>
                    ` : ''}
                    
                    <div class="metadata-item">
                        <strong>Default Branch:</strong>
                        <span>${repo.default_branch}</span>
                    </div>
                    
                    ${repo.license ? `
                        <div class="metadata-item">
                            <strong>License:</strong>
                            <span>${repo.license.name}</span>
                        </div>
                    ` : ''}
                    
                    <div class="metadata-item">
                        <strong>Visibility:</strong>
                        <span>${repo.private ? 'Private' : 'Public'}</span>
                    </div>
                    
                    ${repo.topics && repo.topics.length > 0 ? `
                        <div class="metadata-item full-width">
                            <strong>Topics:</strong>
                            <div class="topics">
                                ${repo.topics.map(topic => `<span class="topic-tag">${topic}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${repo.has_issues ? `
                        <div class="metadata-item">
                            <strong>Issues:</strong>
                            <a href="${repo.html_url}/issues" target="_blank" rel="noopener noreferrer">View Issues</a>
                        </div>
                    ` : ''}
                    
                    ${repo.has_wiki ? `
                        <div class="metadata-item">
                            <strong>Wiki:</strong>
                            <a href="${repo.html_url}/wiki" target="_blank" rel="noopener noreferrer">View Wiki</a>
                        </div>
                    ` : ''}
                    
                    ${repo.fork && repo.parent ? `
                        <div class="metadata-item full-width">
                            <strong>Forked from:</strong>
                            <a href="${repo.parent.html_url}" target="_blank" rel="noopener noreferrer">${repo.parent.full_name}</a>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

function createLanguageBadge(language) {
    const color = languageColors[language] || '#cccccc';
    return `
        <span class="language-badge" style="background-color: ${color}">
            ${language}
        </span>
    `;
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatSize(kb) {
    if (kb < 1024) return `${kb} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'block' : 'none';
}

function showError(message) {
    const errorEl = document.getElementById('error');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    document.getElementById('error').style.display = 'none';
}

