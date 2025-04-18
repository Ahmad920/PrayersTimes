// script.js - Handles prayer times, language toggle, and styling interactions
const apiURL = 'https://api.aladhan.com/v1/timings';
let calculationMethods = {};
let timingData = {};
let tomorrowTiming = {};
let userLang = 'ar';
let countdownInterval;

// Loading spinner controls
function showSpinner() {
  document.getElementById('spinner').classList.remove('hidden');
  document.getElementById('content').classList.add('hidden');
}
function hideSpinner() {
  document.getElementById('spinner').classList.add('hidden');
  document.getElementById('content').classList.remove('hidden');
}

const prayerNames = {
  ar: { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' },
  en: { Fajr: 'Fajr', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' },
};

// Map English method names to Arabic
const methodNamesAr = {
  'Shia Ithna-Ansari': 'الشيعة الاثنا عشرية',
  'University of Islamic Sciences, Karachi': 'جامعة العلوم الإسلامية كراتشي',
  'Islamic Society of North America': 'الاتحاد الإسلامي بأمريكا الشمالية',
  'Muslim World League': 'رابطة العالم الإسلامي',
  'Umm Al-Qura University, Makkah': 'أم القرى، مكة المكرمة',
  'Egyptian General Authority of Survey': 'الهيئة المصرية العامة للمساحة',
  'Institute of Geophysics, University of Tehran': 'معهد الجيوفيزياء، جامعة طهران',
  'Gulf Region': 'الخليج',
  'Kuwait': 'الكويت',
  'Qatar': 'قطر',
  'Majlis Ugama Islam Singapura, Singapore': 'مجلس الشريعة الإسلامية سنغافورة',
  'Union des Organisations Islamiques de France': 'الاتحاد الفرنسي للمنظمات الإسلامية',
  'Diyanet İşleri Başkanlığı, Turkey': 'رئاسة الشؤون الدينية، تركيا',
  'Spiritual Administration of Muslims of Russia': 'الإدارة الروحية لمسلمي روسيا',
  'Moonsighting Committee Worldwide': 'لجنة رؤية الهلال العالمية',
  'Custom': 'مخصص'
};

// Fetch available calculation methods
async function fetchMethods() {
  const res = await fetch('https://api.aladhan.com/v1/methods');
  const data = await res.json();
  calculationMethods = data.data;
}

// Populate dropdown with methods
function populateMethods() {
  const select = document.getElementById('calc-method');
  const prev = select.value;
  select.innerHTML = '';
  Object.entries(calculationMethods).forEach(([key, method]) => {
    const opt = document.createElement('option');
    opt.value = key;
    const engName = method.name;
    const arName = methodNamesAr[method.name] || engName;
    opt.textContent = userLang === 'ar' ? arName : engName;
    select.appendChild(opt);
  });
  // Default to Umm Al-Qura University, Makkah (method id '4') if no valid previous selection
  select.value = calculationMethods[prev] ? prev : '4';
}

// Get location via IP or fallback to geolocation
async function getLocation() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const loc = await res.json();
    if (loc.latitude && loc.longitude) {
      return { lat: loc.latitude, lon: loc.longitude, city: loc.city, country: loc.country_name };
    }
  } catch {}
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, city: 'Unknown', country: '' }),
      () => resolve({ lat: 21.4225, lon: 39.8262, city: 'Makkah', country: 'Saudi Arabia' })
    );
  });
}

// Enhanced fetchTimings: dateObj optional, if provided use timestamp endpoint
async function fetchTimings(lat, lon, method, dateObj) {
  const endpoint = dateObj
    ? `${apiURL}/${Math.floor(dateObj.getTime()/1000)}`
    : apiURL;
  const res = await fetch(`${endpoint}?latitude=${lat}&longitude=${lon}&method=${method}`);
  const data = await res.json();
  return data.data;
}

// Fetch and update all data
async function updateAll() {
  showSpinner();
  const method = document.getElementById('calc-method').value;
  const loc = await getLocation();
  const { lat, lon, city, country } = loc;
  // today
  const todayData = await fetchTimings(lat, lon, method);
  // next day Fajr
  const dt = new Date(); dt.setDate(dt.getDate() + 1);
  tomorrowTiming = await fetchTimings(lat, lon, method, dt);
  // assign
  timingData = todayData;
  displayDates();
  displayTimings();
  calcExtraTimes();
  displayLocation(city, country);
  startCountdown();
  hideSpinner();
}

