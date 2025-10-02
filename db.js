// IndexedDB wrapper for offline song storage
class SongDatabase {
    constructor() {
        this.dbName = 'NJC_SongBook';
        this.dbVersion = 2; // Increment version for favorites store
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

                // Create favorites store
                if (!db.objectStoreNames.contains('favorites')) {
                    const favoritesStore = db.createObjectStore('favorites', { keyPath: 'id' });
                    favoritesStore.createIndex('userId', 'userId', { unique: false });
                    favoritesStore.createIndex('songId', 'songId', { unique: false });
                    favoritesStore.createIndex('userId_songId', ['userId', 'songId'], { unique: true });
                    favoritesStore.createIndex('createdAt', 'createdAt', { unique: false });
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

    // Favorites methods
    async addFavorite(userId, songId) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['favorites'], 'readwrite');
        const store = transaction.objectStore('favorites');
        
        const favoriteData = {
            id: `${userId}_${songId}`,
            userId,
            songId,
            createdAt: new Date().toISOString()
        };
        
        return new Promise((resolve, reject) => {
            const request = store.put(favoriteData);
            request.onsuccess = () => resolve(favoriteData);
            request.onerror = () => reject(request.error);
        });
    }

    async removeFavorite(userId, songId) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['favorites'], 'readwrite');
        const store = transaction.objectStore('favorites');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(`${userId}_${songId}`);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async isFavorite(userId, songId) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['favorites'], 'readonly');
        const store = transaction.objectStore('favorites');
        
        return new Promise((resolve, reject) => {
            const request = store.get(`${userId}_${songId}`);
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getUserFavorites(userId) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['favorites'], 'readonly');
        const store = transaction.objectStore('favorites');
        const index = store.index('userId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getFavoriteSongs(userId) {
        if (!this.db) await this.init();
        
        try {
            const favorites = await this.getUserFavorites(userId);
            const favoriteSongs = [];
            
            const transaction = this.db.transaction(['songs'], 'readonly');
            const songsStore = transaction.objectStore('songs');
            
            const promises = favorites.map(favorite => {
                return new Promise((resolve, reject) => {
                    const request = songsStore.get(favorite.songId);
                    request.onsuccess = () => {
                        if (request.result) {
                            favoriteSongs.push({
                                ...request.result,
                                favoritedAt: favorite.createdAt
                            });
                        }
                        resolve();
                    };
                    request.onerror = () => reject(request.error);
                });
            });
            
            await Promise.all(promises);
            
            // Sort by when they were favorited (most recent first)
            return favoriteSongs.sort((a, b) => 
                new Date(b.favoritedAt) - new Date(a.favoritedAt)
            );
        } catch (error) {
            throw error;
        }
    }

    async deleteAllFavorites(userId) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['favorites'], 'readwrite');
        const store = transaction.objectStore('favorites');
        const index = store.index('userId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(userId);
            request.onsuccess = () => {
                const favorites = request.result;
                const deletePromises = favorites.map(fav => {
                    return new Promise((resolveDelete, rejectDelete) => {
                        const deleteRequest = store.delete(fav.id);
                        deleteRequest.onsuccess = () => resolveDelete();
                        deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
                    });
                });
                
                Promise.all(deletePromises)
                    .then(() => resolve(true))
                    .catch(reject);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async syncFavorites(favorites) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['favorites'], 'readwrite');
        const store = transaction.objectStore('favorites');
        
        return new Promise((resolve, reject) => {
            const promises = favorites.map(favorite => {
                return new Promise((resolveStore, rejectStore) => {
                    const request = store.put(favorite);
                    request.onsuccess = () => resolveStore();
                    request.onerror = () => rejectStore(request.error);
                });
            });

            Promise.all(promises)
                .then(() => {
                    resolve();
                })
                .catch(reject);
        });
    }
}

// Global instance
window.songDB = new SongDatabase();
