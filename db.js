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

				// Favorites store: composite key userId::songId
				if (!db.objectStoreNames.contains('favorites')) {
					const favoritesStore = db.createObjectStore('favorites', { keyPath: 'key' });
					favoritesStore.createIndex('byUser', 'userId', { unique: false });
					favoritesStore.createIndex('byUserAndState', ['userId', 'isFavorite'], { unique: false });
				}

				// Queue for offline favorite toggles
				if (!db.objectStoreNames.contains('favoriteQueue')) {
					const queueStore = db.createObjectStore('favoriteQueue', { keyPath: 'id', autoIncrement: true });
					queueStore.createIndex('byUser', 'userId', { unique: false });
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

	// ===== Favorites API =====

	_buildFavoriteKey(userId, songId) {
		return `${userId}::${songId}`;
	}

	async setFavoriteLocal(userId, songId, isFavorite) {
		if (!this.db) await this.init();
		const transaction = this.db.transaction(['favorites'], 'readwrite');
		const store = transaction.objectStore('favorites');
		const key = this._buildFavoriteKey(userId, songId);
		const record = {
			key,
			userId,
			songId,
			isFavorite: !!isFavorite,
			updatedAt: new Date().toISOString()
		};
		return new Promise((resolve, reject) => {
			const request = store.put(record);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	async isFavoriteLocal(userId, songId) {
		if (!this.db) await this.init();
		const transaction = this.db.transaction(['favorites'], 'readonly');
		const store = transaction.objectStore('favorites');
		const key = this._buildFavoriteKey(userId, songId);
		return new Promise((resolve, reject) => {
			const request = store.get(key);
			request.onsuccess = () => resolve(!!(request.result && request.result.isFavorite));
			request.onerror = () => reject(request.error);
		});
	}

	async getFavoriteSongIds(userId) {
		if (!this.db) await this.init();
		const transaction = this.db.transaction(['favorites'], 'readonly');
		const store = transaction.objectStore('favorites');
		const index = store.index('byUserAndState');
		return new Promise((resolve, reject) => {
			const request = index.getAll([userId, true]);
			request.onsuccess = () => {
				const results = request.result || [];
				resolve(results.map(r => r.songId));
			};
			request.onerror = () => reject(request.error);
		});
	}

	async replaceFavoritesForUser(userId, favoriteSongIds) {
		if (!this.db) await this.init();
		const existingIds = new Set(await this.getFavoriteSongIds(userId));
		const newIds = new Set(favoriteSongIds || []);
		const ops = [];
		// Set true for all newIds
		for (const songId of newIds) {
			ops.push(this.setFavoriteLocal(userId, songId, true));
		}
		// Set false for any that are no longer favorites
		for (const oldId of existingIds) {
			if (!newIds.has(oldId)) {
				ops.push(this.setFavoriteLocal(userId, oldId, false));
			}
		}
		await Promise.all(ops);
	}

	async enqueueFavoriteChange(userId, songId, isFavorite) {
		if (!this.db) await this.init();
		const transaction = this.db.transaction(['favoriteQueue'], 'readwrite');
		const store = transaction.objectStore('favoriteQueue');
		const record = {
			userId,
			songId,
			isFavorite: !!isFavorite,
			timestamp: Date.now()
		};
		return new Promise((resolve, reject) => {
			const request = store.add(record);
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}

	async getFavoriteQueue() {
		if (!this.db) await this.init();
		const transaction = this.db.transaction(['favoriteQueue'], 'readonly');
		const store = transaction.objectStore('favoriteQueue');
		return new Promise((resolve, reject) => {
			const request = store.getAll();
			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	async removeFavoriteQueueItem(id) {
		if (!this.db) await this.init();
		const transaction = this.db.transaction(['favoriteQueue'], 'readwrite');
		const store = transaction.objectStore('favoriteQueue');
		return new Promise((resolve, reject) => {
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}
}

// Global instance
window.songDB = new SongDatabase();
