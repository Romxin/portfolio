const output    = document.getElementById('output');
const inputLine = document.getElementById('input-line');
const cmdInput  = document.getElementById('cmd-input');
const termBody  = document.getElementById('term-body');

let history = [], histIdx = -1;

// ── Helpers ───────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ln(text = '', cls = '') {
  const s = document.createElement('span');
  s.className = 'ln' + (cls ? ' ' + cls : '');
  s.innerHTML = text + '\n';
  output.appendChild(s);
  scroll();
}

function block(html) {
  const d = document.createElement('div');
  d.className = 'out-block';
  d.innerHTML = html;
  output.appendChild(d);
  scroll();
}

function blank() { ln(); }
function scroll() { termBody.scrollTop = termBody.scrollHeight; }
function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ── Boot sequence ─────────────────────────────────────────────

const BOOT = [
  { t: '[  0.000] Booting portfolio kernel…', c: 'dim',   d: 0   },
  { t: '[  0.312] Loading shu.service…',      c: 'dim',   d: 280 },
  { t: '[  0.891] Mounting /dev/cybersec…',   c: 'dim',   d: 480 },
  { t: '[  1.337] Initializing SLAM modules…',c: 'dim',   d: 380 },
  { t: '[  1.420] All systems operational.',  c: 'green', d: 280 },
  { t: '',                                    c: '',      d: 200 },
  { t: '  ███████╗██╗  ██╗██╗   ██╗',        c: 'title', d: 35  },
  { t: '  ██╔════╝██║  ██║██║   ██║',        c: 'title', d: 35  },
  { t: '  ███████╗███████║██║   ██║',        c: 'title', d: 35  },
  { t: '  ╚════██║██╔══██║██║   ██║',        c: 'title', d: 35  },
  { t: '  ███████║██║  ██║╚██████╔╝',        c: 'title', d: 35  },
  { t: "  ╚══════╝╚═╝  ╚═╝ ╚═════╝  v2.0",  c: 'title', d: 35  },
  { t: '',                                    c: '',      d: 120 },
  { t: '  Romain Quedillac  ·  BTS SIO SLAM  ·  Dev & Cybersécurité', c: 'acc', d: 80 },
  { t: '',                                    c: '',      d: 160 },
  { t: "  Tape 'help' pour voir les commandes disponibles.", c: 'dim', d: 60 },
  { t: '',                                    c: '',      d: 0   },
];

async function boot() {
  for (const b of BOOT) { await sleep(b.d); ln(b.t, b.c); }
  inputLine.style.display = 'flex';
  cmdInput.focus();
  scroll();
}

// ── Commands ──────────────────────────────────────────────────

function cmdHelp() {
  block(`
<span class="ln title">┌──────────────────────────────────────────────┐</span>
<span class="ln title">│           COMMANDES DISPONIBLES              │</span>
<span class="ln title">└──────────────────────────────────────────────┘</span>
<span class="ln"></span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">whoami</span>       →  Identité &amp; statut</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">about</span>        →  À propos de moi</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">skills</span>       →  Compétences techniques</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">cyber</span>        →  Cybersécurité (outils, plateformes)</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">experience</span>   →  Expérience professionnelle</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">education</span>    →  Formation</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">projects</span>     →  Projets GitLab</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">interests</span>    →  Centres d'intérêt &amp; qualités</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">contact</span>      →  Email, téléphone &amp; téléchargements</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">social</span>       →  GitHub &amp; GitLab</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">news</span>         →  Veille CERT-FR</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">banner</span>       →  Afficher le banner ASCII</span>
<span class="ln">  <span style="color:var(--plight);font-weight:700">clear</span>        →  Effacer le terminal</span>
`);
}

function cmdWhoami() {
  block(`
<div class="out-whoami">
  <div class="ow-name">Romain Quedillac</div>
  <div class="ow-role">Étudiant BTS SIO SLAM · Développeur d'Application · Cybersécurité</div>
  <div class="ow-status">
    <span class="status-dot"></span>
    <span>Available · Rennes, France</span>
  </div>
</div>
`);
}

