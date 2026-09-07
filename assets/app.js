/* ============ mock catalogue — mirrors src/lib/products.ts ============ */
/* Real product photos: drop a file named "<product id>.jpg" into assets/images/
   (e.g. assets/images/trolley-regular.jpg). If the file is missing or fails to
   load, the line-icon placeholder underneath shows automatically — no code
   changes needed. See assets/images/README.md for the full filename list. */
const ICONS = {
  trolley: '<path d="M4 21V9l8-6 8 6v12"/><path d="M9 21v-6h6v6"/>',
  fridge: '<rect x="6" y="2" width="12" height="20" rx="1"/><path d="M6 10h12"/>',
  cooker: '<rect x="3" y="8" width="18" height="12" rx="1"/><circle cx="7.5" cy="12.5" r="1.3"/><circle cx="12" cy="12.5" r="1.3"/><circle cx="16.5" cy="12.5" r="1.3"/><path d="M6 8V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3"/>',
  table: '<path d="M3 8h18M6 8v13M18 8v13M3 8l2-4h14l2 4"/>',
  display: '<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M2 7l3-4h14l3 4"/>',
  oven: '<rect x="3" y="4" width="18" height="16" rx="1"/><rect x="6" y="10" width="12" height="7"/><circle cx="8" cy="7" r=".8"/><circle cx="11" cy="7" r=".8"/>',
  pot: '<path d="M4 10h16l-1.5 9a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7z"/><path d="M2 10h20M8 10V6a4 4 0 0 1 8 0v4"/>',
  bowl: '<path d="M3 11h18a9 8 0 0 1-18 0z"/><path d="M9 11V8M15 11V8"/>',
  book: '<path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M18 4v16"/>',
  ladle: '<circle cx="7" cy="8" r="4"/><path d="M10.5 11.5L20 21"/>',
  popcorn: '<path d="M6 9h12l-1.5 12h-9z"/><path d="M8 9c0-2 1-4-1-4M12 9c0-2.5 1.5-4.5-.5-5.5M16 9c0-2-1-4 1-4"/>'
};
const PRODUCTS = [
  {id:'trolley-regular',name:'MyExpress Regular Food Vending Trolley',category:'food-vending-trolleys',price:8500,desc:'Compact fabricated trolley for small businesses, mobile vendors, and entrepreneurs.',icon:'trolley'},
  {id:'trolley-medium',name:'MyExpress Medium Food Vending Trolley',category:'food-vending-trolleys',price:12500,desc:'Spacious, reliable trolley offering more display and storage space.',icon:'trolley'},
  {id:'trolley-large',name:'MyExpress Large Food Vending Trolley',category:'food-vending-trolleys',price:21500,desc:'Large-capacity trolley for established vendors needing extra space.',icon:'trolley'},
  {id:'food-display-warmer',name:'Food Display Warmer / Hot Food Display Unit',category:'kitchen-equipment',price:30000,desc:'Professional hot food display unit for snacks and ready-to-serve meals.',icon:'display'},
  {id:'prep-table-shelves',name:'Stainless-Steel Prep Table with Shelves',category:'kitchen-equipment',price:18000,desc:'Durable stainless prep table with lower storage shelving.',icon:'table'},
  {id:'gas-cooker-heavy',name:'Heavy-Duty Commercial Gas Cooker',category:'kitchen-equipment',price:28000,desc:'Multi-burner commercial cooker built for high-volume kitchens.',icon:'cooker'},
  {id:'glass-display-box',name:'Glass Display Box with Inserts',category:'food-display-equipment',price:14000,desc:'Clear glass display case with removable inserts for pastries and snacks.',icon:'display'},
  {id:'baking-oven',name:'Commercial Baking Oven / Food Warmer',category:'bakery-equipment',price:12000,desc:'Reliable baking oven for bakeries and food businesses.',icon:'oven'},
];
const RECO = [
  {id:'popcorn-machine',name:'Popcorn Machine',category:'snack-equipment',price:7500,icon:'popcorn',tag:'Best Seller'},
  {id:'charcoal-stove',name:'Charcoal Stove with Cooking Pot',category:'traditional-cooking-equipment',price:650,icon:'pot',tag:'Budget Pick'},
  {id:'kitchen-bowl-set',name:'Stainless Steel Kitchen Bowl & Food Pan Set',category:'kitchen-utensils',price:2000,icon:'bowl',tag:'New'},
  {id:'ladle',name:'Ladle',category:'cooking-utensils',price:250,icon:'ladle',tag:'Under 500'},
  {id:'glass-bakery-cabinet',name:'Glass Bakery / Food Display Cabinet',category:'food-display-equipment',price:6500,icon:'display',tag:'Popular'},
  {id:'mind-your-business',name:'Mind Your Business',category:'books',price:1000,icon:'book',tag:'Books'},
];
const CATEGORIES = [
  {slug:'kitchen-equipment',name:'Kitchen Equipment',icon:'cooker'},
  {slug:'food-vending-trolleys',name:'Food Vending Trolleys',icon:'trolley'},
  {slug:'refrigeration-products',name:'Refrigeration Products',icon:'fridge'},
  {slug:'bakery-equipment',name:'Bakery Equipment',icon:'oven'},
  {slug:'food-display-equipment',name:'Food Display Equipment',icon:'display'},
  {slug:'cooking-utensils',name:'Cooking Utensils',icon:'ladle'},
  {slug:'kitchen-utensils',name:'Kitchen Utensils',icon:'bowl'},
  {slug:'books',name:'Books',icon:'book'},
];
const CAT_NAME = Object.fromEntries(CATEGORIES.map(c=>[c.slug,c.name]));
function fmt(n){ return 'KSh ' + n.toLocaleString('en-KE'); }
function icon(name){ return ICONS[name] || ICONS.trolley; }

