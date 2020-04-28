// Copyright (c) 2020 Sho Kuroda <krdlab@gmail.com>
// 
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

import { FileLocalStorage } from "./file";

export type BackendType = "file" | "sqlite";

export function createBackend(
  type: BackendType,
  location: string,
  quota: number
) {
  switch (type) {
    case "file":
      return new FileLocalStorage(location, quota);
  }
  throw new Error("not implemented");
}
