// Copyright (c) 2020 Sho Kuroda <krdlab@gmail.com>
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import path from "path";
import connect, { Database, Statement } from "better-sqlite3";
import { QuotaExceededError } from "./common";
import { Closeable } from "./closeable";

class MetaData {
  constructor(readonly key: string, readonly size: number) {}
}

export class SqliteLocalStorage implements Storage, Closeable {
  private static readonly TABLE_NAME = "items";

  private _db: Database;
  private _load: Statement;
  private _setItem: Statement;
  private _getItem: Statement;
  private _removeItem: Statement;
  private _clear: Statement;

  private _length: number = 0;
  private _bytesInUse: number = 0;
  private _keys = new Array<string>();
  private _metaMap = new Map<string, MetaData>();

  constructor(
    private readonly _location: string,
    private readonly _quota: number
  ) {
    this._db = connect(path.join(this._location, "db.sqlite3"));
    this._createTable();

    const table = SqliteLocalStorage.TABLE_NAME;
    this._load = this._db.prepare(`SELECT * FROM ${table}`);
    this._setItem = this._db.prepare(
      `INSERT OR REPLACE INTO ${table} (key, value, size) VALUES (?, ?, ?)`
    );
    this._getItem = this._db.prepare(
      `SELECT value FROM ${table} WHERE key = ?`
    );
    this._removeItem = this._db.prepare(`DELETE FROM ${table} WHERE key = ?`);
    this._clear = this._db.prepare(`DELETE FROM ${table}`);

    this._init();
  }

  private _createTable() {
    const table = SqliteLocalStorage.TABLE_NAME;
    this._db
      .prepare(
        `CREATE TABLE IF NOT EXISTS ${table} (key TEXT PRIMARY KEY, value TEXT NOT NULL, size INT NOT NULL)`
      )
      .run();
  }

  private _init() {
    const items = this._load.all();
    items.forEach((item) => {
      const key = item["key"];
      const size = Number(item["size"]);
      const meta = new MetaData(key, size);
      this._keys.push(key);
      this._metaMap.set(key, meta);
      this._length += 1;
      this._bytesInUse += meta.size;
    });

    if (this._bytesInUse > this._quota) {
      throw new QuotaExceededError("load");
    }
  }

  close() {
    this.clear();
    this._db.close();
  }

  clear(): void {
    this._clear.run();
    this._length = 0;
    this._bytesInUse = 0;
    this._keys = [];
    this._metaMap.clear();
  }

  [name: string]: any; // TODO

  get length(): number {
    return this._length;
  }

  key(index: number): string | null {
    if (index < 0 || this._keys.length <= index) {
      return null;
    }
    return this._keys[index];
  }

  setItem(key: string, value: string): void {
    const valueByteSize = Buffer.byteLength(value, "utf8");

    const metaKey = this._metaMap.get(key);
    const oldSize = metaKey && metaKey.size ? metaKey.size : 0;
    if (this._bytesInUse - oldSize + valueByteSize > this._quota) {
      throw new QuotaExceededError("setItem");
    }

    this._setItem.run(key, value, valueByteSize);

    if (metaKey) {
      // replace
      const newMetaKey = new MetaData(key, valueByteSize);
      this._metaMap.set(key, newMetaKey);
      this._bytesInUse += valueByteSize - oldSize;
    } else {
      // add
      this._keys.push(key);
      this._length += 1;

      const newMetaKey = new MetaData(key, valueByteSize);
      this._metaMap.set(key, newMetaKey);
      this._bytesInUse += valueByteSize;
    }
  }

  getItem(key: string): string | null {
    const meta = this._metaMap.get(key);
    if (!meta) {
      return null;
    }
    const row = this._getItem.get(key);
    return row ? row["value"] : null;
  }

  removeItem(key: string): void {
    const meta = this._metaMap.get(key);
    if (!meta) {
      return;
    }

    this._metaMap.delete(key);
    this._bytesInUse -= meta.size;

    const index = this._keys.indexOf(key);
    if (index != -1) {
      this._keys.splice(index, 1);
      this._length -= 1;
    }

    this._removeItem.run(key);
  }
}
