const STORAGE_KEY = 'contacthub_contacts';
const colors = [
  ['#f43f5e', '#e11d48'], ['#ec4899', '#db2777'], ['#8b5cf6', '#6d28d9'],
  ['#3b82f6', '#1d4ed8'], ['#10b981', '#059669'], ['#f59e0b', '#ea580c']
];

let contacts = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let editingId = null;
let currentPhoto = '';

const modalEl = document.getElementById('contactModal');
const modal = new bootstrap.Modal(modalEl);
const form = document.getElementById('contactForm');

const nameInput = document.getElementById('nameInput');
const phoneInput = document.getElementById('phoneInput');
const emailInput = document.getElementById('emailInput');
const addressInput = document.getElementById('addressInput');
const groupInput = document.getElementById('groupInput');
const notesInput = document.getElementById('notesInput');
const favInput = document.getElementById('favInput');
const emgInput = document.getElementById('emgInput');
const photoInput = document.getElementById('photoInput');
const photoPreview = document.getElementById('photoPreview');
const searchInput = document.getElementById('searchInput');

const listEl = document.getElementById('contactsList');
const emptyEl = document.getElementById('emptyState');
const favListEl = document.getElementById('favList');
const emgListEl = document.getElementById('emgList');

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* phone helpers */
function normalizePhone(value) {
  let p = value.replace(/[\s\-()]/g, '');
  p = p.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
  if (p.startsWith('+20')) p = '0' + p.slice(3);
  else if (p.startsWith('0020')) p = '0' + p.slice(4);
  else if (/^20\d{10}$/.test(p)) p = '0' + p.slice(2);
  return p;
}

function isEgyptianMobile(p) {
  return /^01[0125]\d{8}$/.test(p);
}

function isDuplicate(phone, ignoreId) {
  return contacts.some(c => c.phone === phone && c.id !== ignoreId);
}

/* validation */
function setError(input, errorId, message) {
  const err = document.getElementById(errorId);
  if (message) {
    input.classList.add('is-invalid');
    err.textContent = message;
    return false;
  }
  input.classList.remove('is-invalid');
  err.textContent = '';
  return true;
}

function validate() {
  const name = nameInput.value.trim();
  const phone = normalizePhone(phoneInput.value);
  const email = emailInput.value.trim();
  let ok = true;

  if (!name) ok = setError(nameInput, 'nameError', 'Please enter a name') && ok;
  else setError(nameInput, 'nameError', '');

  if (!phoneInput.value.trim()) {
    ok = setError(phoneInput, 'phoneError', 'Please enter a phone number') && ok;
  } else if (!isEgyptianMobile(phone)) {
    ok = setError(phoneInput, 'phoneError', 'Enter a valid Egyptian number (010, 011, 012 or 015 + 8 digits)') && ok;
  } else if (isDuplicate(phone, editingId)) {
    const owner = contacts.find(c => c.phone === phone);
    ok = setError(phoneInput, 'phoneError', 'This number already belongs to ' + owner.name) && ok;
  } else {
    setError(phoneInput, 'phoneError', '');
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    ok = setError(emailInput, 'emailError', 'Enter a valid email address') && ok;
  } else {
    setError(emailInput, 'emailError', '');
  }

  return ok;
}

/* rendering */
function colorFor(c) {
  const pair = colors[c.id % colors.length];
  return `linear-gradient(135deg, ${pair[0]}, ${pair[1]})`;
}

function avatarInner(c) {
  return c.photo
    ? `<img src="${c.photo}" alt="">`
    : escapeHtml(c.name.charAt(0).toUpperCase());
}

function contactCard(c) {
  const chips = [];
  if (c.emergency) chips.push('<span class="chip emg"><i class="fa-solid fa-heart-pulse"></i>Emergency</span>');
  if (c.group) chips.push(`<span class="chip"><i class="fa-solid fa-tag"></i>${escapeHtml(c.group)}</span>`);

  return `
    <div class="col-12 col-xl-6">
      <div class="contact-card">
        <div class="contact-top">
          <div class="c-avatar-wrap">
            <div class="c-avatar" style="background:${colorFor(c)}">${avatarInner(c)}</div>
            ${c.fav ? '<span class="badge-dot star"><i class="fa-solid fa-star"></i></span>' : ''}
            ${c.emergency ? '<span class="badge-dot heart"><i class="fa-solid fa-heart-pulse"></i></span>' : ''}
          </div>
          <div class="c-info">
            <h4 class="c-name">${escapeHtml(c.name)}</h4>
            <div class="c-line"><span class="tag"><i class="fa-solid fa-phone"></i></span>${c.phone}</div>
            ${c.email ? `<div class="c-line"><span class="tag mail"><i class="fa-solid fa-envelope"></i></span>${escapeHtml(c.email)}</div>` : ''}
            ${c.address ? `<div class="c-line addr"><span class="tag mail"><i class="fa-solid fa-location-dot"></i></span>${escapeHtml(c.address)}</div>` : ''}
            ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}
          </div>
        </div>
        <div class="contact-actions">
          <a class="act call" href="tel:${c.phone}" title="Call"><i class="fa-solid fa-phone"></i></a>
          <div>
            <button class="act ${c.fav ? 'on-fav' : ''}" data-action="fav" data-id="${c.id}" title="Favorite">
              <i class="${c.fav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
            </button>
            <button class="act ${c.emergency ? 'on-emg' : ''}" data-action="emg" data-id="${c.id}" title="Emergency">
              <i class="${c.emergency ? 'fa-solid fa-heart-pulse' : 'fa-regular fa-heart'}"></i>
            </button>
            <button class="act" data-action="edit" data-id="${c.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
            <button class="act del" data-action="del" data-id="${c.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      </div>
    </div>`;
}

