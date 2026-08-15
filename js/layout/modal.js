/* =========================================================================
   LAYOUT — MODAL
   Arrangement only: a single overlay + box the app reuses for the guided
   workout session and any other modal content (calendar, full progress,
   exercise editor, etc). Content is injected by whichever screen opens it.
   Browsing modals close on backdrop click; the active workout session
   opts out (dismissible:false) so it can't be closed accidentally — it
   already has its own explicit "Прервать" button.
   ========================================================================= */
App.Layout = App.Layout || {};
App.Layout.Modal = (function(){
  let overlay, box, dismissible = true;
  function ensure(){
    if(overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'modalOverlay';
    box = document.createElement('div');
    box.className = 'modal-box';
    box.id = 'modalBox';
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e=>{ if(e.target===overlay && dismissible) close(); });
  }
  function setBoxContent(content){
    box.innerHTML = '';
    if(content instanceof Node) box.appendChild(content);
    else if(content) box.innerHTML = content;
  }
  function open(content, opts={}){
    ensure();
    dismissible = opts.dismissible!==false;
    setBoxContent(content);
    overlay.classList.add('open');
  }
  function setContent(content){ ensure(); setBoxContent(content); }
  function close(){
    ensure();
    // The workout-session modal reuses an <input autofocus> on every set; if it
    // stays focused after the modal is hidden, the still-open mobile keyboard
    // swallows the next tap (e.g. on the bottom nav) instead of activating it.
    if(box.contains(document.activeElement)) document.activeElement.blur();
    overlay.classList.remove('open');
  }
  function getBox(){ ensure(); return box; }
  return {open, setContent, close, getBox};
})();
