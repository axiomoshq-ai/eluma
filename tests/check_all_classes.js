const fs = require('fs');

const css = fs.readFileSync('styles.css', 'utf8');

const files = [
  'index.html', 'worker.html', 'employer.html',
  'worker/app.js', 'employer/app.js', 'dev/toolkit.js',
  'core/store.js', 'core/ui.js', 'core/courses.js', 'core/seed.js'
];

const classSet = new Set();

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  // match class="..." with double quotes or class='...' with single quotes
  const classMatches = [...content.matchAll(/class="([^"]+)"/g), ...content.matchAll(/class='([^']+)'/g)];
  for (const m of classMatches) {
    const cleaned = m[1].replace(/\$\{[^}]+\}/g, ' ');
    cleaned.split(/\s+/).forEach(c => {
      // ignore template expressions or invalid class chars
      if (c && !c.includes('${') && !c.includes('<') && !c.includes('>') && !c.includes('(') && !c.includes('?') && !c.includes(':')) {
        classSet.add(c);
      }
    });
  }
  // match classList.add/remove/toggle('...')
  const jsClassMatches = content.matchAll(/classList\.(?:add|remove|toggle)\(['"]([^'"]+)['"]/g);
  for (const m of jsClassMatches) {
    m[1].split(/\s+/).forEach(c => {
      if (c && !c.includes('${')) classSet.add(c);
    });
  }
});

const missing = [];
classSet.forEach(c => {
  if (!css.includes('.' + c)) {
    missing.push(c);
  }
});

console.log('Total unique DOM classes found:', classSet.size);
console.log('Missing in styles.css count:', missing.length);
console.log('Missing list:\n' + JSON.stringify(missing.sort(), null, 2));
