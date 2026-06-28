/**
 * Monthly / annual billing toggle.
 *
 * Self-contained, no network. Swaps the displayed price between the
 * `data-monthly` and `data-annual` attributes of each `.amount`, toggles the
 * `/month` ↔ `/year` period labels and the "2 months free" badge.
 *
 * Default state is monthly (the HTML renders the monthly amount and the
 * `.period-month` label, so the page is correct even if this script never runs).
 */
(function () {
    'use strict';

    function setBilling(mode) {
        var annual = mode === 'annual';

        // Prices
        var amounts = document.querySelectorAll('.amount[data-monthly][data-annual]');
        for (var i = 0; i < amounts.length; i++) {
            var el = amounts[i];
            var value = annual ? el.getAttribute('data-annual') : el.getAttribute('data-monthly');
            if (value) el.textContent = value;
        }

        // Period labels (/month ↔ /year)
        toggleHidden('.period-month', !annual);
        toggleHidden('.period-year', annual);

        // "2 months free" badge — only in annual view
        toggleHidden('.two-months-free', annual);

        // Toggle buttons state
        var options = document.querySelectorAll('.billing-option');
        for (var j = 0; j < options.length; j++) {
            var opt = options[j];
            var isActive = opt.getAttribute('data-billing') === mode;
            opt.classList.toggle('active', isActive);
            opt.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        }
    }

    function toggleHidden(selector, visible) {
        var nodes = document.querySelectorAll(selector);
        for (var i = 0; i < nodes.length; i++) {
            if (visible) {
                nodes[i].removeAttribute('hidden');
            } else {
                nodes[i].setAttribute('hidden', '');
            }
        }
    }

    function init() {
        var options = document.querySelectorAll('.billing-option');
        if (!options.length) return;
        for (var i = 0; i < options.length; i++) {
            options[i].addEventListener('click', function (e) {
                e.preventDefault();
                setBilling(this.getAttribute('data-billing'));
            });
        }
        // Start on monthly (matches the static HTML).
        setBilling('monthly');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
