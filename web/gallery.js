(() => {
  const cards = Array.from(document.querySelectorAll('.card'));
  const search = document.querySelector('#search');
  const mode = document.querySelector('#mode');
  let category = 'All';
  function filter() {
    const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    let count = 0;
    cards.forEach(card => {
      const show = (category === 'All' || card.dataset.category === category) &&
        (mode.value === 'All' || card.dataset.mode === mode.value) &&
        terms.every(term => card.dataset.title.includes(term));
      card.hidden = !show;
      count += Number(show);
    });
    document.querySelector('#result-count').textContent = count + ' of ' + cards.length + ' projects';
    document.querySelector('#empty').hidden = count !== 0;
  }
  search.addEventListener('input', filter);
  mode.addEventListener('change', filter);
  document.querySelectorAll('.tabs button').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.category;
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    filter();
  }));
})();
