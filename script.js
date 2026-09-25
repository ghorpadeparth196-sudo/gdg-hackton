const form = document.getElementById('registration-form');
const regScreen = document.getElementById('registration-screen');
const successScreen = document.getElementById('success-screen');
const errorEl = document.getElementById('form-error');

const trackCards = document.querySelectorAll('.track-card');
const trackInput = document.getElementById('track');

trackCards.forEach(function (card) {
  card.addEventListener('click', function () {
    trackCards.forEach(function (item) {
      item.classList.remove('selected');
    });

    card.classList.add('selected');
    trackInput.value = card.dataset.track;
  });
});

form.addEventListener('submit', function (e) {
  e.preventDefault();

  if (!form.checkValidity()) {
    errorEl.style.display = 'block';
    form.reportValidity();
    return;
  }

  errorEl.style.display = 'none';

  const name = document.getElementById('fullname').value.trim();
  const email = document.getElementById('email').value.trim();
  const team = document.getElementById('teamname').value.trim();
  const track = document.getElementById('track').value;

  document.getElementById('confirm-name').textContent =
    name || 'Participant';

  document.getElementById('confirm-email').textContent =
    email || 'you@example.com';

  document.getElementById('confirm-team').textContent =
    team || 'Solo — to be matched';

  document.getElementById('confirm-track').textContent =
    track || 'Open build';

  regScreen.style.display = 'none';
  successScreen.style.display = 'block';

  window.scrollTo(0, 0);
});

document
  .getElementById('back-to-site')
  .addEventListener('click', function () {
    successScreen.style.display = 'none';
    regScreen.style.display = 'block';

    form.reset();

    trackCards.forEach(function (card) {
      card.classList.remove('selected');
    });

    trackInput.value = '';
    errorEl.style.display = 'none';

    window.scrollTo(0, 0);
  });
