(function () {
  var section = document.querySelector('.social-proof');
  if (!section) return;

  var userEl = document.getElementById('cws-user-count');
  var countryEl = document.getElementById('cws-country-count');
  var countryStat = document.getElementById('cws-countries-stat');
  if (!userEl) return;

  // Resolve path for multi-language subdirectories
  var path = window.location.pathname;
  var isSubLang = /\/(es|fr|de|it|pt|nl|pl)\//.test(path);
  var prefix = isSubLang ? '../' : '';

  function countUp(el, target, suffix, duration) {
    var start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      // Ease-out: decelerates towards the end
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.floor(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }
    requestAnimationFrame(step);
  }

  function startAnimation(users, countries) {
    countUp(userEl, users, '+', 1500);
    if (countries > 0 && countryEl && countryStat) {
      countryStat.style.display = '';
      countUp(countryEl, countries, '', 1500);
    }
  }

  fetch(prefix + 'assets/data/cws-stats.json')
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (!data || !data.users) return;

      var users = parseInt(data.users, 10);
      var countries = parseInt(data.countries, 10) || 0;
      if (isNaN(users)) return;

      // Set initial values before animation
      userEl.textContent = '0+';
      if (countries > 0 && countryEl) countryEl.textContent = '0';

      // Animate when section enters viewport
      if ('IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) {
            startAnimation(users, countries);
            observer.unobserve(section);
          }
        }, { threshold: 0.3 });
        observer.observe(section);
      } else {
        // Fallback: animate immediately
        startAnimation(users, countries);
      }
    })
    .catch(function () {
      // Fail silently — keep the dash placeholder
    });
})();
