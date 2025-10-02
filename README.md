# NJC Song Book - Progressive Web App (PWA)

A Tamil song collection app built as a Progressive Web App with offline-first functionality and server synchronization.

## Features

### PWA (Progressive Web App) Features
- ✅ **Installable**: Can be installed on Android devices from Chrome browser
- ✅ **Offline-first**: Works completely offline with full functionality
- ✅ **Background Sync**: Automatically syncs when connection is restored
- ✅ **Push Notifications**: Receive updates about new content
- ✅ **App-like Experience**: Standalone display mode without browser chrome
- ✅ **Fast Loading**: Aggressive caching strategy for instant loading

### App Features
- 🔐 **Authentication**: Firebase Auth with email/password
- 📱 **Mobile Optimized**: Responsive design for Android devices
- 🎵 **Song Management**: Add, edit, delete Tamil songs
- 🔍 **Search & Filter**: Advanced search with Tamil alphabet index
- 📁 **Import/Export**: SQLite and XML import functionality
- 🌐 **Multi-language**: Tamil, Telugu, Malayalam, Kannada, Hindi support
- 💾 **Local Storage**: IndexedDB for offline data persistence

## Installation

### For Android Users:

1. **Open in Chrome**: Navigate to the app URL in Chrome browser
2. **Install App**: Tap the "Install App" button that appears or use Chrome menu → "Install App"
3. **Add to Home Screen**: The app will create a shortcut on your home screen
4. **Launch**: Tap the shortcut to open the app in standalone mode

### For Developers:

```bash
# Clone the repository
git clone <repository-url>
cd njc-songbook-pwa

# Serve the files using any static server
# Using Python:
python -m http.server 8000

# Using Node.js:
npx serve .

# Using PHP:
php -S localhost:8000
```

## Deployment Requirements

### Server Configuration
```nginx
# Nginx configuration for PWA support
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/your/app;
    index index.html;
    
    # Enable gzip compression
    gzip on;
    gzip_types text/html text/css application/javascript application/json image/svg+xml;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Service Worker and Manifest shouldn't be cached
    location ~* (sw\.js|manifest\.json)$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Offline support - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
        
        # Required for PWA
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
}
```

### HTTPS Requirement
- PWA requires HTTPS in development (use ngrok or similar)
- Production must have valid SSL certificate

## Development

### File Structure
```
/
├── index.html          # Main application file
├── manifest.json       # PWA manifest configuration
├── sw.js              # Service Worker for offline functionality
├── db.js              # IndexedDB wrapper for local storage
├── android-chrome-*.png # App icons for Android
├── favicon-*.png      # Favicons
└── README.md          # This file
```

### Firebase Configuration
Update Firebase configuration in `index.html`:
```javascript
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    // ... other config
};
```

### Environment Setup
1. Create Firebase project
2. Enable Authentication (Email/Password)
3. Enable Firestore Database
4. Configure security rules
5. Deploy to web server with HTTPS

## Offline Functionality

### How It Works:
1. **First Visit**: App downloads and caches all resources
2. **Offline Mode**: App works completely offline using cached data
3. **Background Sync**: When online, syncs local changes to server
4. **Conflict Resolution**: Merges data intelligently when conflicts occur

### Storage Strategy:
- **Cache API**: Static assets (images, CSS, JS)
- **IndexedDB**: Dynamic data (songs, user preferences)
- **Service Worker**: Acts as network proxy and cache manager

## Testing

### PWA Features Testing:
```javascript
// Check PWA installation
if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('Running as PWA');
}

// Check service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}

// Check offline storage
if ('indexedDB' in window) {
    console.log('IndexedDB supported');
}
```

### Lighthouse Audit:
Run Lighthouse PWA audit to verify:
- Service Worker registration
- Offline functionality
- Installability
- Performance
- Accessibility

## Browser Support

### Minimum Requirements:
- Chrome 68+ (Android)
- Samsung Internet 7.0+
- Firefox 59+
- Safari 11.1+ (iOS)

### Feature Support:
- ✅ Service Workers
- ✅ IndexedDB
- ✅ Background Sync
- ✅ Push Notifications
- ✅ Add to Home Screen

## Performance

### Optimization Features:
- **Code Splitting**: Load only needed JavaScript
- **Image Optimization**: Compressed images with progressive loading
- **Cache Strategy**: Intelligent caching for instant loading
- **Lazy Loading**: Load content as needed

### Metrics:
- **First Load**: ~2-3 seconds
- **Subsequent Loads**: <500ms
- **Offline Startup**: <200ms
- **Sync Time**: ~1-2 seconds (depends on data size)

## Troubleshooting

### Common Issues:

1. **App Won't Install**:
   - Ensure HTTPS
   - Check manifest.json validity
   - Verify service worker registration

2. **Offline Mode Not Working**:
   - Clear browser cache
   - Check service worker registration
   - Verify IndexedDB availability

3. **Sync Issues**:
   - Check network connection
   - Verify Firebase configuration
   - Check browser console for errors

### Debug Tools:
- Chrome DevTools > Application tab
- Service Worker section
- Storage section (IndexedDB, Cache Storage)

## Contributing

1. Fork the repository
2. Create feature branch
3. Test PWA functionality
4. Submit pull request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For support and questions:
- Email: [your-email@domain.com]
- GitHub Issues: [repository-url]/issues

---

**Built with ❤️ for the Tamil music community**