function cmdAbout() {
  ln('  Heyy, moi c\'est Romain !', 'acc');
  blank();
  ln('  Étudiant en BTS SIO SLAM, passionné par la cybersécurité');
  ln('  offensive et défensive. Je pratique en autonomie sur');
  ln('  HackTheBox, TryHackMe, Root-Me et d\'autres plateformes.');
  blank();
  ln('  Mon objectif : intégrer un Security Operations Center (SOC)', '');
  ln('  et contribuer à la sécurité des systèmes d\'information.', '');
}

function cmdSkills() {
  block(`
<div class="out-skills">
  <div class="osk-row">
    <span class="osk-cat">// Développement</span>
    <div class="out-tags">
      <span class="tag green">Python</span>
      <span class="tag green">SQL</span>
      <span class="tag green">JavaScript</span>
    </div>
  </div>
  <div class="osk-row">
    <span class="osk-cat">// Réseaux &amp; Sécu</span>
    <div class="out-tags">
      <span class="tag purple">Réseaux</span>
      <span class="tag purple">Cybersécurité</span>
      <span class="tag purple">SOC</span>
    </div>
  </div>
  <div class="osk-row">
    <span class="osk-cat">// Bureautique</span>
    <div class="out-tags">
      <span class="tag cyan">Word</span>
      <span class="tag cyan">Excel</span>
      <span class="tag cyan">PowerPoint</span>
    </div>
  </div>
  <div class="osk-row">
    <span class="osk-cat">// Langues</span>
    <div class="out-tags">
      <span class="tag green">Français — Natif</span>
      <span class="tag cyan">Anglais — Lecture &amp; écriture</span>
    </div>
  </div>
</div>
`);
}

function cmdCyber() {
  block(`
<div class="out-cyber">
  <div class="cy-col">
    <div class="cy-title">// Plateformes</div>
    <div class="out-tags" style="flex-direction:column;gap:.35rem;align-items:flex-start">
      <span class="tag purple">HackTheBox</span>
      <span class="tag purple">TryHackMe</span>
      <span class="tag purple">Root-Me</span>
      <span class="tag purple">CyberDefenders</span>
      <span class="tag purple">PortSwigger</span>
      <span class="tag purple">PicoCTF</span>
    </div>
  </div>
  <div class="cy-col">
    <div class="cy-title">// Outils</div>
    <div class="out-tags" style="flex-direction:column;gap:.35rem;align-items:flex-start">
      <span class="tag cyan">Burp Suite</span>
      <span class="tag cyan">Wireshark</span>
      <span class="tag cyan">Nmap</span>
      <span class="tag cyan">Gobuster / SQLmap</span>
      <span class="tag cyan">Hashcat / JohnTheRipper</span>
      <span class="tag cyan">Docker · crt.sh</span>
    </div>
  </div>
  <div class="cy-col">
    <div class="cy-title">// Domaines</div>
    <div class="out-tags" style="flex-direction:column;gap:.35rem;align-items:flex-start">
      <span class="tag green">Détection &amp; réponse aux incidents</span>
      <span class="tag green">Analyse forensique</span>
      <span class="tag green">CTF</span>
    </div>
  </div>
</div>
`);
}

function cmdExperience() {
  block(`
<div class="out-timeline">
  <div class="otl-item">
    <div class="otl-dot"></div>
    <div class="otl-date">2024 – 2025</div>
    <div class="otl-title">Développeur d'Application</div>
    <div class="otl-sub">Service d'infrastructure de la Défense Atlantique · Brest</div>
    <ul class="otl-details">
      <li>Développement d'une application de gestion et personnalisation de supports de formation PowerPoint</li>
      <li>Utilisation du framework Cyborg pour la gestion de catalogues de cours</li>
      <li>Rédaction de documentation technique et conception de l'application</li>
    </ul>
  </div>
  <div class="otl-item">
    <div class="otl-dot"></div>
    <div class="otl-date">2023 – 2024</div>
    <div class="otl-title">Réparation Informatique</div>
    <div class="otl-sub">EBC Europe · Rennes</div>
    <ul class="otl-details">
      <li>Réparation d'ordinateurs</li>
      <li>Réparation de matériel d'ophtalmologie</li>
    </ul>
  </div>
</div>
`);
}

