function setActiveNav(page) {
  if (!page) return
  document.querySelectorAll(`.nav-link[data-nav="${page}"]`).forEach((el) => {
    el.classList.add('is-active')
  })
  document.querySelectorAll(`.mobile-nav a[data-nav="${page}"]`).forEach((el) => {
    el.classList.add('is-active')
  })
}

async function loadSidebar() {
  const host = document.getElementById('app-sidebar')
  if (!host) return

  const page = document.body.dataset.page

  try {
    const response = await fetch('partials/sidebar-inner.html')
    if (!response.ok) throw new Error('sidebar partial not found')
    host.innerHTML = await response.text()
    setActiveNav(page)
  } catch {
    setActiveNav(page)
  }
}

loadSidebar()