/* ============ render product grid ============ */
function renderProducts(list){
  document.getElementById('productGrid').innerHTML = list.map((p,i)=>`
    <div class="pcard" data-name="${p.name.toLowerCase()}" data-cat="${p.category}">
      <div class="thumb" style="position:relative;">
        <span class="stock">In Stock</span>
        <button class="wl" onclick="toast('Saved to wishlist')"><svg viewBox="0 0 24 24" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button>
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">${icon(p.icon)}</svg>
        <img class="thumb-photo" src="assets/images/${p.id}.jpg" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="body">
        <span class="cat">${CAT_NAME[p.category]||p.category}</span>
        <div class="name">${p.name}</div>
        <div class="price-row"><span class="price">${fmt(p.price)}</span><span class="avail">In Stock</span></div>
        <div class="desc">${p.desc}</div>
        <div class="actions">
          <button class="btn-order-wa" onclick="quickOrder('${p.id}','whatsapp')">
            <svg viewBox="0 0 32 32"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.386.706 4.61 1.92 6.47L4 29l7.72-1.877A11.94 11.94 0 0 0 16.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3zm6.988 16.99c-.297.837-1.47 1.53-2.4 1.72-.638.13-1.47.235-4.27-.918-3.583-1.48-5.887-5.1-6.066-5.34-.176-.24-1.454-1.93-1.454-3.686 0-1.755.914-2.615 1.24-2.973.297-.325.647-.407.863-.407.216 0 .432.002.62.011.198.01.464-.075.727.554.297.72.994 2.48 1.08 2.66.088.18.146.39.03.63-.117.24-.176.39-.35.6-.176.21-.37.47-.53.63-.176.18-.36.372-.155.73.207.36.918 1.51 1.968 2.443 1.353 1.203 2.494 1.577 2.85 1.755.353.18.56.15.766-.09.207-.24.883-1.03 1.12-1.38.234-.36.47-.3.79-.18.323.12 2.058.97 2.41 1.147.353.18.588.27.674.42.088.15.088.87-.207 1.71z"/></svg>
            Order with WhatsApp
          </button>
          <button class="btn-order-mail" onclick="quickOrder('${p.id}','email')">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg>
            Order by Email
          </button>
          <span class="track-note">Both options are trackable — see <a href="#" onclick="showOrders();return false;">My Orders</a></span>
        </div>
      </div>
    </div>
  `).join('');
}

function renderCategoryCards(){
  document.getElementById('categoryGrid').innerHTML = CATEGORIES.slice(0,8).map(c=>`
    <a class="catcard" href="#shop" onclick="filterByCategory('${c.slug}')">
      <div class="ic"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">${icon(c.icon)}</svg></div>
      <div><b>${c.name}</b><small>Shop now →</small></div>
    </a>
  `).join('');
}

function renderBubbles(){
  document.getElementById('bubbleRow').innerHTML = CATEGORIES.map(c=>`
    <a class="bubble" href="#shop" onclick="filterByCategory('${c.slug}')">
      <div class="circ"><svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8">${icon(c.icon)}</svg></div>
      <span>${c.name}</span>
    </a>
  `).join('');
}