function cmdEducation() {
  block(`
<div class="out-timeline">
  <div class="otl-item">
    <div class="otl-dot"></div>
    <div class="otl-date">2026 – En cours</div>
    <div class="otl-title">BTS SIO SLAM – 1ère année <span class="otl-badge">Diplômé</span></div> </div>
    <div class="otl-sub">Lycée Pôle Sup de La Salle · Rennes</div>
  </div>
  <div class="otl-item">
    <div class="otl-dot"></div>
    <div class="otl-date">2023 – 2025</div>
    <div class="otl-title">BTS SIO SLAM / Cyber <span class="otl-badge">Diplômé</span></div>
    <div class="otl-sub">ESNA · Rennes · Alternance</div>
  </div>
  <div class="otl-item">
    <div class="otl-dot"></div>
    <div class="otl-date">2020 – 2023</div>
    <div class="otl-title">Bac Pro SN RISC <span class="otl-badge">Diplômé</span></div>
    <div class="otl-sub">Lycée Professionnel Coëtlogon · Rennes</div>
  </div>
</div>
`);
}

function cmdProjects() {
  block(`
<div class="out-proj-grid">
  <a href="https://gitlab.com/AppEquipe/appticket" target="_blank" rel="noopener" class="out-proj-card">
    <div class="opc-top">
      <span class="opc-icon">⬡</span>
      <span class="opc-repo">AppEquipe / appticket</span>
    </div>
    <p class="opc-desc">Application collaborative de gestion de tickets</p>
    <div class="opc-footer">
      <span class="opc-badge">2025 · GitLab</span>
      <span class="opc-arrow">→</span>
    </div>
  </a>
  <a href="https://gitlab.com/ShuOnSSH/modif-form" target="_blank" rel="noopener" class="out-proj-card">
    <div class="opc-top">
      <span class="opc-icon">⬡</span>
      <span class="opc-repo">ShuOnSSH / modif-form</span>
    </div>
    <p class="opc-desc">Application de personnalisation et modification de formations</p>
    <div class="opc-footer">
      <span class="opc-badge">2024 · GitLab</span>
      <span class="opc-arrow">→</span>
    </div>
  </a>
</div>
`);
}

function cmdInterests() {
  block(`
<div class="out-interests">
  <div class="oi-col">
    <div class="cy-title">// Centres d'intérêt</div>
    <div class="out-tags" style="flex-direction:column;gap:.35rem;align-items:flex-start;margin-top:.1rem">
      <span class="tag purple">CTF</span>
      <span class="tag purple">Open Source</span>
      <span class="tag purple">Veille sécurité</span>
      <span class="tag purple">Gaming</span>
    </div>
  </div>
  <div class="oi-col">
    <div class="cy-title">// Qualités</div>
    <div class="out-tags" style="flex-direction:column;gap:.35rem;align-items:flex-start;margin-top:.1rem">
      <span class="tag green">Méthodique</span>
      <span class="tag green">Travail d'équipe</span>
    </div>
  </div>
</div>
`);
}

function cmdContact() {
  block(`
<div class="out-contact">
  <div class="oc-row">
    <span class="oc-key">email</span>
    <a href="mailto:Ecl1spe@protonmail.com" class="oc-val">Ecl1spe@protonmail.com</a>
  </div>
  <div class="oc-btns">
    <a href="docs/CV%20Quedillac%20Romain.pdf" download class="btn-sm">↓ CV</a>
    <a href="docs/annexe%208%20epreuve%20E5%20Quedillac%20romain.pdf" download class="btn-sm ghost">↓ Tableau Synthèse E5</a>
  </div>
</div>
`);
}

function cmdSocial() {
  block(`
<div class="out-social">
  <a href="https://github.com/Romxin" target="_blank" rel="noopener" class="osoc-link">
    <img src="assets/github.svg" alt="GitHub" />
    github.com/Romxin
  </a>
  <a href="https://gitlab.com/ShuOnSSH" target="_blank" rel="noopener" class="osoc-link">
    <img src="assets/gitlab.svg" alt="GitLab" />
    gitlab.com/ShuOnSSH
  </a>
</div>
`);
}

