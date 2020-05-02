// Copyright (c) 2020 Sho Kuroda <krdlab@gmail.com>
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import path from "path";
import fs from "fs";
import { sync as writeSync } from "write-file-atomic";
import { QuotaExceededError } from "./common";
import { Closeable } from "./closeable";

function _emptyDir(dirpath: string) {
  fs.readdirSync(dirpath).forEach((entry) => {
    const p = path.join(dirpath, entry);
    if (_isDirectory(p)) {
      _emptyDir(p);
      fs.rmdirSync(p);
    } else {
      fs.unlinkSync(p);
    }
  });
}

function _mkdirsIfAbsent(entry: string) {
  if (fs.existsSync(entry)) {
    return;
  }
  fs.mkdirSync(entry, { recursive: true });
}

function _isDirectory(entry: string) {
  return fs.statSync(entry).isDirectory();
}

function _statSync(entry: string): fs.Stats | null {
  try {
    return fs.statSync(entry);
  } catch (_) {
    return null;
  }
}

class EncodedString {
  private constructor(public readonly value: string) {}

  static fromRaw(s: string): EncodedString {
    return new EncodedString(encodeURIComponent(s));
  }

  static fromEncoded(encoded: string): EncodedString {
    return new EncodedString(encoded);
  }

  decode(): string {
    return decodeURIComponent(this.value);
  }

  createPath(parent: string): string {
    return path.join(parent, this.value);
  }
}

class MetaData {
  constructor(readonly encodedKey: EncodedString, readonly size: number = 0) {}
}

export class FileLocalStorage implements Storage, Closeable {
  private _length: number = 0;
  private _bytesInUse: number = 0;
  private _keys = new Array<string>();
  private _metaMap = new Map<string, MetaData>();

  constructor(
    private readonly _location: string,
    private readonly _quota: number
  ) {
    this._init();
  }

  private _init() {
    _mkdirsIfAbsent(this._location);
    if (!_isDirectory(this._location)) {
      throw new Error(`the location is not a directory: ${this._location}`);
    }

    const entries = fs.readdirSync(this._location);
    entries.forEach((entry) => {
      const encodedKey = EncodedString.fromEncoded(entry);
      const stat = _statSync(encodedKey.createPath(this._location));
      const meta = new MetaData(encodedKey, stat?.size);
      const key = encodedKey.decode();
      this._keys.push(key);
      this._metaMap.set(key, meta);
      this._bytesInUse += meta.size;
    });
    this._length = entries.length;

    if (this._bytesInUse > this._quota) {
      throw new QuotaExceededError("load");
    }
  }

  close() {
    this.clear();
  }

  clear(): void {
    _emptyDir(this._location);
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
    const encodedKey = EncodedString.fromRaw(key);
    const valueByteSize = Buffer.byteLength(value, "utf8");

    const metaKey = this._metaMap.get(key);
    const oldSize = metaKey && metaKey.size ? metaKey.size : 0;
    if (this._bytesInUse - oldSize + valueByteSize > this._quota) {
      throw new QuotaExceededError("setItem");
    }

    const filepath = encodedKey.createPath(this._location);
    writeSync(filepath, value, { encoding: "utf8" });

    if (metaKey) {
      // replace
      const newMetaKey = new MetaData(encodedKey, valueByteSize);
      this._metaMap.set(key, newMetaKey);
      this._bytesInUse += valueByteSize - oldSize;
    } else {
      // add
      this._keys.push(key);
      this._length += 1;

      const newMetaKey = new MetaData(encodedKey, valueByteSize);
      this._metaMap.set(key, newMetaKey);
      this._bytesInUse += valueByteSize;
    }
  }

  getItem(key: string): string | null {
    const meta = this._metaMap.get(key);
    if (!meta) {
      return null;
    }
    const filepath = meta.encodedKey.createPath(this._location);
    return fs.readFileSync(filepath, "utf8");
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

    const filepath = meta.encodedKey.createPath(this._location);
    fs.unlinkSync(filepath);
  }
}
