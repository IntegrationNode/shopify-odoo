/**
 * Interactive Demo Carousel with Lazy-Loaded Videos
 *
 * Features:
 * - Navigate through demo cards with prev/next buttons
 * - Show 3 cards on desktop, 1 on mobile
 * - Lazy-load demo videos (preload="none") on hover; autoplay visible ones on mobile
 * - Smooth transitions
 * - Keyboard navigation support
 */

(function() {
    'use strict';

    // Configuration
    const CONFIG = {
        cardsPerViewDesktop: 3,
        cardsPerViewMobile: 1,
        breakpoint: 768,
        rootMargin: '100px',
        threshold: 0.1
    };

    // State
    const state = {
        currentIndex: 0,
        cardsPerView: window.innerWidth > CONFIG.breakpoint ? CONFIG.cardsPerViewDesktop : CONFIG.cardsPerViewMobile,
        totalCards: 0,
        totalPages: 0,
        sectionVisible: false
    };

    // DOM Elements
    let track, cards, prevBtn, nextBtn, demoSection;

    /**
     * Initialize carousel
     */
    function init() {
        // Get DOM elements
        track = document.querySelector('.carousel-track');
        prevBtn = document.querySelector('.carousel-prev');
        nextBtn = document.querySelector('.carousel-next');
        demoSection = document.querySelector('#demo');

        if (!track || !prevBtn || !nextBtn || !demoSection) {
            console.warn('[Carousel] Required elements not found');
            return;
        }

        cards = Array.from(track.children);
        state.totalCards = cards.length;
        state.totalPages = Math.ceil(state.totalCards / state.cardsPerView);

        // Setup event listeners
        setupNavigation();
        setupHoverGifLoading();
        setupIntersectionObserver();
        setupKeyboardNavigation();
        setupResizeHandler();
        setupLightboxHandlers();

        // Initial state
        updateButtonStates();

        console.log('[Carousel] Initialized with', state.totalCards, 'cards');
    }

    /**
     * Setup navigation buttons
     */
    function setupNavigation() {
        prevBtn.addEventListener('click', goToPrevPage);
        nextBtn.addEventListener('click', goToNextPage);
    }

    /**
     * Go to previous page
     */
    function goToPrevPage() {
        if (state.currentIndex > 0) {
            state.currentIndex--;
            moveToPage(state.currentIndex);
        }
    }

    /**
     * Go to next page
     */
    function goToNextPage() {
        if (state.currentIndex < state.totalPages - 1) {
            state.currentIndex++;
            moveToPage(state.currentIndex);
        }
    }

    /**
     * Move carousel to specific page
     */
    function moveToPage(pageIndex) {
        const cardWidth = cards[0].getBoundingClientRect().width;
        const gap = parseInt(getComputedStyle(track).gap) || 32;
        const moveAmount = (cardWidth + gap) * state.cardsPerView * pageIndex;

        track.style.transform = `translateX(-${moveAmount}px)`;

        updateButtonStates();

        console.log('[Carousel] Moved to page', pageIndex + 1, 'of', state.totalPages);
    }

    /**
     * Update button enabled/disabled states
     */
    function updateButtonStates() {
        prevBtn.disabled = state.currentIndex === 0;
        nextBtn.disabled = state.currentIndex === state.totalPages - 1;
    }

    /**
     * Read the demo video's source URL (already path-resolved by static-i18n)
     */
    function getVideoUrl(video) {
        return video?.querySelector('source')?.getAttribute('src') || '';
    }

    /**
     * Play a demo video from the start (preload="none" → play() triggers the download)
     */
    function playVideo(video) {
        try { video.currentTime = 0; } catch (e) { /* not loaded yet */ }
        const p = video.play();
        if (p && p.catch) p.catch(() => { /* autoplay/user-gesture rejection: ignore */ });
    }

    /**
     * Setup hover video loading
     */
    function setupHoverGifLoading() {
        cards.forEach(card => {
            const media = card.querySelector('.demo-media');
            const video = card.querySelector('.demo-gif');
            const stillImg = card.querySelector('.demo-still');

            if (!video) return;

            // Reveal the video only once it actually starts playing,
            // so preload="none" never shows a black frame over the thumbnail.
            video.addEventListener('playing', function() {
                video.style.opacity = '1';
                if (stillImg) stillImg.style.opacity = '0';
            });

            // Play on hover
            media.addEventListener('mouseenter', function() {
                if (state.sectionVisible) {
                    playVideo(video);
                }
            });

            // Reset to thumbnail on mouseleave
            media.addEventListener('mouseleave', function() {
                video.pause();
                video.style.opacity = '0';
                if (stillImg) stillImg.style.opacity = '1';
            });

            // Open lightbox on click
            media.addEventListener('click', function(e) {
                e.preventDefault();
                const url = getVideoUrl(video);
                if (url && state.sectionVisible) {
                    openLightbox(url);
                }
            });
        });
    }

    /**
     * Open lightbox with the demo video
     */
    function openLightbox(videoUrl) {
        const lightbox = document.getElementById('demo-lightbox');
        const lightboxVideo = lightbox?.querySelector('.demo-lightbox-image');

        if (!lightbox || !lightboxVideo) return;

        // Set source and play
        lightboxVideo.src = videoUrl;
        playVideo(lightboxVideo);

        // Show lightbox
        lightbox.classList.add('active');
        lightbox.setAttribute('aria-hidden', 'false');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log('[Carousel] Lightbox opened:', videoUrl);
    }

    /**
     * Close lightbox
     */
    function closeLightbox() {
        const lightbox = document.getElementById('demo-lightbox');

        if (!lightbox) return;

        // Hide lightbox
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');

        // Restore body scroll
        document.body.style.overflow = '';

        // Stop and clear the video after the close animation
        setTimeout(() => {
            const lightboxVideo = lightbox.querySelector('.demo-lightbox-image');
            if (lightboxVideo) {
                lightboxVideo.pause();
                lightboxVideo.removeAttribute('src');
                lightboxVideo.load();
            }
        }, 200); // Match transition time

        console.log('[Carousel] Lightbox closed');
    }

    /**
     * Setup lightbox close handlers
     */
    function setupLightboxHandlers() {
        const lightbox = document.getElementById('demo-lightbox');

        if (!lightbox) return;

        // Close on click anywhere
        lightbox.addEventListener('click', closeLightbox);

        // Close on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });

        // Close on scroll
        window.addEventListener('scroll', function() {
            if (lightbox.classList.contains('active')) {
                closeLightbox();
            }
        }, { passive: true });
    }

    /**
     * Setup Intersection Observer for section visibility
     */
    function setupIntersectionObserver() {
        const observer = new IntersectionObserver(handleSectionVisibility, {
            rootMargin: CONFIG.rootMargin,
            threshold: CONFIG.threshold
        });

        observer.observe(demoSection);
    }

    /**
     * Handle section visibility
     */
    function handleSectionVisibility(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting && !state.sectionVisible) {
                state.sectionVisible = true;
                console.log('[Carousel] Section visible, enabling GIF loading');

                // On mobile, autoplay all visible GIFs
                if (window.innerWidth <= CONFIG.breakpoint) {
                    autoplayVisibleGifs();
                }
            }
        });
    }

    /**
     * Autoplay visible videos (mobile — no hover available)
     */
    function autoplayVisibleGifs() {
        getVisibleCards().forEach(card => {
            const video = card.querySelector('.demo-gif');
            if (video) {
                // The 'playing' listener reveals the video over the thumbnail
                playVideo(video);
            }
        });
    }

    /**
     * Get currently visible cards
     */
    function getVisibleCards() {
        const startIndex = state.currentIndex * state.cardsPerView;
        const endIndex = Math.min(startIndex + state.cardsPerView, state.totalCards);
        return cards.slice(startIndex, endIndex);
    }

    /**
     * Setup keyboard navigation
     */
    function setupKeyboardNavigation() {
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft') {
                goToPrevPage();
            } else if (e.key === 'ArrowRight') {
                goToNextPage();
            }
        });
    }

    /**
     * Setup resize handler
     */
    function setupResizeHandler() {
        let resizeTimeout;

        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(handleResize, 250);
        });
    }

    /**
     * Handle window resize
     */
    function handleResize() {
        const newCardsPerView = window.innerWidth > CONFIG.breakpoint
            ? CONFIG.cardsPerViewDesktop
            : CONFIG.cardsPerViewMobile;

        if (newCardsPerView !== state.cardsPerView) {
            console.log('[Carousel] Viewport changed, recalculating...');

            state.cardsPerView = newCardsPerView;
            state.totalPages = Math.ceil(state.totalCards / state.cardsPerView);

            // Reset to first page
            state.currentIndex = 0;
            moveToPage(0);

            // On mobile, autoplay visible GIFs
            if (window.innerWidth <= CONFIG.breakpoint && state.sectionVisible) {
                autoplayVisibleGifs();
            }
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for debugging
    window.carouselDebug = {
        getState: () => state,
        getConfig: () => CONFIG,
        goToPage: moveToPage,
        resetCarousel: init
    };

})();
