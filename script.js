
// Utilities
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

// Theme toggle
function applyTheme(theme) {
  if (theme === 'light') document.documentElement.classList.add('light');
  else document.documentElement.classList.remove('light');
  localStorage.setItem('theme', theme);
}
function toggleTheme() {
  const cur = localStorage.getItem('theme') === 'light' ? 'dark' : 'light';
  applyTheme(cur);
  // Cute ripple on toggle
  const b = $('#themeToggle');
  b.classList.add('pulse');
  setTimeout(()=>b.classList.remove('pulse'), 300);
}
// Init theme
(function(){
  const t = localStorage.getItem('theme') || 'dark';
  applyTheme(t);
})();

// Global search (filters visible products by title)
function initSearch(){
  const input = $('#searchInput');
  if(!input) return;
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    $$('.product-card').forEach(card => {
      const title = card.dataset.title.toLowerCase();
      card.style.display = title.includes(q) ? '' : 'none';
    });
  });
}

// Simple product database (for demo)
const PRODUCTS = [
  {id:'p1', title:'Smartphone X1', price:59999, mrp:74999, brand:'NovaTech', rating:4.5, cat:'electronics', img:'images/p1.svg', link:'https://example.com/buy?product=p1'},
  {id:'p2', title:'Noise Cancelling Headphones', price:8999, mrp:12999, brand:'SoundHive', rating:4.2, cat:'electronics', img:'images/p2.svg', link:'https://example.com/buy?product=p2'},
  {id:'p3', title:'4K Ultra TV 55"', price:42999, mrp:58999, brand:'ViewMax', rating:4.7, cat:'electronics', img:'images/p3.svg', link:'https://example.com/buy?product=p3'},
  {id:'p4', title:'Gaming Laptop G15', price:89999, mrp:109999, brand:'VoltGear', rating:4.4, cat:'electronics', img:'images/p4.svg', link:'https://example.com/buy?product=p4'},
  {id:'p5', title:'Sneakers Apex', price:2999, mrp:4999, brand:'Stride', rating:4.1, cat:'fashion', img:'images/p5.svg', link:'https://example.com/buy?product=p5'},
  {id:'p6', title:'Classic Denim Jacket', price:2199, mrp:3299, brand:'BlueStone', rating:4.3, cat:'fashion', img:'images/p6.svg', link:'https://example.com/buy?product=p6'},
  {id:'p7', title:'Analog Watch Luxe', price:3499, mrp:5799, brand:'Chrono', rating:4.0, cat:'fashion', img:'images/p7.svg', link:'https://example.com/buy?product=p7'},
  {id:'p8', title:'Wireless Earbuds AirGo', price:2799, mrp:4599, brand:'SoundHive', rating:4.2, cat:'electronics', img:'images/p8.svg', link:'https://example.com/buy?product=p8'}
];

// Render helpers
function ratingStars(r){ // 0..5, show ★ and ☆
  const whole = Math.floor(r);
  const half = (r - whole) >= 0.5;
  let s = '★'.repeat(whole);
  if(half) s += '☆'; // visual cue for half
  s = s.padEnd(5, '☆');
  return s;
}

function discountPercent(price, mrp){
  return Math.round((1 - price/mrp)*100);
}

function createCard(p){
  const div = document.createElement('div');
  div.className = 'card product-card fade-in';
  div.dataset.title = p.title;
  div.dataset.brand = p.brand;
  div.dataset.rating = p.rating;
  div.dataset.price = p.price;
  div.innerHTML = `
    <div class="media"><img src="${p.img}" alt="${p.title}"></div>
    <div class="body">
      <div class="title">${p.title}</div>
      <div class="rating" aria-label="rating">${ratingStars(p.rating)} <span class="meta" style="margin-left:6px">${p.rating.toFixed(1)}</span></div>
      <div class="price-row">
        <div class="price">₹${p.price.toLocaleString('en-IN')}</div>
        <div class="mrp">₹${p.mrp.toLocaleString('en-IN')}</div>
        <div class="badge-off">${discountPercent(p.price, p.mrp)}% OFF</div>
      </div>
      <div class="meta">Brand: ${p.brand}</div>
      <div class="actions">
        <a href="${p.link}" class="btn" target="_blank" rel="noopener"><i class="fa-solid fa-bolt"></i> Buy</a>
        <button class="btn secondary" data-review="${p.id}"><i class="fa-regular fa-star"></i> Reviews</button>
      </div>
    </div>
  `;
  return div;
}