function renderReco(){
  document.getElementById('recoGrid').innerHTML = RECO.map(p=>`
    <div class="reco-card">
      <div class="thumb">
        <svg viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">${icon(p.icon)}</svg>
        <img class="thumb-photo" src="assets/images/${p.id}.jpg" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">
      </div>
      <div class="rbody">
        <div class="rname">${p.name}</div>
        <div class="rprice">${fmt(p.price)}</div>
        <span class="rtag">${p.tag}</span>
      </div>
    </div>
  `).join('');
}

/* ============ search — now actually wired up ============ */
function onSearch(q){
  q = q.trim().toLowerCase();
  document.querySelectorAll('#productGrid .pcard').forEach(card=>{
    card.style.display = card.dataset.name.includes(q) ? '' : 'none';
  });
  if(q.length){ document.getElementById('shop').scrollIntoView({behavior:'smooth'}); }
}
function filterByCategory(slug){
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('#productGrid .pcard').forEach(card=>{
    card.style.display = (!slug || card.dataset.cat === slug) ? '' : 'none';
  });
}

/* ============ cart (in-memory only — no localStorage in previews) ============ */
let cart = [];
function findProduct(id){ return PRODUCTS.find(p=>p.id===id) || RECO.find(p=>p.id===id); }
function updateCartBadge(){ document.getElementById('cartBadge').textContent = cart.reduce((s,i)=>s+i.qty,0); }
function renderDrawer(){
  const body = document.getElementById('drawerBody');
  if(!cart.length){
    body.innerHTML = '<div class="empty-cart">Your cart is empty.<br>Add a product or use "Order with WhatsApp / Email" on any item.</div>';
  } else {
    body.innerHTML = cart.map(i=>`
      <div class="cart-line">
        <div class="thumb" style="border-radius:10px;background:var(--secondary);display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6">${icon(i.icon)}</svg></div>
        <div><div class="ci-name">${i.name}</div><div class="ci-price">${i.qty} × ${fmt(i.price)}</div></div>
        <button class="rm" onclick="removeFromCart('${i.id}')">Remove</button>
      </div>`).join('');
  }
  const total = cart.reduce((s,i)=>s+i.qty*i.price,0);
  document.getElementById('cartTotal').textContent = fmt(total);
  updateCartBadge();
}
function addToCart(id, qty=1){
  const p = findProduct(id); if(!p) return;
  const existing = cart.find(i=>i.id===id);
  if(existing){ existing.qty += qty; } else { cart.push({...p, qty}); }
  renderDrawer();
}
function removeFromCart(id){ cart = cart.filter(i=>i.id!==id); renderDrawer(); }
function openCart(){ renderDrawer(); document.getElementById('drawer').classList.add('show'); document.getElementById('overlay').classList.add('show'); }
function closeCart(){ document.getElementById('drawer').classList.remove('show'); document.getElementById('overlay').classList.remove('show'); }

/* ============ ordering — WhatsApp logo + real wa.me link, and a mailto Email option ============ */
const WHATSAPP_NUMBER = '254729044687';
const ORDER_EMAIL = 'orders@meridianexpress.co.ke';

function buildOrderText(items, total){
  const lines = items.map(i=>`• ${i.name} x${i.qty} — ${fmt(i.qty*i.price)}`).join('\n');
  return `Hello Meridian Express,\n\nI would like to place an order.\n\nOrder Details:\n${lines}\n\nTotal: ${fmt(total)}\n\nPlease confirm availability and next steps.`;
}

function quickOrder(id, channel){
  const p = findProduct(id); if(!p) return;
  addToCart(id,1);
  submitOrder(channel);
}
function quickWhatsAppEnquiry(){
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello Meridian Express, I'd like to make an order.")}`, '_blank', 'noopener');
}
function placeOrder(channel){ submitOrder(channel); }

function submitOrder(channel){
  if(!cart.length){ toast('Your cart is empty'); return; }
  const items = cart.map(i=>({id:i.id,name:i.name,qty:i.qty,price:i.price}));
  const total = cart.reduce((s,i)=>s+i.qty*i.price,0);
  const text = buildOrderText(items, total);

  if(channel === 'whatsapp'){
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  } else {
    const subject = encodeURIComponent('New order — Meridian Express');
    window.location.href = `mailto:${ORDER_EMAIL}?subject=${subject}&body=${encodeURIComponent(text)}`;
  }

  orders.unshift({
    id: 'ME' + Math.random().toString(36).slice(2,8).toUpperCase(),
    date: new Date(),
    items, total, channel,
    stage: 0, // 0 = at supplier, 1 = on route, 2 = at delivery point
  });
  cart = [];
  closeCart();
  toast(`Order sent via ${channel === 'whatsapp' ? 'WhatsApp' : 'Email'}! Track it in <a href="#" onclick="showOrders();return false;">My Orders</a>`);
  renderOrders();
}

