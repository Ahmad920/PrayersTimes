# Islamic Prayer Times Web App

A responsive website displaying:
- Five daily prayer times (Fajr, Dhuhr, Asr, Maghrib, Isha)
- Midnight (halfway between Maghrib and next-day Fajr)
- Start of the last third of the night
- Live countdown to the next prayer
- Gregorian and Hijri dates
- User location (city, country) via IP geolocation with fallback to browser GPS
- Multiple calculation methods (default: Umm Al-Qura, Makkah)
- Arabic/English language toggle

## Technologies Used
- HTML5, CSS3
- Vanilla JavaScript (ES6+)
- [Aladhan API](https://aladhan.com/prayer-times-api)
- IP geolocation via [ipapi.co](https://ipapi.co)


## File Structure
```
prayer-times/
├── index.html      # Main UI layout
├── styles.css      # Night theme & component styles
├── script.js       # Fetch, calculations, UI logic
└── README.md       # Project documentation
```

## License
MIT License. Feel free to use and modify!
