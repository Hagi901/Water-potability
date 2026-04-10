// script.js
// Global utilities
const UI = {
  showNotification(message, type = 'info', duration = 3000) {
    const popup = document.createElement('div');
    popup.className = `info-popup ${type}`;
    popup.innerHTML = `<p class="info-popup-text">${message}</p>`;
    document.body.appendChild(popup);
    
    setTimeout(() => {
      popup.style.animation = 'slideDown 0.4s ease reverse';
      setTimeout(() => popup.remove(), 400);
    }, duration);
  },

  showModal(title, content, buttons = []) {
    let modal = document.getElementById('customModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'customModal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    const buttonHTML = buttons.map(btn => 
      `<button class="modal-btn ${btn.class || 'modal-btn-primary'}" onclick="${btn.action}">${btn.text}</button>`
    ).join('');

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2><i class="fas fa-info-circle"></i> ${title}</h2>
          <button class="modal-close" onclick="UI.closeModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        ${buttons.length > 0 ? `<div class="modal-footer">${buttonHTML}</div>` : ''}
      </div>
    `;

    modal.classList.add('show');
  },

  closeModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
      modal.classList.remove('show');
    }
  }
};

// Advanced Tooltip System
const AdvancedTooltip = {
  tooltip: null,
  timeoutId: null,

  init() {
    if (!this.tooltip) {
      this.tooltip = document.createElement('div');
      this.tooltip.className = 'tooltip';
      document.body.appendChild(this.tooltip);
    }
  },

  show(text, x, y) {
    clearTimeout(this.timeoutId);
    this.tooltip.textContent = text;
    this.tooltip.style.opacity = '1';
    this.tooltip.style.left = (x - this.tooltip.offsetWidth / 2) + 'px';
    this.tooltip.style.top = (y - 10) + 'px';
  },

  hide() {
    this.timeoutId = setTimeout(() => {
      this.tooltip.style.opacity = '0';
    }, 200);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  AdvancedTooltip.init();

  // Form validation and submission
  const form = document.getElementById("predictionForm");
  const loader = document.getElementById("loader");
  const submitBtn = document.getElementById("submitBtn");
  const inputs = form.querySelectorAll("input");

  form.addEventListener("submit", function (e) {
    let valid = true;
    let emptyFields = [];

    inputs.forEach((input) => {
      const value = input.value.trim();
      if (value === "" || isNaN(value)) {
        input.style.borderColor = "var(--danger)";
        input.style.boxShadow = "0 0 0 4px rgba(231, 76, 60, 0.15)";
        valid = false;
        emptyFields.push(input.id);
      } else {
        input.style.borderColor = "#ddd";
        input.style.boxShadow = "none";
      }
    });

    if (!valid) {
      e.preventDefault();
      UI.showNotification(`Mohon isi semua field: ${emptyFields.join(', ')}`, 'error');
    } else {
      loader.classList.remove("hidden");
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Memproses...';
    }
  });

  // Visualization gallery navigation with smooth transitions
  const galleryItems = document.querySelectorAll(".gallery-item");
  const tabContents = document.querySelectorAll(".tab-content");

  galleryItems.forEach((item) => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-tab");

      // Update active state
      galleryItems.forEach((btn) => btn.classList.remove("active"));
      tabContents.forEach((tab) => tab.classList.remove("active"));

      // Set new active with animation
      item.classList.add("active");
      const targetTab = document.getElementById(target);
      targetTab.classList.add("active");
      
      // Scroll visualization into view smoothly
      targetTab.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });

  // Add hover effects to gallery items
  galleryItems.forEach((item) => {
    item.addEventListener('mouseenter', (e) => {
      const text = item.querySelector('span')?.textContent;
      if (text) {
        const rect = item.getBoundingClientRect();
        AdvancedTooltip.show(text, rect.left + rect.width / 2, rect.top - 10);
      }
    });

    item.addEventListener('mouseleave', () => {
      AdvancedTooltip.hide();
    });
  });

  // Histogram Selector
  const histogramSelector = document.getElementById("histogramFeatureSelector");
  const histogramImage = document.getElementById("histogramImage");
  const histogramTitle = document.getElementById("histogramTitle");
  const baseImagePath = "/static/img/hist_";

  if (histogramSelector) {
    histogramSelector.addEventListener("change", function () {
      const selectedFeature = this.value;
      if (selectedFeature) {
        histogramImage.src = baseImagePath + selectedFeature + ".png";
        histogramImage.classList.remove("hidden");
        histogramTitle.textContent = `Distribusi ${selectedFeature}`;

        histogramImage.onerror = function () {
          UI.showNotification(`Gambar tidak tersedia untuk fitur ${selectedFeature}`, 'error');
          histogramImage.classList.add("hidden");
          histogramTitle.textContent = "Gambar tidak tersedia untuk fitur ini";
        };
      } else {
        histogramImage.classList.add("hidden");
        histogramTitle.textContent = "Pilih fitur untuk menampilkan histogram";
      }
    });
  }

  // Summary content is now always visible, removed toggle functionality

  // Enhanced Tooltip functionality with advanced positioning
  const infoIcons = document.querySelectorAll(".info-icon");

  infoIcons.forEach((icon) => {
    icon.addEventListener("mouseenter", (e) => {
      const tooltipText = icon.getAttribute("data-tooltip");
      const rect = icon.getBoundingClientRect();
      const y = rect.bottom + window.scrollY + 8;
      const x = rect.left + window.scrollX + rect.width / 2;
      
      AdvancedTooltip.show(tooltipText, x, y);
    });

    icon.addEventListener("mouseleave", () => {
      AdvancedTooltip.hide();
    });

    // Add click to show modal info
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      const field = icon.closest('.input-group')?.querySelector('label').textContent.trim();
      const tooltipText = icon.getAttribute("data-tooltip");
      
      UI.showModal(
        `<i class="fas fa-water"></i> ${field}`,
        `<p>${tooltipText}</p>`,
        [
          { text: 'Tutup', action: 'UI.closeModal()', class: 'modal-btn-secondary' }
        ]
      );
    });
  });

  // Enhanced input focus effects with animations
  inputs.forEach((input) => {
    input.addEventListener("focus", () => {
      const label = input.closest('.input-group').querySelector("label");
      label.style.color = "var(--primary)";
      label.style.transform = "scale(1.05)";
    });

    input.addEventListener("blur", () => {
      const label = input.closest('.input-group').querySelector("label");
      label.style.color = "var(--dark)";
      label.style.transform = "scale(1)";
    });

    // Real-time validation feedback
    input.addEventListener("input", () => {
      const value = input.value.trim();
      if (value && isNaN(value)) {
        input.style.borderColor = "var(--danger)";
      } else if (value) {
        input.style.borderColor = "var(--success)";
      } else {
        input.style.borderColor = "#ddd";
      }
    });
  });

  // Add click effect to metric cards to show details
  const metricCards = document.querySelectorAll(".metric-card");
  metricCards.forEach((card) => {
    card.addEventListener("click", function() {
      const value = this.querySelector(".metric-value").textContent;
      const label = this.querySelector(".metric-label").textContent;
      UI.showNotification(`${label}: ${value}`, 'info', 2000);
    });
  });

  // Smooth page transitions
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[href]");
    if (link && !link.target) {
      // Add smooth transition effect
      document.body.style.opacity = "0.9";
    }
  });
});
