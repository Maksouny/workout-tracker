// ---------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------
document.querySelectorAll('nav button').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('nav button').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-'+btn.dataset.page).classList.add('active');
    updateNavPill(btn);
    if(btn.dataset.page==='dashboard') renderDashboard();
    closeNav();
  });
});
function updateNavPill(btn){
  const pill = document.getElementById('navPill');
  if(!pill || !btn) return;
  pill.style.height = btn.offsetHeight+'px';
  pill.style.transform = `translateY(${btn.offsetTop}px)`;
}
window.addEventListener('load', ()=>updateNavPill(document.querySelector('nav button.active')));
window.addEventListener('resize', ()=>updateNavPill(document.querySelector('nav button.active')));
function toggleNav(){
  document.getElementById('mainNav').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
}
function closeNav(){
  document.getElementById('mainNav').classList.remove('open');
  document.getElementById('overlay').classList.remove('open');
}
