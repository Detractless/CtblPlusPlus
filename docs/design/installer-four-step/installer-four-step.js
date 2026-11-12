const steps = [...document.querySelectorAll('.screen')];
const dots = [...document.querySelectorAll('.track i')];
const counter = document.getElementById('counter');
const back = document.getElementById('back');
const next = document.getElementById('next');
const hint = document.getElementById('hint');
const input = document.getElementById('confirmInput');
const summaryLevel = document.getElementById('summaryLevel');
const summaryCopy = document.getElementById('summaryCopy');
const agreementList = document.getElementById('agreements');
const installer = document.getElementById('installer');
const installText = document.getElementById('installText');
const hints = ['Nothing on this PC changes until the last step', 'You can change this later', '', ''];
const levels = {
  test: {
    name: 'Test',
    copy: 'Fewer Windows changes. Removed with the normal Windows uninstaller.',
    agreements: [
      'Setup installs the enforcement engine for this level.',
      'Your Windows account keeps its administrator rights.',
      'You can remove it with the normal Windows uninstaller.'
    ]
  },
  protected: {
    name: 'Protected',
    copy: 'Adds the background service and watchdogs. Removal needs the CTBL++ uninstaller.',
    agreements: [
      'Setup installs the enforcement engine and two watchdogs.',
      'Your Windows account keeps its administrator rights.',
      'Removal requires the separate CTBL++ uninstaller.'
    ]
  },
  locked: {
    name: 'Locked',
    copy: 'Adds the admin seal. No uninstaller; recovery details are the only way back.',
    agreements: [
      'Setup installs the enforcement engine and two watchdogs, plus a second administrator account.',
      'Your everyday account loses administrator rights.',
      'No uninstaller is provided at this level, and recovery details are the only way back. Save them first.'
    ]
  }
};
let step = 1;

const chosen = () => document.querySelector('input[name="level"]:checked').value;
const confirmed = () => input.value.trim().toLowerCase() === 'i understand';
const agreementBoxes = () => [...document.querySelectorAll('.agree input')];
const allAgreed = () => {
  const boxes = agreementBoxes();
  return boxes.length > 0 && boxes.every(box => box.checked);
};

function updateAgreeGate() {
  if (step !== 3) return;
  const done = allAgreed();
  next.disabled = !done;
  hint.textContent = done ? 'All items checked' : `Check all ${agreementBoxes().length} items to continue`;
}

function renderAgreements() {
  const items = levels[chosen()].agreements;
  agreementList.replaceChildren(...items.map(text => {
    const label = document.createElement('label');
    label.className = 'agree';
    const box = document.createElement('input');
    box.type = 'checkbox';
    const span = document.createElement('span');
    span.textContent = text;
    label.append(box, span);
    return label;
  }));
  agreementBoxes().forEach(box => box.addEventListener('change', updateAgreeGate));
}

function paint() {
  steps.forEach(page => { page.hidden = Number(page.dataset.page) !== step; });
  dots.forEach((dot, index) => {
    dot.classList.toggle('on', index === step - 1);
    dot.classList.toggle('done', index < step - 1);
  });
  counter.textContent = `Step ${step} of 4`;
  back.hidden = step === 1;
  next.textContent = step === 4 ? 'Start setup' : 'Next';
  next.disabled = (step === 3 && !allAgreed()) || (step === 4 && !confirmed());
  if (step === 3) {
    hint.textContent = allAgreed() ? 'All items checked' : `Check all ${agreementBoxes().length} items to continue`;
  } else if (step === 4) {
    hint.textContent = confirmed() ? 'Ready — this would apply the selected level' : 'Type the phrase to continue';
  } else {
    hint.textContent = hints[step - 1];
  }
  if (step === 4) {
    summaryLevel.textContent = levels[chosen()].name;
    summaryCopy.textContent = levels[chosen()].copy;
  }
  steps.find(page => !page.hidden).focus({ preventScroll: true });
}

function go(direction) {
  step = Math.min(4, Math.max(1, step + direction));
  paint();
}

function finish() {
  back.hidden = true;
  hint.hidden = true;
  next.hidden = true;
  input.disabled = true;
  installText.textContent = `Installing ${levels[chosen()].name} setup… this can take a few minutes.`;
  installer.hidden = false;
}

steps.forEach(page => { page.tabIndex = -1; });

next.addEventListener('click', () => {
  if (step < 4) return go(1);
  finish();
});

back.addEventListener('click', () => go(-1));

document.querySelectorAll('input[name="level"]').forEach(radio => {
  radio.addEventListener('change', () => {
    summaryLevel.textContent = levels[chosen()].name;
    summaryCopy.textContent = levels[chosen()].copy;
    renderAgreements();
  });
});

input.addEventListener('input', () => {
  next.disabled = !confirmed();
  hint.textContent = confirmed() ? 'Ready — this would apply the selected level' : 'Type the phrase to continue';
});

renderAgreements();
paint();
