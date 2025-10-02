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
                    songsStore.createIndex('source', 'source', { unique: false });
                    songsStore.createIndex('lastModified', 'lastUpdated', { unique: false });
                }

                // Create sync metadata store
                if (!db.objectStoreNames.contains('syncMetadata')) {
                    db.createObjectStore('syncMetadata', { keyPath: 'key' });
                }

                // Create pending changes store for offline sync
                if (!db.objectStoreNames.contains('pendingChanges')) {
                    db.createObjectStore('pendingChanges', { keyPath: 'id' });
                    const pendingStore = db.objectStoreNames.contains('pendingChanges') ? 
                        db.transaction(['pendingChanges'], 'readwrite').objectStore('pendingChanges') : null;
                    if (pendingStore) {
                        pendingStore.createIndex('synced', 'synced', { unique: false });
                        pendingStore.createIndex('type', 'type', { unique: false });
                        pendingStore.createIndex('timestamp', 'timestamp', { unique: false });
                    }
                }

                // Create conflicts store for conflict resolution
                if (!db.objectStoreNames.contains('conflicts')) {
                    db.createObjectStore('conflicts', { keyPath: 'id' });
                    const conflictsStore = db.objectStoreNames.contains('conflicts') ? 
                        db.transaction(['conflicts'], 'readwrite').objectStore('conflicts') : null;
                    if (conflictsStore) {
                        conflictsStore.createIndex('resolved', 'resolved', { unique: false });
                        conflictsStore.createIndex('timestamp', 'timestamp', { unique: false });
                    }
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

    async getPendingChanges() {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['pendingChanges'], 'readonly');
        const store = transaction.objectStore('pendingChanges');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async addPendingChange(change) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['pendingChanges'], 'readwrite');
        const store = transaction.objectStore('pendingChanges');
        
        const changeWithId = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            synced: false,
            ...change
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(changeWithId);
            request.onsuccess = () => resolve(changeWithId.id);
            request.onerror = () => reject(request.error);
        });
    }

    async markChangeAsSynced(changeId) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['pendingChanges'], 'readwrite');
        const store = transaction.objectStore('pendingChanges');
        
        return new Promise((resolve, reject) => {
            const getRequest = store.get(changeId);
            getRequest.onsuccess = () => {
                const change = getRequest.result;
                if (change) {
                    change.synced = true;
                    store.put(change);
                    resolve();
                } else {
                    resolve();
                }
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    async clearSyncedChanges() {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['pendingChanges'], 'readwrite');
        const store = transaction.objectStore('pendingChanges');
        
        return new Promise((resolve, reject) => {
            const getAllRequest = store.getAll();
            getAllRequest.onsuccess = () => {
                const changes = getAllRequest.result;
                const syncedChanges = changes.filter(change => change.synced);
                
                const deletePromises = syncedChanges.map(change => {
                    return new Promise((resolveDelete, rejectDelete) => {
                        const deleteRequest = store.delete(change.id);
                        deleteRequest.onsuccess = () => resolveDelete();
                        deleteRequest.onerror = () => rejectDelete(deleteRequest.error);
                    });
                });
                
                Promise.all(deletePromises).then(() => resolve()).catch(reject);
            };
            getAllRequest.onerror = () => reject(getAllRequest.error);
        });
    }

    async saveSongsWithOfflineTracking(songs, isOnline) {
        if (!this.db) await this.init();
        
        // Save songs normally
        await this.saveSongs(songs);
        
        // Track changes for offline sync
        if (!isOnline) {
            for (const song of songs) {
                await this.addPendingChange({
                    type: 'create',
                    data: song
                });
            }
        }
    }

    // Enhanced save method with conflict detection
    async saveSongsEnhanced(serverSongs, localSongs) {
        if (!this.db) await this.init();
        
        const transaction = this.db.transaction(['songs', 'conflicts'], 'readwrite');
        const songsStore = transaction.objectStore('songs');
        const conflictsStore = transaction.objectStore('conflicts');
        
        return new Promise((resolve, reject) => {
            const conflicts = [];
            let processedCount = 0;
            const totalSongs = serverSongs.length + localSongs.length;
            
            // Process server songs first
            serverSongs.forEach(song => {
                const request = songsStore.put({ ...song, source: 'server' });
                request.onsuccess = () => {
                    processedCount++;
                    if (processedCount === totalSongs) {
                        resolve(conflicts);
                    }
                };
                request.onerror = () => reject(request.error);
            });
            
            // Process local songs with conflict detection
            localSongs.forEach(localSong => {
                const serverSong = serverSongs.find(s => s.id === localSong.id);
                
                if (serverSong) {
                    // Check for conflicts
                    const serverModified = serverSong.lastModified?.toDate?.()?.getTime() || 0;
                    const localModified = localSong.lastModified?.toDate?.()?.getTime() || 0;
                    
                    if (serverModified !== localModified && localModified > 0) {
                        // Conflict detected
                        conflicts.push({
                            id: localSong.id,
                            serverVersion: serverSong,
                            localVersion: localSong,
                            timestamp: new Date().toISOString()
                        });
                        
                        // Store conflict for user resolution
                        conflictsStore.add({
                            id: localSong.id,
                            serverVersion: serverSong,
                            localVersion: localSong,
                            resolved: false,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
                
                const request = songsStore.put({ ...localSong, source: 'local_merged' });
                request.onsuccess = () => {
                    processedCount++;
                    if (processedCount === totalSongs) {
                        resolve(conflicts);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        });
    }
}

// Global instance
window.songDB = new SongDatabase();
