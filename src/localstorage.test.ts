import { LocalStorage } from "./localstorage";

describe("basic", () => {
  let sut: LocalStorage;

  beforeEach(() => {
    sut = LocalStorage.getInstance("./.test/basic");
  });
  afterEach(() => {
    sut.clear();
  });

  it("initial state", () => {
    expect(sut.length).toBe(0);
    expect(sut.getItem("a")).toBeNull();
  });

  it("setItem", () => {
    sut.setItem("a key", "a value");

    expect(sut.length).toBe(1);
    expect(sut.key(0)).toBe("a key");
    expect(sut.getItem("a key")).toBe("a value");
  });

  it("multi ops", () => {
    sut.setItem("key1", "value1");
    sut.setItem("key2", "value2");

    expect(sut.length).toBe(2);
    expect(sut.key(0)).toBe("key1");
    expect(sut.key(1)).toBe("key2");

    sut.removeItem("key2");

    expect(sut.length).toBe(1);
    expect(sut.getItem("key1")).toBe("value1");
  });
});

describe("removeItem", () => {
  let sut: LocalStorage;

  beforeEach(() => {
    sut = LocalStorage.getInstance("./.test/removeItem");
  });
  afterEach(() => {
    sut.clear();
  });

  it("should remove the item", () => {
    sut.setItem("a key", "a value");

    sut.removeItem("a key");

    expect(sut.getItem("a key")).toBeNull();
  });

  it("should not remove the item", () => {
    sut.setItem("a key", "a value");

    sut.removeItem("another key");

    expect(sut.getItem("a key")).toBe("a value");
  });
});

describe("getInstance", () => {
  it("should return same instance", () => {
    const first = LocalStorage.getInstance("./.test/getInstance/a");
    const second = LocalStorage.getInstance("./.test/getInstance/a");

    expect(second).toBe(first);
  });

  it("should return different instance", () => {
    const first = LocalStorage.getInstance("./.test/getInstance/a");
    const second = LocalStorage.getInstance("./.test/getInstance/b");

    expect(second).not.toBe(first);
  });
});