/* ============ order tracking ("My Orders" page) — always renders content ============ */
let orders = [];
let activeFilter = 'all';
const STAGES = [
  {label:"At Supplier's Premise", icon:'<rect x="3" y="9" width="18" height="11" rx="1"/><path d="M3 9l9-6 9 6"/>'},
  {label:'On Route', icon:'<rect x="1" y="7" width="15" height="9"/><path d="M16 10h4l3 3v3h-7v-6z"/><circle cx="5.5" cy="19" r="1.6"/><circle cx="17.5" cy="19" r="1.6"/>'},
  {label:'At Delivery Point', icon:'<path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'},
];
const FILTERS = [
  {key:'all', label:'All'},
  {key:'0', label:'Processing'},
  {key:'1', label:'On the Way'},
  {key:'2', label:'Delivered'},
];
function renderChips(){
  document.getElementById('statusChips').innerHTML = FILTERS.map(f=>`
    <button class="chip ${activeFilter===f.key?'active':''}" onclick="setFilter('${f.key}')">${f.label}</button>
  `).join('');
}
function setFilter(key){ activeFilter = key; renderOrders(); }
function renderOrders(){
  renderChips();
  const list = document.getElementById('ordersList');
  const visible = orders.filter(o => activeFilter==='all' || String(o.stage) === activeFilter);

  if(!orders.length){
    list.innerHTML = `
      <div class="empty-orders">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l1-3h16l1 3"/><path d="M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7z"/><path d="M9 11a3 3 0 0 0 6 0"/></svg>
        <h3>No orders yet</h3>
        <p>Order a product via WhatsApp, Email, or the cart and it will show up here for tracking.</p>
        <a class="cta" href="#" onclick="showHome();return false;">Browse the shop →</a>
      </div>`;
    return;
  }
  if(!visible.length){
    list.innerHTML = `<div class="empty-orders"><h3>Nothing in this filter</h3><p>Try a different status tab above.</p></div>`;
    return;
  }
  list.innerHTML = visible.map(o=>`
    <div class="order-card">
      <div class="oc-top">
        <div class="oc-id">Order ID<b>${o.id}</b></div>
        <div class="oc-total"><div class="amt">${fmt(o.total)}</div><div class="date">${o.date.toLocaleString()}</div></div>
      </div>
      <ul class="oc-items">${o.items.map(i=>`<li>• ${i.name} ×${i.qty} — ${fmt(i.qty*i.price)}</li>`).join('')}</ul>
      <div class="stages">
        ${STAGES.map((s,i)=>`
          <div class="stage ${i<=o.stage?'active':''}">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${s.icon}</svg>
            <div class="slabel">${s.label}</div>
            ${i===o.stage ? '<div class="current">● Current</div>' : ''}
          </div>`).join('')}
      </div>
      <div class="oc-meta">
        <span>Status: <b>${o.stage===2?'Delivered':o.stage===1?'On Route':'Order Received'}</b></span>
        <span class="oc-channel ${o.channel}">${o.channel==='whatsapp'?'WhatsApp Order':'Email Order'}</span>
        <button style="margin-left:auto;background:none;border:1px solid var(--border);border-radius:999px;padding:5px 12px;font-size:10.5px;font-weight:700;color:var(--muted-foreground);" onclick="advanceOrder('${o.id}')">Simulate progress →</button>
      </div>
    </div>
  `).join('');
}
function advanceOrder(id){
  const o = orders.find(x=>x.id===id); if(!o) return;
  o.stage = Math.min(o.stage+1, 2);
  renderOrders();
}

/* ============ view switching ============ */
function showOrders(){ document.getElementById('homeView').style.display='none'; document.getElementById('ordersView').style.display='block'; window.scrollTo({top:0,behavior:'smooth'}); renderOrders(); }
function showHome(){ document.getElementById('ordersView').style.display='none'; document.getElementById('homeView').style.display='block'; window.scrollTo({top:0,behavior:'smooth'}); }

/* ============ toast ============ */
let toastTimer;
function toast(html){
  const el = document.getElementById('toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove('show'), 4200);
}

/* ============ init ============ */
renderProducts(PRODUCTS);
renderCategoryCards();
renderBubbles();
renderReco();
renderDrawer();
renderOrders();
