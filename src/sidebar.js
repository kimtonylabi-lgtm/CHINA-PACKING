
// Sidebar Logic
window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const app = document.getElementById('app');

    if (sidebar) {
        sidebar.classList.toggle('open');
    }
};

window.filterProjects = (filterType) => {
    // Update UI active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // Find the clicked item (event target or parent li)
    // Since onclick is on the li, 'this' in inline handler refers to the element? 
    // No, inline 'onclick' has 'this' as the element, but we are calling window.filterProjects.
    // We need to find the correct element.
    // Let's rely on event.currentTarget
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    console.log(`Filtering by ${filterType}`);

    // Call Main Logic Filter
    if (window.setProjectFilter) {
        window.setProjectFilter(filterType);
    }

    // On mobile, close sidebar after selection
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('open')) {
            window.toggleSidebar();
        }
    }
};

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');

    if (window.innerWidth < 1024 &&
        sidebar &&
        sidebar.classList.contains('open') &&
        !sidebar.contains(e.target) &&
        !toggleBtn.contains(e.target)) {
        window.toggleSidebar();
    }
});
