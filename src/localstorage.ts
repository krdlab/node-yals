// Copyright (c) 2020 Sho Kuroda <krdlab@gmail.com>
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { createBackend, BackendType } from "./backend";

export class LocalStorage implements Storage {
  private static readonly instances = new Map<string, LocalStorage>();

  private static readonly DEFAULT_QUOTA = 5 * 1024 * 1024;

  public static getInstance(
    location: string,
    backendType: BackendType = "file",
    quota: number = this.DEFAULT_QUOTA
  ): LocalStorage {
    if (!this.instances.has(location)) {
      const backend = createBackend(backendType, location, quota);
      const storage = new LocalStorage(backend);
      this.instances.set(location, storage);
    }
    return this.instances.get(location)!;
  }

  private constructor(private readonly _delegate: Storage) {}

  clear(): void {
    this._delegate.clear();
  }

  [name: string]: any; // TODO

  get length(): number {
    return this._delegate.length;
  }

  key(index: number): string | null {
    return this._delegate.key(index);
  }

  setItem(key: string, value: string): void {
    this._delegate.setItem(key, value);
  }

  getItem(key: string): string | null {
    return this._delegate.getItem(key);
  }

  removeItem(key: string): void {
    this._delegate.removeItem(key);
  }
}
