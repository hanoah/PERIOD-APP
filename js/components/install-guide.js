/**
 * Install guide — how to add the app to your home screen.
 */

export function renderInstallGuide(container) {
  const ua = navigator.userAgent.toLowerCase();
  const isIPhone = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  const iphoneSteps = `
    <ol class="install-steps">
      <li>Tap the <strong>Share</strong> button (square with arrow) at the bottom of Safari.</li>
      <li>Scroll and tap <strong>Add to Home Screen</strong>.</li>
      <li>Edit the name if you like, then tap <strong>Add</strong>.</li>
    </ol>
  `;

  const androidSteps = `
    <ol class="install-steps">
      <li>Tap the <strong>menu</strong> (three dots) in Chrome.</li>
      <li>Tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
      <li>Confirm if prompted.</li>
    </ol>
  `;

  let content = '';
  if (isIPhone) {
    content = `
      <div class="card">
        <h3>iPhone / iPad</h3>
        ${iphoneSteps}
      </div>
    `;
  } else if (isAndroid) {
    content = `
      <div class="card">
        <h3>Android</h3>
        ${androidSteps}
      </div>
    `;
  } else {
    content = `
      <div class="card">
        <h3>iPhone / iPad</h3>
        ${iphoneSteps}
      </div>
      <div class="card">
        <h3>Android</h3>
        ${androidSteps}
      </div>
    `;
  }

  container.innerHTML = `
    <h1 class="page-title">Add to Home Screen</h1>
    <p class="install-intro">Install the app for quick access and a full-screen experience.</p>
    ${content}
    <div class="install-actions">
      <a href="#/settings" class="btn btn-secondary">Back to Settings</a>
    </div>
  `;
}
