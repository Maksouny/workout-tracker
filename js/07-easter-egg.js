// ---------------------------------------------------------------------
// Пасхалка: клик по лого/названию
// ---------------------------------------------------------------------
const FERRUM_JOKES = [
  '<b>Fe</b> — 26 протонов, 0 отмазок. Иди на присед.',
  'Железо не ждёт. Железо ждёт понедельника, потом вторника, потом... ладно, иди уже.',
  'Согласно нашим расчётам, лучший способ «накачаться» — не читать этот текст, а положить телефон и подойти к штанге.',
  'Ты нажал на лого вместо того, чтобы нажать на гриф. Ирония замечена.',
  'Внимание: длительное разглядывание логотипа не увеличивает объём бицепса. Мы проверяли.',
  'Железо любит троих: тебя, гравитацию и твоего физиотерапевта.',
  '«Ещё один подход» — самая опасная фраза в этом приложении.',
  'Секретный ингредиент прогресса: обычно им оказывается сон, а не эта кнопка.',
  'Наука подтверждает: 1 клик по лого = 0 калорий. Хочешь честный прогресс — открой вкладку «Журнал».',
  'Если бы клики по кнопкам считались подходами, ты бы уже был чемпионом. Увы.',
  'Дзен железа: гриф не станет легче, если долго на него смотреть. Только если меньше на него класть.',
  'Ты нашёл пасхалку. Наградой служит осознание, что можно было потратить это время на разминку.'
];
let ferrumClicks = 0;
function ferrumEasterEgg(e){
  if(e) e.stopPropagation();
  ferrumClicks++;
  const mark = e && e.currentTarget;
  if(mark){
    mark.classList.remove('ferrum-shake');
    void mark.offsetWidth;
    mark.classList.add('ferrum-shake');
  }
  let msg;
  if(ferrumClicks>=10){
    msg = `Клик №${ferrumClicks}. Ты кликаешь по кнопке усерднее, чем качаешь железо. Мы впечатлены и слегка обеспокоены. 🏋️`;
  } else {
    msg = FERRUM_JOKES[Math.floor(Math.random()*FERRUM_JOKES.length)];
  }
  let toast = document.getElementById('ferrumToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'ferrumToast';
    toast.className = 'ferrum-toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = msg;
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(()=>toast.classList.remove('show'), 7000);
}