// Page-specific rendering
function renderHome(){
  const list = $('#homeProducts');
  if(!list) return;
  const first8 = PRODUCTS.slice(0,8);
  first8.forEach(p => list.appendChild(createCard(p)));
}

function renderCategory(cat){
  const wrap = $('#categoryProducts');
  if(!wrap) return;
  PRODUCTS.filter(p => p.cat === cat).forEach(p => wrap.appendChild(createCard(p)));
}

// Filters (sidebar)
function initFilters(){
  const sidebar = $('.sidebar');
  if(!sidebar) return;
  const minInput = $('#priceMin');
  const maxInput = $('#priceMax');
  function apply(){
    const brands = $$('.filter-brand:checked').map(i => i.value);
    const min = parseInt(minInput.value || '0', 10);
    const max = parseInt(maxInput.value || '99999999', 10);
    const minStars = parseInt($('input[name="stars"]:checked')?.value || '0', 10);
    $$('.product-card').forEach(card => {
      const price = parseInt(card.dataset.price, 10);
      const rating = Math.floor(parseFloat(card.dataset.rating));
      const brand = card.dataset.brand;
      const match =
        price >= min && price <= max &&
        rating >= minStars &&
        (brands.length ? brands.includes(brand) : true);
      card.style.display = match ? '' : 'none';
    });
  }
  sidebar.addEventListener('change', apply);
  $('#applyFilters')?.addEventListener('click', apply);
  $('#clearFilters')?.addEventListener('click', () => {
    $$('.filter-brand:checked').forEach(i => i.checked = false);
    $('input[name="stars"][value="0"]').checked = true;
    minInput.value = '0'; maxInput.value = '';
    apply();
  });
}

// Reviews (modal + localStorage per product)
function initReviews(){
  const modal = $('#reviewModal'); if(!modal) return;
  const close = modal.querySelector('.close');
  const form = $('#reviewForm');
  const list = $('#reviewList');
  let currentId = null;

  function key(pid){ return `reviews_${pid}`; }
  function load(pid){
    const arr = JSON.parse(localStorage.getItem(key(pid))||'[]');
    list.innerHTML = '';
    arr.forEach(r => {
      const div = document.createElement('div');
      div.className = 'review';
      div.innerHTML = `<strong>${r.name}</strong> • ${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}<br>${r.comment}`;
      list.appendChild(div);
    });
    $('#reviewCount').textContent = arr.length;
  }

  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-review]');
    if(btn){
      currentId = btn.getAttribute('data-review');
      modal.classList.add('active');
      load(currentId);
    }
  });

  close.addEventListener('click', ()=> modal.classList.remove('active'));
  modal.addEventListener('click', (e)=> { if(e.target === modal) modal.classList.remove('active'); });

  // star picker
  let chosen = 5;
  $$('.stars i').forEach((iEl, idx) => {
    iEl.addEventListener('click', ()=>{
      chosen = idx+1;
      $$('.stars i').forEach((e2,i2)=> e2.className = i2 <= idx ? 'fa-solid fa-star' : 'fa-regular fa-star');
    });
  });

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const name = $('#revName').value.trim();
    const email = $('#revEmail').value.trim();
    const comment = $('#revComment').value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if(!name || !emailOk || !comment){
      alert('Please enter a valid name, email and comment.');
      return;
    }
    const arr = JSON.parse(localStorage.getItem(key(currentId))||'[]');
    arr.unshift({name, email, comment, stars: chosen, at: Date.now()});
    localStorage.setItem(key(currentId), JSON.stringify(arr));
    form.reset();
    $$('.stars i').forEach((e2,i2)=> e2.className = i2 < 5 ? 'fa-solid fa-star' : 'fa-regular fa-star');
    chosen = 5;
    load(currentId);
  });
}

// Page load animations
window.addEventListener('pageshow', () => {
  document.body.classList.add('fade-in');
  setTimeout(()=>document.body.classList.remove('fade-in'), 450);
});

// Init per-page
document.addEventListener('DOMContentLoaded', () => {
  initSearch();
  initFilters();
  initReviews();
  renderHome();
  if(document.body.dataset.cat){
    renderCategory(document.body.dataset.cat);
  }
});
