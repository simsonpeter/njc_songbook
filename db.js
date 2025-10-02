// IndexedDB wrapper for offline song storage
class SongDatabase {
    constructor() {
        this.dbName = 'NJC_SongBook';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create songs store
                if (!db.objectStoreNames.contains('songs')) {
                    const songsStore = db.createObjectStore('songs', { keyPath: 'id' });
                    songsStore.createIndex('songTitle', 'songTitle', { unique: false });
                    songsStore.createIndex('language', 'language', { unique: false });
                }

                // Create sync metadata store
                if (!db.objectStoreNames.contains('syncMetadata')) {
                    db.createObjectStore('syncMetadata', { keyPath: 'key' });
                }
            };
        });
    }

    async saveSongs(songs) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        
        return new Promise((resolve, reject) => {
            const promises = songs.map(song => {
                return new Promise((resolveStore, rejectStore) => {
                    const request = store.put(song);
                    request.onsuccess = () => resolveStore();
                    request.onerror = () => rejectStore(request.error);
                });
            });

            Promise.all(promises)
                .then(() => {
                    // Update last sync time
                    this.updateSyncMetadata('lastSync', new Date().toISOString());
                    resolve();
                })
                .catch(reject);
        });
    }

    async getAllSongs() {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['songs'], 'readonly');
        const store = transaction.objectStore('songs');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSongById(id) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['songs'], 'readonly');
        const store = transaction.objectStore('songs');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllSongs() {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['songs'], 'readwrite');
        const store = transaction.objectStore('songs');
        
        return new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async updateSyncMetadata(key, value) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['syncMetadata'], 'readwrite');
        const store = transaction.objectStore('syncMetadata');
        
        return new Promise((resolve, reject) => {
            const request = store.put({ key, value });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncMetadata(key) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['syncMetadata'], 'readonly');
        const store = transaction.objectStore('syncMetadata');
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getLastSyncTime() {
        return await this.getSyncMetadata('lastSync');
    }

    async getSongCount() {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['songs'], 'readonly');
        const store = transaction.objectStore('songs');
        
        return new Promise((resolve, reject) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Global instance
window.songDB = new SongDatabase();