// Display Hijri & Gregorian dates
function displayDates() {
  const greg = document.getElementById('gregorian');
  const hijri = document.getElementById('hijri');
  const now = new Date();
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const locale = userLang === 'ar' ? 'ar-EG' : 'en-US';
  greg.textContent = new Intl.DateTimeFormat(locale, options).format(now);
  const h = timingData.date.hijri;
  hijri.textContent = userLang === 'ar'
    ? `${h.weekday.ar}, ${h.day} ${h.month.ar} ${h.year}`
    : `${h.weekday.en}, ${h.day} ${h.month.en} ${h.year}`;
}

// Render prayer times
function displayTimings() {
  const list = document.getElementById('prayers-list');
  list.innerHTML = '';
  ['Fajr','Dhuhr','Asr','Maghrib','Isha'].forEach(prayer => {
    const li = document.createElement('li');
    li.className = 'card';
    const name = document.createElement('span');
    name.textContent = prayerNames[userLang][prayer];
    const time = document.createElement('span');
    time.textContent = timingData.timings[prayer];
    li.append(name, time);
    list.appendChild(li);
  });
}

// Calculate midnight and last third of night
function calcExtraTimes() {
  const maghrib = timingData.timings.Maghrib;
  const fajrNext = tomorrowTiming.timings.Fajr;
  const [mH, mM] = maghrib.split(':').map(Number);
  const [fH, fM] = fajrNext.split(':').map(Number);
  // compute total night minutes
  const nightMin = (fH + 24) * 60 + fM - (mH * 60 + mM);
  const midMin = nightMin / 2 + (mH * 60 + mM);
  const last3Min = (nightMin * 2) / 3 + (mH * 60 + mM);
  const fmt = m => {
    const h = Math.floor(m / 60) % 24;
    const mm = Math.floor(m % 60);
    return `${h.toString().padStart(2,'0')}:${mm.toString().padStart(2,'0')}`;
  };
  document.getElementById('midnight').innerHTML =
    `<span class="label">${userLang==='ar'?'منتصف الليل':'Midnight'}</span>`+
    `<span class="time">${fmt(midMin)}</span>`;
  document.getElementById('last-third').innerHTML =
    `<span class="label">${userLang==='ar'?'بداية الثلث الأخير':'Last Third'}</span>`+
    `<span class="time">${fmt(last3Min)}</span>`;
}

// Display city and country
function displayLocation(city, country) {
  const el = document.getElementById('city-country');
  el.textContent = userLang === 'ar' ? `${city}، ${country}` : `${city}, ${country}`;
}

// Start countdown to next prayer
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const now = new Date();
    const schedule = ['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(p => {
      const [h,m] = timingData.timings[p].split(':').map(Number);
      return {p, t: new Date(now.getFullYear(),now.getMonth(),now.getDate(),h,m)};
    });
    let next = schedule.find(s=>s.t>now);
    if (!next) next = {p:'Fajr', t: new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,schedule[0].t.getHours(),schedule[0].t.getMinutes())};
    const diff = next.t - now;
    const h = Math.floor(diff/1000/60/60);
    const mm = Math.floor((diff/1000/60)%60);
    const ss = Math.floor((diff/1000)%60);
    document.getElementById('next-prayer').textContent =
      userLang==='ar'?`الصلاة القادمة: ${prayerNames.ar[next.p]}`:`Next Prayer: ${prayerNames.en[next.p]}`;
    document.getElementById('timer').textContent =
      `${h}:${mm.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
  },1000);
}

// Toggle between Arabic and English
function toggleLanguage() {
  userLang = userLang==='ar'?'en':'ar';
  document.documentElement.lang = userLang;
  document.documentElement.dir = userLang==='ar'?'rtl':'ltr';
  document.getElementById('lang-toggle').textContent = userLang==='ar'?'English':'الإنجليزية';
  document.getElementById('method-label').textContent =
    userLang==='ar'?'طريقة الحساب':'Calculation Method';
  populateMethods();
  // Rebind change event to update timings on method change
  document.getElementById('calc-method').addEventListener('change', updateAll);
  updateAll();
}

// Initialize app
async function init() {
  await fetchMethods();
  populateMethods();
  // Bind change event to update timings on method change
  document.getElementById('calc-method').addEventListener('change', updateAll);
  document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);
  updateAll();
}

document.addEventListener('DOMContentLoaded', init);