function miniItem(c, red) {
  return `
    <div class="mini">
      <div class="c-avatar" style="background:${colorFor(c)}">${avatarInner(c)}</div>
      <div class="mini-info">
        <div class="mini-name">${escapeHtml(c.name)}</div>
        <div class="mini-phone">${c.phone}</div>
      </div>
      <a class="act call ${red ? 'red' : ''}" href="tel:${c.phone}" title="Call"><i class="fa-solid fa-phone"></i></a>
    </div>`;
}

function fillSide(el, items, emptyText, red) {
  el.innerHTML = items.length
    ? items.map(c => miniItem(c, red)).join('')
    : `<p class="side-empty">${emptyText}</p>`;
}

function render() {
  const term = searchInput.value.trim().toLowerCase();
  const shown = contacts.filter(c =>
    c.name.toLowerCase().includes(term) ||
    c.phone.includes(term) ||
    (c.email || '').toLowerCase().includes(term)
  );

  listEl.innerHTML = shown.map(contactCard).join('');
  emptyEl.classList.toggle('d-none', shown.length > 0);

  const favs = contacts.filter(c => c.fav);
  const emgs = contacts.filter(c => c.emergency);

  document.getElementById('totalCount').textContent = contacts.length;
  document.getElementById('favCount').textContent = favs.length;
  document.getElementById('emgCount').textContent = emgs.length;
  document.getElementById('subText').textContent = `Manage and organize your ${contacts.length} contacts`;

  fillSide(favListEl, favs, 'No favorites yet', false);
  fillSide(emgListEl, emgs, 'No emergency contacts', true);
}

/* photo */
function showPhoto(src) {
  photoPreview.innerHTML = src
    ? `<img src="${src}" alt="">`
    : '<i class="fa-solid fa-user"></i>';
}

document.getElementById('photoBtn').addEventListener('click', () => photoInput.click());
photoPreview.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    // shrink the picture so localStorage doesn't fill up
    const img = new Image();
    img.onload = () => {
      const size = 160;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ratio = Math.max(size / img.width, size / img.height);
      const w = img.width * ratio;
      const h = img.height * ratio;
      canvas.getContext('2d').drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      currentPhoto = canvas.toDataURL('image/jpeg', 0.8);
      showPhoto(currentPhoto);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

/* add / edit */
function openModal(contact) {
  editingId = contact ? contact.id : null;
  form.reset();
  [nameInput, phoneInput, emailInput].forEach(i => i.classList.remove('is-invalid'));
  currentPhoto = contact ? (contact.photo || '') : '';
  showPhoto(currentPhoto);

  document.getElementById('modalTitle').textContent = contact ? 'Edit Contact' : 'Add New Contact';

  if (contact) {
    nameInput.value = contact.name;
    phoneInput.value = contact.phone;
    emailInput.value = contact.email || '';
    addressInput.value = contact.address || '';
    groupInput.value = contact.group || '';
    notesInput.value = contact.notes || '';
    favInput.checked = contact.fav;
    emgInput.checked = contact.emergency;
  }
  modal.show();
}

document.getElementById('addBtn').addEventListener('click', () => openModal(null));
modalEl.addEventListener('shown.bs.modal', () => nameInput.focus());

phoneInput.addEventListener('input', () => {
  phoneInput.value = phoneInput.value.replace(/[^\d+\s\-٠-٩]/g, '');
});

form.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) return;

  const data = {
    name: nameInput.value.trim(),
    phone: normalizePhone(phoneInput.value),
    email: emailInput.value.trim(),
    address: addressInput.value.trim(),
    group: groupInput.value,
    notes: notesInput.value.trim(),
    fav: favInput.checked,
    emergency: emgInput.checked,
    photo: currentPhoto
  };

  const wasEditing = editingId !== null;
  if (wasEditing) {
    Object.assign(contacts.find(x => x.id === editingId), data);
  } else {
    contacts.unshift({ id: Date.now(), ...data });
  }

  save();
  render();
  modal.hide();

  Swal.fire({
    icon: 'success',
    title: wasEditing ? 'Updated!' : 'Added!',
    text: wasEditing ? 'Contact has been updated successfully.' : 'Contact has been added successfully.',
    timer: 1500,
    showConfirmButton: false
  });
});

/* card buttons */
listEl.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const contact = contacts.find(c => c.id === id);
  const action = btn.dataset.action;

  if (action === 'fav') {
    contact.fav = !contact.fav;
    save(); render();
  } else if (action === 'emg') {
    contact.emergency = !contact.emergency;
    save(); render();
  } else if (action === 'edit') {
    openModal(contact);
  } else if (action === 'del') {
    Swal.fire({
      title: 'Delete Contact?',
      text: `Are you sure you want to delete ${contact.name}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!'
    }).then(res => {
      if (!res.isConfirmed) return;
      contacts = contacts.filter(c => c.id !== id);
      save(); render();
      Swal.fire({
        icon: 'success',
        title: 'Deleted!',
        text: 'Contact has been deleted.',
        timer: 1500,
        showConfirmButton: false
      });
    });
  }
});

searchInput.addEventListener('input', render);

render();
