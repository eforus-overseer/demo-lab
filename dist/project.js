(() => {
  const project = JSON.parse(document.querySelector('#project-data').textContent);
  const base = '../../';
  const tabs = Array.from(document.querySelectorAll('[data-step]'));
  function selectStep(index, focus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    const panel = document.querySelector('#step-panel');
    panel.setAttribute('aria-labelledby', 'step-' + index);
    panel.querySelector('h3').textContent = project.steps[index][0];
    panel.querySelector('p').textContent = project.steps[index][1];
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectStep(i));
    tab.addEventListener('keydown', event => {
      let index = i;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') index = (i + 1) % tabs.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') index = (i + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = tabs.length - 1;
      else return;
      event.preventDefault();
      selectStep(index, true);
    });
  });
  const modal = document.querySelector('#image-modal');
  document.addEventListener('click', event => {
    const trigger = event.target.closest('.zoom');
    if (!trigger) return;
    const media = project.media[Number(trigger.dataset.index)];
    document.querySelector('#modal-image').src = base + media.path;
    document.querySelector('#modal-image').alt = media.caption;
    document.querySelector('#modal-caption').textContent = media.caption;
    modal.showModal();
  });
  document.querySelector('#close-modal').addEventListener('click', () => modal.close());
  modal.addEventListener('click', event => { if (event.target === modal) modal.close(); });
  const launch = document.querySelector('#launch-app');
  if (launch) launch.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.className = 'app-frame';
    iframe.title = project.title + ' playable demo';
    iframe.allow = 'fullscreen; gamepad';
    iframe.src = launch.dataset.url;
    document.querySelector('#app-mount').replaceChildren(iframe);
    document.querySelector('#app-launch').hidden = true;
  });
  document.querySelectorAll('[data-recording]').forEach(button => button.addEventListener('click', () => {
    const media = project.media[Number(button.dataset.recording)];
    document.querySelector('#recording-image').src = base + media.path;
    document.querySelector('#recording-image').alt = media.caption;
    document.querySelector('#recording-source').href = media.source;
    document.querySelectorAll('[data-recording]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  }));
  if (project.widget) window.DemoLabs.mount(document.querySelector('#lab'), project, base);
})();
