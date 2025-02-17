// First, update the setTheme function to handle header image switching
function setTheme(theme) {
    // Remove any existing theme class first
    document.body.classList.remove('light-theme', 'dark-theme');
    
    // Add the new theme class
    if (theme === 'dark') {
        document.body.classList.add('dark-theme');
    }
    
    // Update header image based on theme
    const headerImage = document.querySelector('.header-image');
    if (headerImage) {
        headerImage.src = theme === 'dark' ? 'dark1.jpg' : 'images/light-header2.PNG';
    }
    
    // Update button states
    document.querySelectorAll('.theme-toggle').forEach(button => {
        button.classList.toggle('active', button.dataset.theme === theme);
    });
    
    // Save theme preference
    localStorage.setItem('theme', theme);
}

// Update the initializeTheme function to ensure header image is set on load
function initializeTheme() {
    // Get saved theme or default to light
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // Apply the theme
    setTheme(savedTheme);
    
    // Set initial button states
    document.querySelectorAll('.theme-toggle').forEach(button => {
        button.classList.toggle('active', button.dataset.theme === savedTheme);
    });
}
function setupThemeToggle() {
    document.querySelectorAll('.theme-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.dataset.theme;
            setTheme(theme);
        });
    });
}

// Make sure these get called early in your DOMContentLoaded event
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme functionality first
    initializeTheme();
    setupThemeToggle();

    // Rest of your existing code...
    let peopleData = [];
    let segmentationData = new Map();
    let currentView = 'table';
    let filters = {
        status: 'all',
        gl: 'all',
        advisory: 'all',
        events: 'all',
        meetings: 'all',
        gileadCTs: 'all',
        competitorCTs: 'all',
        competitorPubs: 'all',
        gileadPubs: 'all',
        country: 'all'
    };


     // Initialize modal functionality first
     function initializeModal() {
        const modal = document.getElementById('disclaimer-modal');
        const disclaimerBtn = document.querySelector('button[title="Disclaimer"]');
        const acceptBtn = document.getElementById('accept-disclaimer');

        if (!modal || !acceptBtn) {
            console.error('Required modal elements not found');
            return;
        }

        // Force modal to be visible at start
        modal.style.display = 'block';

        // Handle disclaimer button clicks
        if (disclaimerBtn) {
            disclaimerBtn.addEventListener('click', () => {
                modal.style.display = 'block';
            });
        }

        // Handle accept button clicks - only way to close the modal
        acceptBtn.addEventListener('click', () => {
            modal.style.display = 'none';
            sessionStorage.setItem('disclaimerAccepted', 'true');
            initializeData(); // Initialize data only after acceptance
        });

        // Prevent any other ways of closing the modal
        modal.addEventListener('click', (e) => {
            // Prevent the click from propagating
            e.stopPropagation();
        });
    }

    // Start the application
    function startApp() {
        // Show disclaimer first
        initializeModal();

        // Only initialize data if disclaimer was previously accepted
        if (sessionStorage.getItem('disclaimerAccepted')) {
            initializeData();
        }
    }

    // Start the application immediately
    startApp();

    // View Toggle Setup
   // Update the view toggle event listener to properly handle the count
