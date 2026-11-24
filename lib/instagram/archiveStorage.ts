const DATABASE_NAME = "instalyze-local";
const DATABASE_VERSION = 1;
const STORE_NAME = "saved-data";
const ARCHIVE_KEY = "archive";
const VIEW_KEY = "view";

export type SavedArchiveTab = "analytics" | "chat";

export interface SavedArchiveView {
  threadId: string | null;
  tab: SavedArchiveTab;
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser does not support local archive storage."));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open local archive storage."));
    request.onblocked = () => reject(new Error("Local archive storage is blocked by another open tab."));
  });
}

function readRecord<T>(key: string, parse: (value: unknown) => T | undefined): Promise<T | undefined> {
  return openDatabase().then(
    (database) =>
      new Promise<T | undefined>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).get(key);
        transaction.oncomplete = () => {
          try {
            resolve(parse(request.result));
          } catch (error) {
            reject(error);
          } finally {
            database.close();
          }
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error ?? new Error("Could not read local archive storage."));
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error ?? new Error("Reading local archive storage was interrupted."));
        };
      }),
    (error: unknown) => Promise.reject(error),
  );
}

function writeRecords(records: readonly (readonly [string, unknown])[]): Promise<void> {
  return openDatabase().then(
    (database) =>
      new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        records.forEach(([key, value]) => store.put(value, key));
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error ?? new Error("Could not save local archive data."));
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error ?? new Error("Saving local archive data was interrupted."));
        };
      }),
    (error: unknown) => Promise.reject(error),
  );
}

function deleteRecords(keys: readonly string[]): Promise<void> {
  return openDatabase().then(
    (database) =>
      new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        keys.forEach((key) => store.delete(key));
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => {
          database.close();
          reject(transaction.error ?? new Error("Could not clear local archive data."));
        };
        transaction.onabort = () => {
          database.close();
          reject(transaction.error ?? new Error("Clearing local archive data was interrupted."));
        };
      }),
    (error: unknown) => Promise.reject(error),
  );
}

function parseFile(value: unknown): File | undefined {
  if (value === undefined) return undefined;
  if (value instanceof File) return value;
  throw new Error("The saved archive could not be read. Choose the ZIP file again.");
}

function parseView(value: unknown): SavedArchiveView | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value === "object" &&
    value !== null &&
    "threadId" in value &&
    (typeof value.threadId === "string" || value.threadId === null) &&
    "tab" in value &&
    (value.tab === "analytics" || value.tab === "chat")
  ) {
    return { threadId: value.threadId, tab: value.tab };
  }
  throw new Error("The saved conversation view could not be read.");
}

export function readSavedArchive(): Promise<File | undefined> {
  return readRecord(ARCHIVE_KEY, parseFile);
}

export function readSavedArchiveView(): Promise<SavedArchiveView | undefined> {
  return readRecord(VIEW_KEY, parseView);
}

export function saveArchive(file: File, view: SavedArchiveView): Promise<void> {
  return writeRecords([
    [ARCHIVE_KEY, file],
    [VIEW_KEY, view],
  ]);
}

export function saveArchiveView(view: SavedArchiveView): Promise<void> {
  return writeRecords([[VIEW_KEY, view]]);
}

export function clearSavedArchive(): Promise<void> {
  return deleteRecords([ARCHIVE_KEY, VIEW_KEY]);
}
