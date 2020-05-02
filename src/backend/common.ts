// Copyright (c) 2020 Sho Kuroda <krdlab@gmail.com>
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT

export class QuotaExceededError extends Error {
  constructor(message: string = "") {
    super(message);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QuotaExceededError);
    }
    this.name = "QuotaExceededError";
  }
}
