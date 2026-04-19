# Carrd Calculator Conventions

Hard-won lessons from building calculators embedded in Carrd. Read this before starting any new calc module.

---

## 1. DOM Scoping (CRITICAL)

Multiple calcs on the same Carrd page share one DOM. Input IDs like `taxes`, `ins`, `rent`, `hoa`, `mgmt`, `maint`, `loantype` will collide across calcs.

**Every calc must:**

- Wrap its HTML in a unique container with an ID: `<div id="ric-wrap">`, `<div id="eec-wrap">`, etc.
- Scope all element lookups to that wrap:

```js
var _wrap = null;
function getWrap(){ if(!_wrap) _wrap = document.getElementById('ric-wrap'); return _wrap; }
function gi(id){
  var w = getWrap();
  if(w){ var el = w.querySelector('#' + id); if(el) return el; }
  return document.getElementById(id); // fallback
}
```

- Scope event delegation the same way — delegate on the wrap, not `document`:

```js
var wrap = getWrap();
if(wrap){
  wrap.addEventListener('input', function(e){
    if(inputIds.indexOf(e.target.id) >= 0) run();
  });
}
```

**Why this matters:** Without scoping, `document.getElementById('taxes')` returns the first element with that ID in DOM order — which may belong to a different calc. Symptom: typing in a visible input doesn't trigger your calc's recalc; loading saved values appears to set the wrong element. Very hard to diagnose without console inspection via `document.querySelectorAll('[id="taxes"]').length`.

---

## 2. Carrd-Specific Constraints

### Embed size limit
Code embed HTML must stay under ~10,000 characters. Move all logic to external JS hosted on GitHub Pages (`https://r25sandbox.github.io/rec/<name>.js`).

### Carrd strips things
- CSS class selectors and style blocks are stripped → use fully inline styles everywhere
- `onclick=` attributes blocked by CSP → use `addEventListener`
- CSS media queries stripped → use JS-based `offsetWidth` for responsive behavior

### Carrd resets input values
Carrd resets input `value` attributes after JS fires. Consequences:
- Hardcode defaults inside `run()` for initial render: `if(!price){price=500000;...}`
- Never rely on DOM value reads at init time without the hardcoded fallback

### setAttribute(style) on inputs with siblings
`setAttribute('style', fullString)` on an input that has sibling DOM elements in the same `<td>` (e.g., a `<br><font id="hint">` for a computed hint label) can cause element rebuilding on some browsers. Preferred patterns:

- Inputs with NO siblings: `class="ri"` + `applyInputStyles()` via `setAttribute` is fine
- Inputs WITH hint siblings: hardcode `style="..."` inline in HTML, skip applyInputStyles for them
- `<select>` elements: always hardcode inline style in HTML (setAttribute unreliable on selects)

### Multiple id="taxes" across calcs
See Section 1. Fundamental — never skip.

### `.click()` on file inputs blocked on mobile
Use `<label for="import-file-input">` pattern instead of programmatic click:

```html
<input type="file" id="import-file-input" accept=".json" style="display:none">
<label for="import-file-input" style="cursor:pointer;...">&#11015; Import</label>
```

### Non-ASCII UTF-8 breaks the parser
Embed HTML must be pure ASCII. Use entities or Unicode escapes:
- `≈` → `&#8776;` in HTML, `\u2248` in JS
- `−` → `-` or `&minus;`
- `÷` → `/` or `&divide;`
- `→` → `&rarr;`

Verify: `[c for c in html if ord(c) > 127]` should be empty.

### Leading HTML comments break the embed
Don't start the embed file with `<!-- -->`. Put version/changelog in JS only.

---

## 3. Cache Busting

External JS must be cache-busted on every deploy:

```html
<script src="https://r25sandbox.github.io/rec/ric.js?v=55"></script>
```

**Workflow per deploy:**
1. Update JS on GitHub (push to `main`)
2. Bump `?v=NN` number in HTML embed
3. Paste updated HTML back into Carrd

If you forget step 2, browsers serve stale cached JS and your changes won't appear. If you forget step 3, same result — the HTML in Carrd still has the old cache-buster.

---

## 4. Event Wiring Pattern (EEC v1.8.7 proven)

```js
function wireInputs(){
  ['price','down','rent',...].forEach(function(id){
    var el = gi(id); if(el) el.addEventListener('input', run);
  });
  var lt = gi('loantype'); if(lt) lt.addEventListener('change', run);
}

function init(){
  applyInputStyles();
  injectSavesUI();   // if applicable
  wireInputs();
  run();
  // NO setTimeout(run, 300) — fires after Load and wipes restored values
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

Do NOT add `setTimeout(run, N)` calls in `init()`. They fire after user interactions like Load and clobber the restored state.

---

## 5. Save/Load Pattern

- **localStorage key:** unique per calc (`rc_saves` for RIC, `eec_saves` for EEC — never share)
- **Record ID:** `Date.now()` — KEEP AS STRING in comparisons, `parseInt` corrupts large timestamps
- **applyInputs helper:**

```js
function applyInputs(inp, id){
  function sv(elId, v){
    var el = gi(elId);
    if(el && v !== undefined && v !== null){
      el.value = v;
      el.defaultValue = v;          // syncs the attribute backing
      el.setAttribute('value', v);  // forces visual refresh on some browsers
    }
  }
  sv('price', inp.price);
  // ... one line per field, explicit
  var lt = gi('loantype'); if(lt && inp.loantype) lt.value = inp.loantype;
  activeId = id || null;
  run();
  renderSaves();
}
```

Setting only `el.value` (property) is not enough — some browsers render the `value` attribute when both exist. Set all three to be safe.

---

## 6. Version Control

Every JS and HTML file must have:

- Version number at the top (`v5.3`, etc.)
- Changelog comment block tracking each change with date + commit message
- Increment version on every meaningful change
- Include a one-line commit message per version for easy copy-paste into `git commit -m`

Template:

```js
// <name>.js — <Description>
// v1.1  YYYY-MM-DD  <What changed, why>
//                    // Commit: <short message for git>
// v1.0  YYYY-MM-DD  Initial build
```

---

## 7. Debugging

When things misbehave mysteriously in Carrd:

- **`document.querySelectorAll('[id="X"]').length`** — checks for ID collisions
- **`document.getElementById('X').value` vs `.defaultValue` vs `.getAttribute('value')`** — diagnoses visual vs. property mismatch
- **Add a one-off listener in console** to test if events fire at all:
  ```js
  document.getElementById('taxes').addEventListener('input', () => console.log('FIRED'));
  ```
- **`fetch('https://r25sandbox.github.io/rec/<name>.js').then(r=>r.text()).then(t=>console.log(t.slice(0,300)))`** — verifies which JS version is actually loaded

---

## 8. Project Structure

- GitHub org: `r25sandbox`
- Main repo for calc JS: `rec` (RIC, EEC, future calcs)
- Nav/footer components: `navbar`
- Subfolders: `sandbox/` for dev, `prod/` for live
- Promoting = copy file from `sandbox/` to `prod/`

---

## 9. Current Calc Inventory

| Calc | ID prefix | Wrap ID | LS key | External JS |
|------|-----------|---------|--------|-------------|
| REI (Cash Flow) | `ri` | `ric-wrap` | `rc_saves` | `ric.js` |
| Equity (EEC) | `ei` | `eec-wrap` | `eec_saves` | `eec.js` |
| Rental Comps | (varies) | (iframe) | n/a | separate repo `rentcomps` |

Future calcs must claim unique: prefix, wrap ID, LS key, JS filename.
