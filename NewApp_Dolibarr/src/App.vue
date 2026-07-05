<script setup>
</script>

<template>
  <div class="app-container">
    <nav class="nav-bar">
      <div class="nav-brand">
        <a href="/">Dolibarr GRH</a>
      </div>
      <div class="nav-links">
        <router-link to="/salaries" class="nav-link">Salariés</router-link>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>

    <footer class="footer">
      <p>FrontOffice Dolibarr - Module RH</p>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: #f1f5f9;
  color: #334155;
  line-height: 1.5;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Navigation */
.nav-bar {
  background: white;
  padding: 0 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand a {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  text-decoration: none;
}

.nav-links {
  display: flex;
  gap: 1rem;
}

.nav-link {
  padding: 0.5rem 1rem;
  color: #64748b;
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.2s;
}

.nav-link:hover {
  background: #f1f5f9;
  color: #1e293b;
}

.nav-link.router-link-active {
  background: #3b82f6;
  color: white;
}

/* Main content */
.main-content {
  flex: 1;
}

/* Footer */
.footer {
  padding: 1rem 2rem;
  background: white;
  border-top: 1px solid #e2e8f0;
  text-align: center;
}

.footer p {
  font-size: 0.75rem;
  color: #94a3b8;
}
</style>
