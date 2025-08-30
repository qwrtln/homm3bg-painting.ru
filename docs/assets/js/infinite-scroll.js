window.onload = function() {
  const contentContainer = document.querySelector('.md-content__inner');
  if (!contentContainer) return;

  // Hide pagination elements with CSS
  const style = document.createElement('style');
  style.textContent = `
    .pagination, .md-pagination, .paginator, .md-footer-nav,
    nav[aria-label="Pagination"], ul.page-nav, .page-links {
      display: none !important;
    }
  `;
  document.head.appendChild(style);

  let currentPage = 1;
  let loading = false;
  let allLoaded = false;

  const sentinel = document.createElement('div');
  sentinel.className = 'scroll-sentinel';
  sentinel.style.height = '10px';
  sentinel.style.width = '100%';

  const loadingIndicator = document.createElement('div');
  loadingIndicator.textContent = 'Loading more posts...';
  loadingIndicator.className = 'loading-indicator';
  loadingIndicator.style.textAlign = 'center';
  loadingIndicator.style.padding = '20px';
  loadingIndicator.style.display = 'none';
  loadingIndicator.style.color = 'var(--md-default-fg-color--light)';

  contentContainer.appendChild(sentinel);
  contentContainer.appendChild(loadingIndicator);

  function loadMorePosts() {
    if (loading || allLoaded) return;

    loading = true;
    loadingIndicator.style.display = 'block';

    currentPage++;

    let baseUrl = window.location.origin;
    let pathParts = window.location.pathname.split('/');

    if (pathParts.includes('page')) {
      const pageIndex = pathParts.indexOf('page');
      pathParts = pathParts.slice(0, pageIndex);
    }

    const basePath = pathParts.filter(p => p).join('/');
    const nextPageUrl = `${baseUrl}/${basePath ? basePath + '/' : ''}page/${currentPage}/`;

    fetch(nextPageUrl)
      .then(response => {
        if (!response.ok) {
          loadingIndicator.style.display = 'none';
          allLoaded = true;
          return null;
        }
        return response.text();
      })
      .then(html => {
        if (!html) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const content = doc.querySelector('.md-content__inner');
        if (!content) {
          loading = false;
          loadingIndicator.style.display = 'none';
          return;
        }

        const selectors = ['.md-post', 'article', '.md-typeset > div', '.md-grid > div'];
        let newPosts = [];

        for (const selector of selectors) {
          const foundInDoc = Array.from(doc.querySelectorAll(selector));
          const foundInContent = Array.from(content.querySelectorAll(selector));

          if (foundInDoc.length > 0 && newPosts.length === 0) {
            newPosts = foundInDoc;
          }
          if (foundInContent.length > foundInDoc.length && newPosts.length <= foundInContent.length) {
            newPosts = foundInContent;
          }
        }

        if (newPosts.length === 0) {
          newPosts = [content];
        }

        if (newPosts.length === 0) {
          loadingIndicator.style.display = 'none';
          allLoaded = true;
          return;
        }

        newPosts.forEach(post => {
          contentContainer.insertBefore(post.cloneNode(true), sentinel);
        });

        loading = false;
        loadingIndicator.style.display = 'none';
      })
      .catch(error => {
        loadingIndicator.style.display = 'none';
        loading = false;
      });
  }

  const observer = new IntersectionObserver((entries) => {
    const entry = entries[0];

    if (entry.isIntersecting && !loading && !allLoaded) {
      loadMorePosts();
    }
  }, {
    root: null,
    rootMargin: '0px 0px 500px 0px',
    threshold: 0.1
  });

  observer.observe(sentinel);

  window.addEventListener('scroll', function() {
    if (loading || allLoaded) return;

    const scrollPosition = window.scrollY + window.innerHeight;
    const sentinelPosition = sentinel.offsetTop;
    const buffer = 500;

    if (scrollPosition > sentinelPosition - buffer) {
      loadMorePosts();
    }
  }, { passive: true });
};
