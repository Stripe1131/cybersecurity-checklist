const CyberChecklist = {
    currentPage: 0,
    pages: ['page1', 'page2', 'page3', 'page4'],

    init() {
        this.showPage(this.currentPage);
        this.setupAccordions();
        
        // Observe changes to active accordion contents
        const observer = new ResizeObserver(() => this.adjustAccordionHeights());
        document.querySelectorAll('.accordion-content').forEach(content => observer.observe(content));
    },

    showPage(pageIndex) {
        // Clear any error states from previous page
        this.clearErrorStates();
        
        this.pages.forEach(pageId => {
            const page = document.getElementById(pageId);
            if (page) page.classList.remove('active');
        });

        const page = document.getElementById(this.pages[pageIndex]);
        if (page) {
            page.classList.add('active');
            const header = page.querySelector('h2');
            if (header) {
                header.setAttribute('tabindex', '-1');
                header.focus();
            }

            this.updateProgress(pageIndex);
            this.updateNavigationButtons();
            this.setupAccordions(); // Re-bind accordions for new page
        }
    },

    updateProgress(index) {
        document.getElementById('pageIndicator').textContent = `Page ${index + 1} of ${this.pages.length}`;
        document.getElementById('progressFill').style.width = `${((index + 1) / this.pages.length) * 100}%`;
    },

    updateNavigationButtons() {
        const currentPageElement = document.querySelector('.page.active');
        const nextBtn = currentPageElement.querySelector('.nextBtn');
        const backBtn = currentPageElement.querySelector('.backBtn');

        if (backBtn) {
            backBtn.style.visibility = this.currentPage === 0 ? 'hidden' : 'visible';
            backBtn.onclick = () => this.prevPage();
        }

        if (nextBtn) {
            if (this.currentPage === this.pages.length - 1) {
                nextBtn.textContent = 'Complete Assessment';
                nextBtn.onclick = () => this.showResults();
            } else {
                nextBtn.textContent = 'Next';
                nextBtn.onclick = () => this.nextPage();
            }
        }
    },

    clearErrorStates() {
        document.querySelectorAll('.accordion-item.error').forEach(item => {
            item.classList.remove('error');
        });
    },

    highlightUnansweredQuestions(unanswered) {
        const currentPageElement = document.getElementById(this.pages[this.currentPage]);
        
        unanswered.forEach(questionName => {
            const fieldset = currentPageElement.querySelector(`input[name="${questionName}"]`)?.closest('.accordion-item');
            if (fieldset) {
                fieldset.classList.add('error');
                
                // Remove error styling after 3 seconds
                setTimeout(() => {
                    fieldset.classList.remove('error');
                }, 3000);
            }
        });
    },

    validateCurrentPage() {
        const currentPageId = this.pages[this.currentPage];
        const currentPageElement = document.getElementById(currentPageId);

        const questions = new Set();
        const answered = new Set();

        currentPageElement.querySelectorAll('input[type="radio"]').forEach(input => {
            questions.add(input.name);
            if (input.checked) {
                answered.add(input.name);
            }
        });

        const unanswered = [...questions].filter(q => !answered.has(q));

        if (unanswered.length > 0) {
            this.showValidationError(unanswered);
            return false;
        }

        return true;
    },

    showValidationError(unanswered) {
        const message = unanswered.length === 1 
            ? "Please answer the highlighted question before continuing."
            : "Please answer all highlighted questions before continuing.";
            
        alert(message);
        this.highlightUnansweredQuestions(unanswered);
    },

    nextPage() {
        if (!this.validateCurrentPage()) {
            return;
        }

        if (this.currentPage < this.pages.length - 1) {
            this.currentPage++;
            this.showPage(this.currentPage);
        }
    },

    prevPage() {
        if (this.currentPage > 0) {
            this.currentPage--;
            this.showPage(this.currentPage);
        }
    },

    setupAccordions() {
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.setAttribute('tabindex', '0');
            header.setAttribute('role', 'button');
            header.setAttribute('aria-expanded', 'false');

            // Remove existing event listeners to prevent duplicates
            header.onclick = null;
            header.onkeydown = null;

            header.onclick = () => this.toggleAccordion(header);
            header.onkeydown = (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleAccordion(header);
                }
            };
        });
    },

    toggleAccordion(header) {
        const content = header.nextElementSibling;
        const isExpanded = header.classList.contains('active');
        const icon = header.querySelector('.accordion-icon');

        header.setAttribute('aria-expanded', (!isExpanded).toString());
        content.setAttribute('aria-hidden', isExpanded ? 'true' : 'false');

        // Close all other accordions on the current page
        const page = document.querySelector('.page.active');
        page.querySelectorAll('.accordion-header').forEach(h => {
            if (h !== header) {
                h.classList.remove('active');
                h.setAttribute('aria-expanded', 'false');
                const i = h.querySelector('.accordion-icon');
                if (i) i.textContent = '▼';
            }
        });

        page.querySelectorAll('.accordion-content').forEach(c => {
            if (c !== content) {
                c.classList.remove('active');
                c.setAttribute('aria-hidden', 'true');
                c.style.maxHeight = null;
            }
        });

        // Toggle the clicked accordion
        if (isExpanded) {
            content.classList.remove('active');
            content.style.maxHeight = null;
            header.classList.remove('active');
            if (icon) icon.textContent = '▼';
        } else {
            content.classList.add('active');
            content.style.maxHeight = content.scrollHeight + 'px';
            header.classList.add('active');
            if (icon) icon.textContent = '▲';
        }
    },

    adjustAccordionHeights() {
        document.querySelectorAll('.accordion-content.active').forEach(content => {
            content.style.maxHeight = content.scrollHeight + 'px';
        });
    },

    calculateScore() {
        const form = document.getElementById('checklist');
        const formData = new FormData(form);
        let score = 0;
        let total = 0;

        for (let [name, value] of formData.entries()) {
            if (name.startsWith('q') && (value === 'yes' || value === 'no')) {
                total++;
                if (value === 'yes') score++;
            }
        }

        return { score, total };
    },

    showResults() {
        if (!this.validateCurrentPage()) {
            return;
        }

        const { score, total } = this.calculateScore();
        const percentage = total > 0 ? (score / total) * 100 : 0;

        // Hide all pages and navigation
        this.pages.forEach(id => document.getElementById(id).style.display = 'none');
        document.querySelectorAll('.button-row').forEach(row => row.style.display = 'none');

        let riskClass, riskLevel, riskMessage;

        if (percentage >= 80) {
            riskClass = 'low';
            riskLevel = 'Low Risk';
            riskMessage = 'Excellent! Your digital security setup appears to be very secure.';
        } else if (percentage >= 60) {
            riskClass = 'low-medium';
            riskLevel = 'Low-Medium Risk';
            riskMessage = 'Good security practices overall, but there are a few areas for improvement.';
        } else if (percentage >= 40) {
            riskClass = 'medium';
            riskLevel = 'Medium Risk';
            riskMessage = 'Several security gaps that should be addressed to reduce your risk.';
        } else if (percentage >= 20) {
            riskClass = 'medium-high';
            riskLevel = 'Medium-High Risk';
            riskMessage = 'Several security vulnerabilities that need attention.';
        } else {
            riskClass = 'high';
            riskLevel = 'High Risk';
            riskMessage = 'Your smart devices and digital accounts may be vulnerable. Consider reviewing your security settings urgently.';
        }

        // Collect recommendations
        const recommendations = [];
        document.querySelectorAll('input[type="radio"]:checked').forEach(input => {
            if (input.value === 'no' && input.dataset.recommendation) {
                recommendations.push(input.dataset.recommendation);
            }
        });

        // Display results
        const resultBox = document.getElementById('resultBox');
        resultBox.className = `result ${riskClass}`;
        
        const recommendationsHtml = recommendations.length 
            ? `<h4>Recommendations for improvement:</h4><ul>${recommendations.map(r => `<li>${r}</li>`).join('')}</ul>`
            : `<p>You're doing great! No immediate actions recommended.</p>`;

        resultBox.innerHTML = `
            <h3>${riskLevel}</h3>
            <p>You scored ${score} out of ${total} (${Math.round(percentage)}%)</p>
            <p>${riskMessage}</p>
            ${recommendationsHtml}
            <button class="btn nextBtn" onclick="CyberChecklist.restartChecklist()">Start Over</button>
        `;
        
        resultBox.style.display = 'block';

        // Update progress indicator
        document.getElementById('pageIndicator').textContent = 'Assessment Complete';
        document.getElementById('progressFill').style.width = '100%';
    },

    restartChecklist() {
        // Reset form
        document.getElementById('checklist').reset();
        
        // Hide results
        const result = document.getElementById('resultBox');
        result.style.display = 'none';
        result.innerHTML = '';
        
        // Reset page state
        this.currentPage = 0;

        // Show all pages again
        this.pages.forEach(id => {
            const page = document.getElementById(id);
            if (page) page.style.display = 'block';
        });

        // Show navigation buttons
        document.querySelectorAll('.button-row').forEach(row => {
            row.style.display = 'flex';
        });

        // Reset accordion states
        document.querySelectorAll('.accordion-header').forEach(h => {
            h.classList.remove('active');
            h.setAttribute('aria-expanded', 'false');
            const icon = h.querySelector('.accordion-icon');
            if (icon) icon.textContent = '▼';
        });

        document.querySelectorAll('.accordion-content').forEach(c => {
            c.classList.remove('active');
            c.setAttribute('aria-hidden', 'true');
            c.style.maxHeight = null;
        });

        // Clear any error states
        this.clearErrorStates();

        // Show first page
        this.showPage(this.currentPage);
    }
};

// Create global alias for HTML onclick handlers
window.checklist = CyberChecklist;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => CyberChecklist.init());