document.querySelectorAll('.view-toggle').forEach(button => {
    button.addEventListener('click', () => {
        const viewType = button.dataset.view;
        
        // Update buttons
        document.querySelectorAll('.view-toggle').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Update view containers
        document.querySelectorAll('.view-container').forEach(container => {
            container.classList.remove('active');
        });
        document.getElementById(`${viewType}-view`).classList.add('active');

        // Handle EE Status filter based on view
        const statusRadios = document.querySelectorAll('input[name="status"]');
        const top60Radio = document.getElementById('top-60');

        if (viewType === 'matrix') {
            // Force Top 60 EEs selection and disable other options
            statusRadios.forEach(radio => {
                radio.disabled = true;
                radio.parentElement.style.opacity = '0.5';
                radio.parentElement.style.cursor = 'not-allowed';
            });
            top60Radio.checked = true;
            top60Radio.parentElement.style.opacity = '1';
            
            // Update the filter and refresh the view
            filters.status = 'Top 60 EEs';
        } else {
            // Re-enable all options
            statusRadios.forEach(radio => {
                radio.disabled = false;
                radio.parentElement.style.opacity = '1';
                radio.parentElement.style.cursor = 'pointer';
            });
            
            // If coming from matrix view, reset status filter to 'all'
            if (filters.status === 'Top 60 EEs') {
                filters.status = 'all';
                document.getElementById('all-status').checked = true;
            }
        }

        // Update current view
        currentView = viewType;
        
        // Apply filters and update count immediately
        const filteredData = applyFilters(peopleData);
        updateResultsCount(filteredData.length);
        
        // Render appropriate view
        if (viewType === 'table') {
            renderTable(filteredData);
        } else {
            renderMatrix(filteredData);
        }
    });
});

    // Initialize data and views
    async function initializeData() {
        try {
            const [peopleResponse, segResponse] = await Promise.all([
                fetch('data/transformed_dataset.json'),
                fetch('data/segmentation_data.csv')
            ]);

            const peopleJson = await peopleResponse.json();
            const segCsv = await segResponse.text();

            peopleData = peopleJson.people;
            processSegmentationData(segCsv);
            setupEventListeners();
            populateCountryDropdown();
            refreshCurrentView();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    function processSegmentationData(csv) {
        const rows = csv.trim().split('\n');
        rows.slice(1).forEach(row => {
            const [firstName, lastName, clinicalRelevance, experience] = row.split(',').map(val => val.trim());
            const key = `${firstName}_${lastName}`;
            segmentationData.set(key, {
                clinical_relevance: clinicalRelevance,
                experience: experience
            });
        });
    }

    function setupEventListeners() {
        // Radio button filters
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                filters[e.target.name] = e.target.value;
                refreshCurrentView();
            });
        });

        // Dropdown filters
        const dropdownMapping = {
            'gilead-cts-filter': 'gileadCTs',
            'competitor-cts-filter': 'competitorCTs',
            'competitor-pubs-filter': 'competitorPubs',
            'gilead-pubs-filter': 'gileadPubs'
        };

        Object.keys(dropdownMapping).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    filters[dropdownMapping[id]] = e.target.value;
                    refreshCurrentView();
                });
            }
        });

        // Clear filters button
        document.getElementById('clear-filters').addEventListener('click', clearFilters);

        // Disclaimer modal
        setupDisclaimerModal();
    }

    function refreshCurrentView() {
        const filteredData = applyFilters(peopleData);
        updateResultsCount(filteredData.length);
        
        if (currentView === 'table') {
            renderTable(filteredData);
        } else {
            renderMatrix(filteredData);
        }
    }

    function applyFilters(data) {
        return data.filter(person => {
            // Country filter
            if (filters.country !== 'all' && !filters.country.includes(person.country)) {
                return false;
            }
            
            // Status filter
            if (filters.status !== 'all' && person.status_filter !== filters.status) return false;
            
            // GL filter
            if (filters.gl !== 'all' && person.gl_filter !== filters.gl) return false;
            
            // Advisory program filters
            if (filters.advisory === 'conference' && !person.conference_feedback_program) return false;
            if (filters.advisory === 'adboards' && (!person.gilead_ad_boards || person.gilead_ad_boards.length === 0)) return false;
            
            // Educational events filters
            if (filters.events === 'gilead' && (!person.educational_event?.gilead || person.educational_event.gilead.length === 0)) return false;
            if (filters.events === 'competitor' && (!person.educational_event?.competitor || person.educational_event.competitor.length === 0)) return false;
            if (filters.events === 'cme' && (!person.cme_event || person.cme_event.length === 0)) return false;
            
            // 1-1s filter
            if (filters.meetings === '1-1s' && (!person['1-1s'] || person['1-1s'].length === 0)) return false;
            
            // Clinical Trials filters
            if (filters.gileadCTs !== 'all') {
                const hasGileadCT = person.clinical_trials?.gilead?.[filters.gileadCTs]?.length > 0;
                if (!hasGileadCT) return false;
            }
            
            if (filters.competitorCTs !== 'all') {
                const hasCompetitorCT = person.clinical_trials?.competitor?.[filters.competitorCTs]?.length > 0;
                if (!hasCompetitorCT) return false;
            }
            
            // Publications filters
            if (filters.gileadPubs !== 'all') {
                const hasGileadPub = person.publications?.gilead?.[filters.gileadPubs]?.length > 0;
                if (!hasGileadPub) return false;
            }
            
            if (filters.competitorPubs !== 'all') {
                const hasCompetitorPub = person.publications?.competitor?.[filters.competitorPubs]?.length > 0;
                if (!hasCompetitorPub) return false;
            }
            
            return true;
        });
    }

    function renderTable(data) {
        const tableBody = document.getElementById('table-body');
        const thead = document.querySelector('#people-table thead tr');
        
        // Clear existing content
        thead.innerHTML = '';
        tableBody.innerHTML = '';
        
        // Add headers
        const headers = [
            'First Name', 'Last Name', 'Country', 'Institution', 'Special Interest',
            '1-1s', 'Clinical Trials', 'CME Events', 'Conf. Feedback Program',
            'Educational Events', 'Gilead Ad Boards', 'Pubs'
        ];
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            thead.appendChild(th);
        });

        // Add rows
        data.forEach(person => {
            const row = document.createElement('tr');
            
            // Basic info columns
            ['first_name', 'last_name', 'country', 'institution', 'special_interest'].forEach(key => {
                const cell = document.createElement('td');
                cell.textContent = person[key];
                row.appendChild(cell);
            });

            // Icon columns with tooltips
            createIconCell(row, person['1-1s'].length > 0, createTooltipContent('1-1s', person['1-1s']));
            createIconCell(row, hasTrials(person), createTrialsTooltip(person));
            createIconCell(row, person.cme_event.length > 0, createTooltipContent('CME Events', person.cme_event));
            createIconCell(row, person.conference_feedback_program);
            createIconCell(row, hasEducationalEvents(person), createEducationalTooltip(person));
            createIconCell(row, person.gilead_ad_boards.length > 0, createTooltipContent('Gilead Ad Boards', person.gilead_ad_boards));
            createIconCell(row, hasPublications(person), createPublicationsTooltip(person), true);

            tableBody.appendChild(row);
        });
    }

    function renderMatrix(data) {
        const matrixCells = document.querySelector('.matrix-cells');
        matrixCells.innerHTML = '';
        
        const relevanceLevels = ['H', 'M', 'L', 'Unknown'];
        const experienceLevels = ['L', 'M', 'H'];
        
        relevanceLevels.forEach(relevance => {
            experienceLevels.forEach(experience => {
                const cell = document.createElement('div');
                cell.className = 'matrix-cell';
                cell.dataset.relevance = relevance;
                cell.dataset.experience = experience;
                matrixCells.appendChild(cell);
            });
        });

        // Populate matrix with filtered people
        data.forEach(person => {
            const key = `${person.first_name}_${person.last_name}`;
            const segInfo = segmentationData.get(key);
            
            if (segInfo) {
                const cell = document.querySelector(
                    `.matrix-cell[data-relevance="${segInfo.clinical_relevance}"][data-experience="${segInfo.experience}"]`
                );
                
                if (cell) {
                    const icon = document.createElement('div');
                    icon.className = 'person-icon';
                    icon.title = `${person.first_name} ${person.last_name}\nInstitution: ${person.institution}`;
                    cell.appendChild(icon);
                }
            }
        });
    }

    // Helper functions for table view
    function createIconCell(row, hasItem, tooltipContent = '', isLast = false) {
        const cell = document.createElement('td');
        cell.style.textAlign = 'center';
        
        const container = document.createElement('div');
        container.className = `tooltip-container${isLast ? ' last-column' : ''}`;
        
        const img = document.createElement('img');
        img.src = `images/${hasItem ? 'check' : 'unchecked'}-icon.png`;
        img.alt = hasItem ? 'Yes' : 'No';
        
        container.appendChild(img);
        
        if (tooltipContent) {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.innerHTML = tooltipContent;
            container.appendChild(tooltip);
        }
        
        cell.appendChild(container);
        row.appendChild(cell);
    }

    // Helper functions for tooltip content
    function createTooltipContent(title, items) {
        if (!items || items.length === 0) return '';
        
        let content = `<div class="tooltip-content"><strong>${title}</strong><br>`;
        items.forEach(item => {
            content += `<div class="tooltip-row">${item}</div>`;
        });
        content += '</div>';
        return content;
    }

    function createTrialsTooltip(person) {
        let content = '<div class="tooltip-content"><strong>Clinical Trials</strong><br>';
        
        // Gilead trials
        Object.entries(person.clinical_trials.gilead).forEach(([key, trials]) => {
            if (trials.length > 0) {
                const isHighlighted = filters.gileadCTs === key;
                trials.forEach(trial => {
                    content += `<div class="tooltip-row${isHighlighted ? ' highlighted-row' : ''}">
                        Gilead ${key}: ${trial}
                    </div>`;
                });
            }
        });
        
        // Competitor trials
        Object.entries(person.clinical_trials.competitor).forEach(([key, trials]) => {
            if (trials.length > 0) {
                const isHighlighted = filters.competitorCTs === key;
                trials.forEach(trial => {
                    content += `<div class="tooltip-row${isHighlighted ? ' highlighted-row' : ''}">
                        Competitor ${key}: ${trial}
                    </div>`;
                });
            }
        });
        
        content += '</div>';
        return content;
    }

    function createEducationalTooltip(person) {
        let content = '<div class="tooltip-content"><strong>Educational Events</strong><br>';
        
        person.educational_event.gilead.forEach(event => {
            const isHighlighted = filters.events === 'gilead';
            content += `<div class="tooltip-row${isHighlighted ? ' highlighted-row' : ''}">
                Gilead: ${event}
            </div>`;
        });
        
        person.educational_event.competitor.forEach(event => {
            const isHighlighted = filters.events === 'competitor';
            content += `<div class="tooltip-row${isHighlighted ? ' highlighted-row' : ''}">
                Competitor: ${event}
            </div>`;
        });
        
        content += '</div>';
        return content;
    }

    function createPublicationsTooltip(person) {
        let content = '<div class="tooltip-content"><strong>Publications</strong><br>';
        
        Object.entries(person.publications.gilead).forEach(([key, pubs]) => {
            if (pubs.length > 0) {
                const isHighlighted = filters.gileadPubs === key;
                pubs.forEach(pub => {
                    content += `<div class="tooltip-row${isHighlighted ? ' highlighted-row' : ''}">
                        Gilead ${key}: ${pub}
                    </div>`;
                });
            }
        });
        
        Object.entries(person.publications.competitor).forEach(([key, pubs]) => {
            if (pubs.length > 0) {
                const isHighlighted = filters.competitorPubs === key;
                pubs.forEach(pub => {
                    content += `<div class="tooltip-row${isHighlighted ? ' highlighted-row' : ''}">
                        Competitor ${key}: ${pub}
                    </div>`;
                });
            }
        });
        
        content += '</div>';
        return content;
    }

    // Utility functions
    function hasTrials(person) {
        return Object.values(person.clinical_trials.gilead).some(arr => arr.length > 0) ||
               Object.values(person.clinical_trials.competitor).some(arr => arr.length > 0);
    }

    function hasEducationalEvents(person) {
        return person.educational_event.gilead.length > 0 || 
               person.educational_event.competitor.length > 0;
    }

    function hasPublications(person) {
        return Object.values(person.publications.gilead).some(arr => arr.length > 0) ||
               Object.values(person.publications.competitor).some(arr => arr.length > 0);
    }

    function updateResultsCount(count) {
        document.getElementById('results-count').textContent = count;
    }

    function clearFilters() {
        // Reset filters object while respecting matrix view constraints
        Object.keys(filters).forEach(key => {
            if (currentView === 'matrix' && key === 'status') {
                filters[key] = 'Top 60 EEs';
            } else {
                filters[key] = 'all';
            }
        });
    
        // Reset radio buttons while respecting matrix view constraints
        document.querySelectorAll('input[type="radio"][value="all"]').forEach(radio => {
            if (!(currentView === 'matrix' && radio.name === 'status')) {
                radio.checked = true;
            }
        });
    
        // Ensure Top 60 EEs is selected in matrix view
        if (currentView === 'matrix') {
            document.getElementById('top-60').checked = true;
        }
    
        // Reset regular dropdowns
        document.querySelectorAll('select').forEach(select => {
            select.value = 'all';
        });
    
        // Reset country dropdown
        const countryDropdown = document.querySelector('.custom-dropdown');
        if (countryDropdown) {
            const allCheckbox = countryDropdown.querySelector('#country-all');
            const countryCheckboxes = countryDropdown.querySelectorAll('input[type="checkbox"]');
            if (allCheckbox) {
                allCheckbox.checked = true;
                countryCheckboxes.forEach(cb => {
                    cb.checked = true;
                });
                const button = countryDropdown.querySelector('.dropdown-toggle');
                if (button) {
                    button.textContent = 'All Countries';
                }
            }
        }
    
        refreshCurrentView();
    }

    function populateCountryDropdown() {
        const countries = [...new Set(peopleData.map(person => person.country))]
            .filter(country => country)
            .sort();
        
        const countryFilterContainer = document.getElementById('country-filter');
        if (countryFilterContainer) {
            countryFilterContainer.innerHTML = '';
            const dropdown = createCustomDropdown(countries);
            countryFilterContainer.appendChild(dropdown);
        }
    }

    function createCustomDropdown(countries) {
        const container = document.createElement('div');
        container.className = 'custom-dropdown';
    
        const button = document.createElement('button');
        button.className = 'dropdown-toggle';
        button.textContent = 'All Countries';
        button.type = 'button';
    
        const menu = document.createElement('div');
        menu.className = 'dropdown-menu';
    
        // Create "All" option
        const allContainer = document.createElement('div');
        allContainer.className = 'dropdown-item';
        
        const allCheckbox = document.createElement('input');
        allCheckbox.type = 'checkbox';
        allCheckbox.id = 'country-all';
        allCheckbox.checked = true;
        
        const allLabel = document.createElement('label');
        allLabel.htmlFor = 'country-all';
        allLabel.textContent = 'All Countries';
        
        allContainer.appendChild(allCheckbox);
        allContainer.appendChild(allLabel);
        menu.appendChild(allContainer);
    
        // Add countries
        countries.forEach(country => {
            if (country) {
                const itemContainer = document.createElement('div');
                itemContainer.className = 'dropdown-item';
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `country-${country}`;
                checkbox.checked = true;
                
                const label = document.createElement('label');
                label.htmlFor = `country-${country}`;
                label.textContent = country;
                
                itemContainer.appendChild(checkbox);
                itemContainer.appendChild(label);
                menu.appendChild(itemContainer);
            }
        });
    
        container.appendChild(button);
        container.appendChild(menu);
    
        // Setup event listeners
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('show');
        });
    
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                menu.classList.remove('show');
            }
        });
    
        menu.addEventListener('change', (e) => {
            const checkbox = e.target;
            const allCheckbox = menu.querySelector('#country-all');
            const countryCheckboxes = Array.from(menu.querySelectorAll('input[type="checkbox"]:not(#country-all)'));
            
            if (checkbox.id === 'country-all') {
                countryCheckboxes.forEach(cb => {
                    cb.checked = checkbox.checked;
                });
            } else {
                const checkedCountries = countryCheckboxes.filter(cb => cb.checked);
                allCheckbox.checked = checkedCountries.length === countryCheckboxes.length;
            }
    
            updateDropdownText(button, allCheckbox, countryCheckboxes);
            updateCountryFilters(allCheckbox, countryCheckboxes);
        });
    
        return container;
    }

    function updateDropdownText(button, allCheckbox, countryCheckboxes) {
        const checkedCountries = countryCheckboxes.filter(cb => cb.checked);
        
        if (allCheckbox.checked || checkedCountries.length === countryCheckboxes.length) {
            button.textContent = 'All Countries';
        } else if (checkedCountries.length === 0) {
            button.textContent = 'Select Countries';
        } else if (checkedCountries.length === 1) {
            button.textContent = checkedCountries[0].nextElementSibling.textContent;
        } else {
            button.textContent = `${checkedCountries.length} countries selected`;
        }
    }

    function updateCountryFilters(allCheckbox, countryCheckboxes) {
        if (allCheckbox.checked) {
            filters.country = 'all';
        } else {
            const selectedCountries = countryCheckboxes
                .filter(cb => cb.checked)
                .map(cb => cb.nextElementSibling.textContent);
            filters.country = selectedCountries.length > 0 ? selectedCountries : [''];
        }
        refreshCurrentView();
    }

    function setupDisclaimerModal() {
        const modal = document.getElementById('disclaimer-modal');
        const disclaimerBtn = document.querySelector('button[title="Disclaimer"]');
        const acceptBtn = document.getElementById('accept-disclaimer');

        // Show modal initially
        if (!sessionStorage.getItem('disclaimerAccepted')) {
            modal.style.display = 'block';
        }

        // Setup button handlers
        if (disclaimerBtn) {
            disclaimerBtn.addEventListener('click', () => {
                modal.style.display = 'block';
            });
        }

        if (acceptBtn) {
            acceptBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                sessionStorage.setItem('disclaimerAccepted', 'true');
                initializeData(); // Load data after accepting disclaimer
            });
        }

        // Close on outside click
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Initialize the dashboard if disclaimer was previously accepted
    if (sessionStorage.getItem('disclaimerAccepted')) {
        initializeData();
    }
});
