        let bookmarks = [];
        let currentFilter = "all";
        let editingId = null;

        // Starter bookmarks for new users
        const STARTER_BOOKMARKS = [
            {
                id: "Bookmark-1",
                name: "CodePen",
                url: "https://codepen.io",
                category: "coding",
                tags: ["frontend", "demos", "playground", "code"],
                favicon: "https://www.google.com/s2/favicons?sz=64&domain_url=https://codepen.io",
                dateAdded: "2024-01-01T00:00:00.000Z"
            }
        ];

        // Category detection keywords - helps auto-categorize bookmarks
        const categoryKeywords = {
            coding: ["github", "stackoverflow", "codepen", "gitlab", "bitbucket", "replit", "codesandbox", "dev.to", "hackernews", "programming", "developer", "code", "api", "documentation", "docs"],
            social: ["facebook", "twitter", "instagram", "linkedin", "discord", "slack", "telegram", "whatsapp", "reddit", "social", "community", "chat"],
            tools: ["notion", "trello", "asana", "figma", "canva", "photoshop", "productivity", "tools", "app", "software", "utility"],
            entertainment: ["youtube", "netflix", "spotify", "twitch", "gaming", "music", "video", "entertainment", "movie", "stream"],
            news: ["news", "bbc", "cnn", "reuters", "techcrunch", "verge", "medium", "blog", "article", "newspaper"],
            learning: ["coursera", "udemy", "khan", "education", "course", "tutorial", "learning", "university", "school", "training"],
            shopping: ["amazon", "ebay", "shop", "store", "buy", "cart", "ecommerce", "retail", "marketplace"]
        };

        // === INITIALIZATION ===
        document.addEventListener("DOMContentLoaded", function() {
            loadBookmarksFromStorage();
            setupAllEventListeners();
            displayAllBookmarks();
            loadUserTheme();
            startPeriodicSave();
            console.log("📚 Bookmark Manager loaded successfully!");
        });

        // Load bookmarks from localStorage or use starter set
        function loadBookmarksFromStorage() {
            const savedBookmarks = localStorage.getItem("bookmarks");
            if (!savedBookmarks || JSON.parse(savedBookmarks).length === 0) {
                bookmarks = [...STARTER_BOOKMARKS];
                saveBookmarksToStorage();
            } else {
                bookmarks = JSON.parse(savedBookmarks);
            }
        }

        // Save bookmarks to localStorage
        function saveBookmarksToStorage() {
            localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
        }

        // === EVENT LISTENERS SETUP ===
        function setupAllEventListeners() {
            // Header buttons
            document.getElementById("addBookmarkBtn").addEventListener("click", openAddBookmarkModal);
            document.getElementById("themeToggle").addEventListener("click", toggleTheme);
            document.getElementById("sortBtn").addEventListener("click", toggleSortMenu);
            document.getElementById("exportBtn").addEventListener("click", exportBookmarks);
            document.getElementById("importBtn").addEventListener("click", () => document.getElementById("importFile").click());
            document.getElementById("importFile").addEventListener("change", importBookmarks);

            // Search functionality
            document.getElementById("searchInput").addEventListener("input", handleSearchInput);
            document.getElementById("searchInput").addEventListener("keypress", handleSearchKeypress);

            // Modal controls
            document.getElementById("closeModal").addEventListener("click", closeModal);
            document.getElementById("cancelBtn").addEventListener("click", closeModal);
            document.getElementById("bookmarkForm").addEventListener("submit", handleFormSubmit);
            document.getElementById("bookmarkModal").addEventListener("click", handleModalBackdropClick);

            // Form helpers
            document.getElementById("bookmarkUrl").addEventListener("blur", handleUrlAutoDetection);

            // Category navigation
            document.getElementById("categoriesNav").addEventListener("click", handleCategoryFilter);

            // Keyboard shortcuts
            document.addEventListener("keydown", handleKeyboardShortcuts);

            // Close sort menu when clicking outside
            document.addEventListener("click", handleClickOutside);
        }

        // === MODAL FUNCTIONS ===
        function openAddBookmarkModal() {
            editingId = null;
            document.getElementById("modalTitle").textContent = "➕ Add Bookmark";
            document.getElementById("saveBtnText").textContent = "💾 Save Bookmark";
            document.getElementById("bookmarkForm").reset();
            document.getElementById("bookmarkModal").classList.add("active");
            document.getElementById("bookmarkUrl").focus();
        }

        function openEditBookmarkModal(bookmarkId) {
            const bookmarkToEdit = bookmarks.find(b => b.id === bookmarkId);
            if (!bookmarkToEdit) return;

            editingId = bookmarkId;
            document.getElementById("modalTitle").textContent = "✏️ Edit Bookmark";
            document.getElementById("saveBtnText").textContent = "💾 Update Bookmark";
            
            // Fill form with bookmark data
            document.getElementById("bookmarkUrl").value = bookmarkToEdit.url;
            document.getElementById("bookmarkName").value = bookmarkToEdit.name;
            document.getElementById("bookmarkCategory").value = bookmarkToEdit.category;
            document.getElementById("bookmarkTags").value = bookmarkToEdit.tags.join(", ");
            
            document.getElementById("bookmarkModal").classList.add("active");
        }

        function closeModal() {
            document.getElementById("bookmarkModal").classList.remove("active");
            editingId = null;
        }

        function handleModalBackdropClick(event) {
            if (event.target === event.currentTarget) {
                closeModal();
            }
        }

        // === FORM HANDLING ===
        async function handleFormSubmit(event) {
            event.preventDefault();
            
            if (!isFormValid()) return;
            
            const formData = getFormData();
            showLoadingState(true);

            try {
                const bookmarkData = await prepareBookmarkData(formData);
                
                if (editingId) {
                    updateExistingBookmark(bookmarkData);
                    showSuccessMessage("Bookmark updated successfully! ✅");
                } else {
                    addNewBookmark(bookmarkData);
                    showSuccessMessage("Bookmark added successfully! ✅");
                }

                saveBookmarksToStorage();
                displayAllBookmarks();
                closeModal();
            } catch (error) {
                showErrorMessage("Error saving bookmark");
                console.error("Save error:", error);
            } finally {
                showLoadingState(false);
            }
        }

        function getFormData() {
            return {
                url: document.getElementById("bookmarkUrl").value.trim(),
                name: document.getElementById("bookmarkName").value.trim(),
                category: document.getElementById("bookmarkCategory").value,
                tags: document.getElementById("bookmarkTags").value.split(",").map(tag => tag.trim()).filter(tag => tag)
            };
        }

        async function prepareBookmarkData(formData) {
            const finalName = formData.name || await extractSiteNameFromUrl(formData.url);
            const finalCategory = formData.category || detectCategoryFromUrl(formData.url);
            const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${formData.url}`;

            return {
                id: editingId || Date.now(),
                name: finalName,
                url: formData.url,
                category: finalCategory,
                tags: formData.tags,
                favicon: faviconUrl,
                dateAdded: editingId ? bookmarks.find(b => b.id === editingId).dateAdded : new Date().toISOString()
            };
        }

        function updateExistingBookmark(bookmarkData) {
            const index = bookmarks.findIndex(b => b.id === editingId);
            if (index !== -1) {
                bookmarks[index] = bookmarkData;
            }
        }

        function addNewBookmark(bookmarkData) {
            bookmarks.unshift(bookmarkData); // Add to beginning of array
        }

        // Auto-detect site name from URL
        async function extractSiteNameFromUrl(url) {
            try {
                const domain = new URL(url).hostname;
                return domain.replace('www.', '').split('.')[0];
            } catch {
                return "Website";
            }
        }

        // Auto-detect category based on URL keywords
        function detectCategoryFromUrl(url) {
            const urlLowerCase = url.toLowerCase();
            
            for (const [category, keywords] of Object.entries(categoryKeywords)) {
                if (keywords.some(keyword => urlLowerCase.includes(keyword))) {
                    return category;
                }
            }
            
            return "other";
        }

        function handleUrlAutoDetection(event) {
            const url = event.target.value.trim();
            if (url && !document.getElementById("bookmarkName").value) {
                extractSiteNameFromUrl(url).then(siteName => {
                    document.getElementById("bookmarkName").value = siteName;
                });
            }
        }

        // === SEARCH FUNCTIONALITY ===
        function handleSearchInput(event) {
            const searchQuery = event.target.value.toLowerCase();
            displayAllBookmarks(searchQuery);
        }

        function handleSearchKeypress(event) {
            if (event.key === 'Enter') {
                const query = event.target.value.trim();
                if (query) {
                    // Check if any bookmarks match the search
                    const matchingBookmarks = bookmarks.filter(bookmark => 
                        bookmark.name.toLowerCase().includes(query.toLowerCase()) ||
                        bookmark.url.toLowerCase().includes(query.toLowerCase()) ||
                        bookmark.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
                    );
                    
                    // If no matches found, search on Google
                    if (matchingBookmarks.length === 0) {
                        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                    }
                }
            }
        }

        // === CATEGORY FILTERING ===
        function handleCategoryFilter(event) {
            if (event.target.classList.contains("category-btn")) {
                // Update active category button
                document.querySelectorAll(".category-btn").forEach(btn => btn.classList.remove("active"));
                event.target.classList.add("active");
                
                currentFilter = event.target.dataset.category;
                displayAllBookmarks();
            }
        }

        

        // === BOOKMARK DISPLAY ===
        function displayAllBookmarks(searchQuery = "") {
            const bookmarksGrid = document.getElementById("bookmarksGrid");
            const emptyState = document.getElementById("emptyState");
            
            let filteredBookmarks = [...bookmarks];
            
            // Apply category filter
            if (currentFilter !== "all") {
                filteredBookmarks = filteredBookmarks.filter(bookmark => bookmark.category === currentFilter);
            }
            
            // Apply search filter
            if (searchQuery) {
                filteredBookmarks = filteredBookmarks.filter(bookmark => 
                    bookmark.name.toLowerCase().includes(searchQuery) ||
                    bookmark.url.toLowerCase().includes(searchQuery) ||
                    bookmark.tags.some(tag => tag.toLowerCase().includes(searchQuery))
                );
            }

            updateStatisticsDisplay();

            // Show empty state if no bookmarks found
            if (filteredBookmarks.length === 0) {
                bookmarksGrid.style.display = "none";
                emptyState.style.display = "block";
                return;
            }

            // Display bookmarks
            bookmarksGrid.style.display = "grid";
            emptyState.style.display = "none";
            
            bookmarksGrid.innerHTML = filteredBookmarks.map(bookmark => createBookmarkCardHTML(bookmark)).join('');
        }

        function createBookmarkCardHTML(bookmark) {
            return `
                <div class="bookmark-card" onclick="openBookmarkUrl('${bookmark.url}')">
                    <div class="bookmark-header">
                        <div class="bookmark-favicon">
                            <img src="${bookmark.favicon}" alt="${bookmark.name}" onerror="this.parentElement.textContent='🔗'">
                        </div>
                        <div class="bookmark-title">${bookmark.name}</div>
                        <div class="bookmark-actions">
                            <button class="action-btn edit" onclick="event.stopPropagation(); openEditBookmarkModal('${bookmark.id}')" title="Edit">✏️</button>
                            <button class="action-btn delete" onclick="event.stopPropagation(); deleteBookmark('${bookmark.id}')" title="Delete">🗑️</button>
                        </div>
                    </div>
                    <div class="bookmark-url">${bookmark.url}</div>
                    <div class="bookmark-tags">
                        ${bookmark.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            `;
        }

        function openBookmarkUrl(url) {
            window.location.href = url;
        }

        function deleteBookmark(bookmarkId) {
            if (confirm("Are you sure you want to delete this bookmark? 🗑️")) {
                bookmarks = bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
                saveBookmarksToStorage();
                displayAllBookmarks();
                showSuccessMessage("Bookmark deleted successfully! ✅");
            }
        }

        // === STATISTICS ===
        function updateStatisticsDisplay() {
            const categoryStats = calculateCategoryStats();
            document.getElementById("totalBookmarks").textContent = bookmarks.length;
            document.getElementById("codingCount").textContent = categoryStats.coding || 0;
            document.getElementById("socialCount").textContent = categoryStats.social || 0;
            document.getElementById("toolsCount").textContent = categoryStats.tools || 0;
            document.getElementById("learningCount").textContent = categoryStats.learning || 0;
        }

        function calculateCategoryStats() {
            const stats = {};
            bookmarks.forEach(bookmark => {
                stats[bookmark.category] = (stats[bookmark.category] || 0) + 1;
            });
            return stats;
        }

        // === SORTING FUNCTIONALITY ===
        function toggleSortMenu() {
            const existingMenu = document.getElementById("sortMenu");
            if (existingMenu) {
                existingMenu.remove();
                return;
            }

            const sortButton = document.getElementById("sortBtn");
            const sortMenu = document.createElement("div");
            sortMenu.id = "sortMenu";
            sortMenu.className = "sort-menu active";
            sortMenu.innerHTML = `
                <div class="sort-option" onclick="sortBookmarks('name')">📝 Sort by Name</div>
                <div class="sort-option" onclick="sortBookmarks('date')">📅 Sort by Date</div>
                <div class="sort-option" onclick="sortBookmarks('category')">📁 Sort by Category</div>
                <div class="sort-option" onclick="clearAllBookmarks()">🗑️ Clear All Bookmarks</div>
            `;
            
            sortButton.parentElement.style.position = "relative";
            sortButton.parentElement.appendChild(sortMenu);
        }

        function sortBookmarks(criteria) {
            switch(criteria) {
                case 'name':
                    bookmarks.sort((a, b) => a.name.localeCompare(b.name));
                    break;
                case 'date':
                    bookmarks.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
                    break;
                case 'category':
                    bookmarks.sort((a, b) => a.category.localeCompare(b.category));
                    break;
            }
            saveBookmarksToStorage();
            displayAllBookmarks();
            showSuccessMessage(`Bookmarks sorted by ${criteria} ✅`);
            document.getElementById("sortMenu")?.remove();
        }

        function clearAllBookmarks() {
            if (confirm("Are you sure you want to delete ALL bookmarks? This action cannot be undone! ⚠️")) {
                bookmarks = [];
                saveBookmarksToStorage();
                displayAllBookmarks();
                showWarningMessage("All bookmarks cleared! 🗑️");
                document.getElementById("sortMenu")?.remove();
            }
        }

        // === IMPORT/EXPORT ===
        function exportBookmarks() {
            const dataString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bookmarks, null, 2));
            const downloadLink = document.createElement('a');
            downloadLink.setAttribute("href", dataString);
            downloadLink.setAttribute("download", "bookmarks.json");
            document.body.appendChild(downloadLink);
            downloadLink.click();
            downloadLink.remove();
            showSuccessMessage("Bookmarks exported successfully! 📄");
        }

        function importBookmarks(event) {
            const file = event.target.files[0];
            if (!file) return;

            const fileReader = new FileReader();
            fileReader.onload = function(e) {
                try {
                    const importedBookmarks = JSON.parse(e.target.result);
                    if (Array.isArray(importedBookmarks)) {
                        bookmarks = [...bookmarks, ...importedBookmarks];
                        saveBookmarksToStorage();
                        displayAllBookmarks();
                        showSuccessMessage("Bookmarks imported successfully! 📥");
                    } else {
                        showErrorMessage("Invalid bookmark file format");
                    }
                } catch (error) {
                    showErrorMessage("Error importing bookmarks");
                    console.error("Import error:", error);
                }
            };
            fileReader.readAsText(file);
        }

        // === THEME FUNCTIONALITY ===
        function toggleTheme() {
            const body = document.body;
            const isCurrentlyLight = body.classList.contains('light-theme');
            
            if (isCurrentlyLight) {
                body.classList.remove('light-theme');
                localStorage.setItem('theme', 'dark');
                showSuccessMessage("Switched to dark theme 🌙");
            } else {
                body.classList.add('light-theme');
                localStorage.setItem('theme', 'light');
                showSuccessMessage("Switched to light theme ☀️");
            }
        }

        function loadUserTheme() {
            const savedTheme = localStorage.getItem('theme');
            if (savedTheme === 'light') {
                document.body.classList.add('light-theme');
            }
        }

        // === KEYBOARD SHORTCUTS ===
        function handleKeyboardShortcuts(event) {
            if (event.ctrlKey && event.key === "k") {
                event.preventDefault();
                document.getElementById("searchInput").focus();
            }
            if (event.ctrlKey && event.key === "n") {
                event.preventDefault();
                openAddBookmarkModal();
            }
            if (event.key === "Escape") {
                closeModal();
            }
        }

        function handleClickOutside(event) {
            if (!event.target.closest("#sortBtn") && !event.target.closest(".sort-menu")) {
                document.getElementById("sortMenu")?.remove();
            }
        }

        // === FORM VALIDATION ===
        function isFormValid() {
            const url = document.getElementById("bookmarkUrl").value.trim();
            
            if (!url) {
                showErrorMessage("Please enter a URL");
                return false;
            }
            
            if (!isValidUrl(url)) {
                showErrorMessage("Please enter a valid URL");
                return false;
            }
            
            if (!editingId && isBookmarkDuplicate(url)) {
                showWarningMessage("This bookmark already exists");
                return false;
            }
            
            return true;
        }

        function isValidUrl(string) {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        }

        function isBookmarkDuplicate(url) {
            return bookmarks.some(bookmark => bookmark.url === url);
        }

        // === UI HELPERS ===
        function showLoadingState(isLoading) {
            const spinner = document.getElementById("saveSpinner");
            const buttonText = document.getElementById("saveBtnText");
            
            if (isLoading) {
                spinner.style.display = "inline-block";
                buttonText.textContent = "Saving...";
            } else {
                spinner.style.display = "none";
                buttonText.textContent = editingId ? "💾 Update Bookmark" : "💾 Save Bookmark";
            }
        }

        function showSuccessMessage(message) {
            showToast(message, "success");
        }

        function showErrorMessage(message) {
            showToast(message, "error");
        }

        function showWarningMessage(message) {
            showToast(message, "warning");
        }

        function showToast(message, type = "success") {
            const toast = document.createElement("div");
            toast.className = `toast ${type}`;
            toast.textContent = message;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        // === AUTO SAVE ===
        let autoSaveInterval;

        function startPeriodicSave() {
            autoSaveInterval = setInterval(() => {
                saveBookmarksToStorage();
            }, 30000); // Save every 30 seconds
        }

        function stopPeriodicSave() {
            if (autoSaveInterval) {
                clearInterval(autoSaveInterval);
            }
        }

        // Handle page visibility changes for auto-save
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                stopPeriodicSave();
            } else {
                startPeriodicSave();
            }
        });

        // Make functions available globally for onclick handlers
        window.openEditBookmarkModal = openEditBookmarkModal;
        window.deleteBookmark = deleteBookmark;
        window.openBookmarkUrl = openBookmarkUrl;
        window.sortBookmarks = sortBookmarks;
        window.clearAllBookmarks = clearAllBookmarks;