const Benchmark = require("benchmark");
const { LocalStorage } = require("./dist/localstorage");

const file = LocalStorage.getInstance(".benchmark/file");
const sqlite = LocalStorage.getInstance(".benchmark/sqlite", "sqlite");

const value = "a".repeat(256);

const suite = new Benchmark.Suite();
suite
  .add("file", () => {
    file.setItem("a", value);
    file.getItem("a");
  })
  .add("sqlite", () => {
    sqlite.setItem("a", value);
    sqlite.getItem("a");
  })
  .on("cycle", (event) => {
    console.log(event.target.toString());
  })
  .on("complete", function () {
    console.log(`Fastest is ${this.filter("fastest").map("name")}`);
  })
  .run();
