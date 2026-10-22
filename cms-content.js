(() => {
  const text = (selector, value, root = document) => {
    const node = root.querySelector(selector);
    if (node && typeof value === 'string') node.textContent = value;
  };
  const image = (selector, value, root = document) => {
    const node = root.querySelector(selector);
    if (node && typeof value === 'string' && value) node.src = value;
  };
  const richTitle = (node, first, second) => {
    if (!node) return;
    const safe = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    node.innerHTML = `${safe(first)}<br><em>${safe(second)}</em>`;
  };
  const apply = content => {
    if (!content || typeof content !== 'object') return;
    const hero = content.hero || {}, brand = content.brand || {}, announcement = content.announcement || {};
    const logos = document.querySelectorAll('.logo img');
    if (brand.logo && logos[0]) logos[0].src = brand.logo;
    if (brand.footerLogo && logos[1]) logos[1].src = brand.footerLogo;
    text('#flyer-title', announcement.title);
    text('.flyer-kicker', announcement.eyebrow);
    text('#flyer-description', announcement.description);
    const flyerButton = document.querySelector('.flyer-cta');
    if (flyerButton && announcement.button) flyerButton.firstChild.textContent = `${announcement.button} `;

    const heroTitle = document.querySelector('.hero-title');
    richTitle(heroTitle, hero.titleLine1, hero.titleLine2);
    text('.hero .lead', hero.description);
    image('.hero-visual img', hero.portrait);
    const heroButtons = document.querySelectorAll('.hero .actions .btn');
    if (heroButtons[0] && hero.primaryButton) heroButtons[0].firstChild.textContent = hero.primaryButton;
    if (heroButtons[1] && hero.secondaryButton) heroButtons[1].textContent = hero.secondaryButton;

    const essence = content.essence || {};
    text('#esencia .head h2', essence.title);
    text('#esencia .head p', essence.description);
    const essenceCards = document.querySelectorAll('#esencia .duo article');
    [[essence.missionTitle, essence.mission], [essence.visionTitle, essence.vision]].forEach(([title, description], i) => {
      if (essenceCards[i]) { text('h3', title, essenceCards[i]); text('p', description, essenceCards[i]); }
    });
    (content.values || []).forEach((value, i) => {
      const card = document.querySelectorAll('#esencia .grid .card')[i];
      if (card) { text('h3', value.title, card); text('p', value.description, card); }
    });

    (content.programs || []).forEach((program, i) => {
      const card = document.querySelectorAll('.program-card')[i];
      if (!card) return;
      text('.program-kicker', program.kicker, card); text('h3', program.title, card);
      text('.program-desc', program.description, card);
      text('.program-bottom>b', program.format, card);
      const list = card.querySelector('ul');
      if (list && Array.isArray(program.benefits)) {
        list.replaceChildren(...program.benefits.map(item => { const li = document.createElement('li'); li.textContent = item; return li; }));
      }
    });

    const talks = Array.isArray(content.talks) ? content.talks : [];
    talks.forEach((talk, i) => {
      const option = document.querySelectorAll('.talk-option')[i];
      if (option) { text('.talk-option-number', talk.number, option); text('.talk-option-title', talk.title, option); text('.talk-option-date', talk.date, option); }
    });
    if (talks.length) {
      window.dispatchEvent(new CustomEvent('impulso:cmsContent', { detail: content }));
      const active = Math.max(0, talks.findIndex(item => item.number === '04'));
      const talk = talks[active] || talks[0], panel = document.querySelector('.talk-feature');
      if (panel && talk) {
        text('.talk-date-day', talk.day, panel); text('.talk-date-month', talk.month, panel);
        text('.talk-number', `TALLER ${talk.number}`, panel); text('.talk-time', talk.time, panel);
        text('.talk-title', talk.title, panel); text('.talk-description', talk.description, panel);
        const reserve = panel.querySelector('.talk-reserve');
        if (reserve) reserve.href = `https://wa.me/${brand.whatsappPhone || '51905584657'}?text=${encodeURIComponent(`Hola, quiero reservar el taller: ${talk.title} (${talk.date})`)}`;
      }
    }

    (content.route || []).forEach((step, i) => {
      const card = document.querySelectorAll('.route-card')[i];
      if (card) { text('h3', step.title, card); text('p', step.description, card); }
    });

    const contact = content.contact || {}, contactTitle = document.querySelector('#contacto .cta-copy h2');
    richTitle(contactTitle, contact.titleLine1, contact.titleLine2);
    text('#contacto .cta-copy>p', contact.description);
    if (brand.whatsappPhone) document.querySelectorAll('a[href*="wa.me/"]').forEach(link => {
      try { const url = new URL(link.href); url.pathname = `/${brand.whatsappPhone}`; link.href = url.href; } catch (_) { }
    });
  };

  fetch('/content/site.json', { cache: 'no-cache' })
    .then(response => { if (!response.ok) throw new Error('CMS content unavailable'); return response.json(); })
    .then(apply)
    .catch(() => { /* Keep the HTML defaults when opened locally without a web server. */ });
})();
