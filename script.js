// =========================================
// FORM ELEMENTS
// =========================================

const form = document.getElementById('registration-form');
const regScreen = document.getElementById('registration-screen');
const successScreen = document.getElementById('success-screen');
const errorEl = document.getElementById('form-error');


// =========================================
// TRACK CARD SELECTION
// =========================================

const trackCards = document.querySelectorAll('.track-card');
const trackInput = document.getElementById('track');

trackCards.forEach(function (card) {

  card.addEventListener('click', function () {

    // Remove selected state from all cards
    trackCards.forEach(function (item) {
      item.classList.remove('selected');
    });

    // Select clicked card
    card.classList.add('selected');

    // Save selected track
    trackInput.value = card.dataset.track;

  });

});


// =========================================
// FORM SUBMIT
// =========================================

form.addEventListener('submit', function (e) {

  e.preventDefault();


  // Validate all required fields
  if (!form.checkValidity()) {

    errorEl.style.display = 'block';

    form.reportValidity();

    return;
  }


  // Hide error
  errorEl.style.display = 'none';


  // =========================================
  // GET FORM VALUES
  // =========================================

  const name = document
    .getElementById('fullname')
    .value
    .trim();

  const email = document
    .getElementById('email')
    .value
    .trim();

  const team = document
    .getElementById('teamname')
    .value
    .trim();

  const track = document
    .getElementById('track')
    .value;


  // =========================================
  // SHOW DATA ON SUCCESS SCREEN
  // =========================================

  document.getElementById('confirm-name').textContent =
    name || 'Participant';

  document.getElementById('confirm-email').textContent =
    email || 'you@example.com';

  document.getElementById('confirm-team').textContent =
    team || 'Solo — to be matched';

  document.getElementById('confirm-track').textContent =
    track || 'Open build';


  // =========================================
  // SWITCH TO SUCCESS SCREEN
  // =========================================

  regScreen.style.display = 'none';

  successScreen.style.display = 'block';

  window.scrollTo(0, 0);

});


// =========================================
// BACK TO REGISTRATION
// =========================================

document
  .getElementById('back-to-site')
  .addEventListener('click', function () {

    // Hide success screen
    successScreen.style.display = 'none';

    // Show registration screen
    regScreen.style.display = 'block';

    // Reset form
    form.reset();


    // Remove selected track card
    trackCards.forEach(function (card) {
      card.classList.remove('selected');
    });


    // Clear hidden track value
    trackInput.value = '';


    // Hide error
    errorEl.style.display = 'none';


    // Scroll to top
    window.scrollTo(0, 0);

  });