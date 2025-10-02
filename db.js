// IndexedDB wrapper for offline song storage
class SongDatabase {
    constructor() {
        this.dbName = 'NJC_SongBook';
		this.dbVersion = 2;
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

				// Create favorites store (per-song id)
				if (!db.objectStoreNames.contains('favorites')) {
					db.createObjectStore('favorites', { keyPath: 'id' });
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

	// Favorites APIs
	async addFavorite(songId) {
		if (!this.db) await this.init();
		const tx = this.db.transaction(['favorites'], 'readwrite');
		const store = tx.objectStore('favorites');
		return new Promise((resolve, reject) => {
			const request = store.put({ id: songId, favoritedAt: new Date().toISOString() });
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async removeFavorite(songId) {
		if (!this.db) await this.init();
		const tx = this.db.transaction(['favorites'], 'readwrite');
		const store = tx.objectStore('favorites');
		return new Promise((resolve, reject) => {
			const request = store.delete(songId);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async isFavorite(songId) {
		if (!this.db) await this.init();
		const tx = this.db.transaction(['favorites'], 'readonly');
		const store = tx.objectStore('favorites');
		return new Promise((resolve, reject) => {
			const request = store.get(songId);
			request.onsuccess = () => resolve(!!request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async getAllFavoriteIds() {
		if (!this.db) await this.init();
		const tx = this.db.transaction(['favorites'], 'readonly');
		const store = tx.objectStore('favorites');
		return new Promise((resolve, reject) => {
			const request = store.getAllKeys();
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	async clearFavorites() {
		if (!this.db) await this.init();
		const tx = this.db.transaction(['favorites'], 'readwrite');
		const store = tx.objectStore('favorites');
		return new Promise((resolve, reject) => {
			const request = store.clear();
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async clearAllData() {
		if (!this.db) await this.init();
		const tx = this.db.transaction(['songs', 'syncMetadata', 'favorites'], 'readwrite');
		const songsStore = tx.objectStore('songs');
		const metaStore = tx.objectStore('syncMetadata');
		const favStore = tx.objectStore('favorites');
		return new Promise((resolve, reject) => {
			let pending = 3;
			function done() { if (--pending === 0) resolve(); }
			function onerr(err) { reject(err); }
			const r1 = songsStore.clear(); r1.onsuccess = done; r1.onerror = () => onerr(r1.error);
			const r2 = metaStore.clear(); r2.onsuccess = done; r2.onerror = () => onerr(r2.error);
			const r3 = favStore.clear(); r3.onsuccess = done; r3.onerror = () => onerr(r3.error);
		});
	}
}

// Global instance
window.songDB = new SongDatabase();
