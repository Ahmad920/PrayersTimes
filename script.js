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
  ar: {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء',
    Midnight: 'منتصف الليل',
    LastThird: 'الثلث الأخير'
  },
  en: {
    Fajr: 'Fajr',
    Sunrise: 'Sunrise',
    Dhuhr: 'Dhuhr',
    Asr: 'Asr',
    Maghrib: 'Maghrib',
    Isha: 'Isha',
    Midnight: 'Midnight',
    LastThird: 'Last Third'
  }
};

// Map calculation method names to Arabic
const methodNamesAr = {
  'Muslim World League': 'رابطة العالم الإسلامي',
  'Islamic Society of North America (ISNA)': 'الاتحاد الإسلامي بأمريكا الشمالية (ISNA)',
  'Egyptian General Authority of Survey': 'الهيئة المصرية العامة للمساحة',
  'Umm Al-Qura University, Makkah': 'أم القرى، مكة المكرمة',
  'University of Islamic Sciences, Karachi': 'جامعة العلوم الإسلامية كراتشي',
  'Institute of Geophysics, University of Tehran': 'معهد الجيوفيزياء، جامعة طهران',
  'Shia Ithna-Ashari, Leva Institute, Qum': 'الشيعة الإثنا عشرية، معهد ليفا، قم',
  'Gulf Region': 'الخليج',
  'Kuwait': 'الكويت',
  'Qatar': 'قطر',
  'Majlis Ugama Islam Singapura, Singapore': 'مجلس الشريعة الإسلامية سنغافورة',
  'Union Organization Islamic de France': 'الاتحاد الفرنسي للمنظمات الإسلامية',
  'Diyanet İşleri Başkanlığı, Turkey (experimental)': 'رئاسة الشؤون الدينية، تركيا (تجريبي)',
  'Spiritual Administration of Muslims of Russia': 'الإدارة الروحية لمسلمي روسيا',
  'Moonsighting Committee Worldwide (Moonsighting.com)': 'لجنة رؤية الهلال العالمية',
  'Dubai (experimental)': 'دبي (تجريبي)',
  'Jabatan Kemajuan Islam Malaysia (JAKIM)': 'وزارة الشؤون الإسلامية بماليزيا (جاكيم)',
  'Tunisia': 'تونس',
  'Algeria': 'الجزائر',
  'Kementerian Agama Republik Indonesia': 'وزارة الشؤون الدينية بجمهورية إندونيسيا',
  'Morocco': 'المغرب',
  'Comunidade Islamica de Lisboa': 'الجالية الإسلامية بلشبونة',
  'Ministry of Awqaf, Islamic Affairs and Holy Places, Jordan': 'وزارة الأوقاف والشؤون الإسلامية والمقدسات، الأردن',
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
  const methods = Object.values(calculationMethods).map(method => {
    const engName = method.name || 'Custom';
    const arName = methodNamesAr[engName] || engName;
    const id = method.id;
    const key = id.toString();
    return { key, engName, arName, id };
  });
  // select default: previous choice if valid, otherwise method id 4
  const defaultEntry = methods.find(m => m.key === prev) || methods.find(m => m.id === 4);
  // collect others
  const others = methods.filter(m => m.key !== defaultEntry.key);
  // sort others by Arabic name
  others.sort((a, b) =>
    (a.arName || '').localeCompare(b.arName || '', 'ar', { ignorePunctuation: true })
  );
  // rebuild list with default at top
  const finalList = [defaultEntry, ...others];
  // append options
  finalList.forEach(({ key, engName, arName }) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = userLang === 'ar' ? arName : engName;
    select.appendChild(opt);
  });
  // apply selection
  select.value = defaultEntry.key;
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
  ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].forEach(prayer => {
    const li = document.createElement('li');
    li.className = 'card';
    li.dataset.prayer = prayer;
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

// Start countdown to next event
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    const now = new Date();
    // build schedule of events
    const events = ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'];
    let schedule = events.map(p => {
      const [h,m] = timingData.timings[p].split(':').map(Number);
      return { p, t: new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m) };
    });
    // compute midnight & last-third
    const [mH,mM] = timingData.timings.Maghrib.split(':').map(Number);
    const [fH,fM] = tomorrowTiming.timings.Fajr.split(':').map(Number);
    const nightMin = (fH + 24) * 60 + fM - (mH * 60 + mM);
    const midMin = nightMin / 2 + (mH * 60 + mM);
    const last3Min = (nightMin * 2) / 3 + (mH * 60 + mM);
    const midDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(midMin/60), Math.floor(midMin%60));
    const last3Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(last3Min/60)%24, Math.floor(last3Min%60));
    schedule.push({ p: 'Midnight', t: midDate });
    schedule.push({ p: 'LastThird', t: last3Date });
    // determine next event
    let next = schedule.find(s => s.t > now);
    if (!next) next = { p: 'Fajr', t: new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, fH, fM) };
    const diff = next.t - now;
    const h = Math.floor(diff/1000/60/60);
    const mm = Math.floor((diff/1000/60)%60);
    const ss = Math.floor((diff/1000)%60);
    // update next event label & timer
    document.getElementById('next-prayer').textContent = userLang==='ar'
      ? `الحدث القادم: ${prayerNames.ar[next.p]}` : `Next: ${prayerNames.en[next.p]}`;
    document.getElementById('timer').textContent =
      `${h}:${mm.toString().padStart(2,'0')}:${ss.toString().padStart(2,'0')}`;
    // clear all existing highlights
    document.querySelectorAll('#prayers-list li, #midnight, #last-third').forEach(el => el.classList.remove('highlight'));
    // highlight upcoming element
    if (['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].includes(next.p)) {
      const el = document.querySelector(`#prayers-list li[data-prayer="${next.p}"]`);
      if (el) el.classList.add('highlight');
    } else if (next.p === 'Midnight') {
      document.getElementById('midnight').classList.add('highlight');
    } else if (next.p === 'LastThird') {
      document.getElementById('last-third').classList.add('highlight');
    }
  }, 1000);
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