async function cmdNews() {
  ln('  Chargement du flux CERT-FR…', 'dim');
  try {
    const url  = 'https://api.allorigins.win/get?url=' + encodeURIComponent('https://www.cert.ssi.gouv.fr/feed/');
    const data = await (await fetch(url)).json();
    const xml  = new DOMParser().parseFromString(data.contents, 'application/xml');
    const items = [...xml.querySelectorAll('item')].slice(0, 5);

    const rows = items.map(item => {
      const title = esc(item.querySelector('title').textContent);
      const href  = item.querySelector('link').textContent;
      const raw   = item.querySelector('pubDate')?.textContent ?? '';
      const date  = raw ? new Date(raw).toLocaleDateString('fr-FR') : '';
      return `<div class="orss-item">
        <span class="orss-date">${date}</span>
        <a href="${href}" target="_blank" rel="noopener">${title}</a>
      </div>`;
    }).join('');

    block(`<div class="out-rss">${rows}</div>`);
  } catch {
    ln('  Erreur lors du chargement du flux.', 'red');
  }
}

function cmdBanner() {
  ['  ███████╗██╗  ██╗██╗   ██╗',
   '  ██╔════╝██║  ██║██║   ██║',
   '  ███████╗███████║██║   ██║',
   '  ╚════██║██╔══██║██║   ██║',
   '  ███████║██║  ██║╚██████╔╝',
   "  ╚══════╝╚═╝  ╚═╝ ╚═════╝  v2.0"
  ].forEach(r => ln(r, 'title'));
}

function cmdClear() { output.innerHTML = ''; }

// ── Fun easter egg responses ──────────────────────────────────

function cmdSudo()  { ln("  Permission denied. 😈  (psst — tape 'snake')", 'red'); }
function cmdExit()  { ln("  Il n'y a pas de sortie. Tu es ici pour toujours.", 'dim'); }
function cmdRm()    { ln("  rm: cannot remove '/': Permission denied. 🙂", 'red'); }
function cmdHello() {
  ln('  Hello, world! 👋', 'acc');
  ln('  (sérieusement, tape \'help\')', 'dim');
}

// ── Dispatch ──────────────────────────────────────────────────

const CMDS = {
  help: cmdHelp, whoami: cmdWhoami, about: cmdAbout,
  skills: cmdSkills, cyber: cmdCyber,
  experience: cmdExperience, education: cmdEducation,
  projects: cmdProjects, interests: cmdInterests,
  contact: cmdContact, social: cmdSocial,
  news: cmdNews, banner: cmdBanner, clear: cmdClear,
  // hidden easter eggs
  snake: cmdSnake, tetris: cmdTetris, pvz: cmdPvz,
  sudo: cmdSudo, exit: cmdExit,
  'rm -rf /': cmdRm, hello: cmdHello,
};

function dispatch(raw) {
  const cmd = raw.trim().toLowerCase();

  if (cmd !== 'clear') {
    ln('shu@portfolio:~$ ' + esc(raw), 'prompt');
    blank();
  }
  if (!cmd) return;

  if (history[0] !== raw.trim()) history.unshift(raw.trim());
  histIdx = -1;

  // rm -rf / matched on raw input (contains spaces)
  const rawLower = raw.trim().toLowerCase();
  if (rawLower === 'rm -rf /' || rawLower === 'rm -rf') { cmdRm(); }
  else if (CMDS[cmd]) CMDS[cmd]();
  else ln("  bash: " + esc(cmd) + ": commande introuvable. Tape 'help'.", 'red');

  blank();
}

// ── Input ─────────────────────────────────────────────────────

cmdInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const v = cmdInput.value; cmdInput.value = ''; dispatch(v);

  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (histIdx < history.length - 1) cmdInput.value = history[++histIdx];

  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (histIdx > 0) cmdInput.value = history[--histIdx];
    else { histIdx = -1; cmdInput.value = ''; }

  } else if (e.key === 'Tab') {
    e.preventDefault();
    const p = cmdInput.value.trim().toLowerCase();
    if (!p) return;
    const m = Object.keys(CMDS).filter(c => c.startsWith(p));
    if (m.length === 1) { cmdInput.value = m[0]; }
    else if (m.length > 1) {
      ln('shu@portfolio:~$ ' + esc(cmdInput.value), 'prompt');
      ln('  ' + m.join('   '), 'dim');
      blank();
    }
  }
});

termBody.addEventListener('click', () => cmdInput.focus());
boot();
