import { createReadStream } from "fs";
import { createInterface } from "readline";

const graph = {
  161936: [],
};

const graph0 = {
  115746: [187645, 233078],
  161936: [174430],
  167791: [224517, 220308, 182028],
  174430: [291457, 161936, 233078, 187645],
  182028: [220308, 167791, 224517],
  187645: [233078, 115746, 174430],
  220308: [224517, 182028, 167791],
  224517: [220308, 167791, 182028],
  233078: [187645, 115746],
  291457: [174430],
};

const keys = Object.keys(graph);
const results = [];

// Create readline interface
const fileStream = createReadStream(
  "../../data/recommendations-2021-12-31.csv"
);
const rl = createInterface({
  input: fileStream,
  crlfDelay: Infinity,
});

let isFirstLine = true;
let headers = [];

// Process line by line
rl.on("line", (line) => {
  if (isFirstLine) {
    headers = line.split(",");
    isFirstLine = false;
    return;
  }

  const values = line.split(",");
  const id = values[0]; // ID is the first column

  if (keys.includes(id)) {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    results.push(row);
  }
});

// When file is finished reading
rl.on("close", () => {
  console.log("Matching rows:");
  results.forEach((row) => {
    console.log("----------------------------------------");
    console.log(`Game Details:`);
    console.log(`ID: ${row.ID}`);
    console.log(`Name: ${row.Name}`);
    console.log(`Year: ${row.Year}`);
    console.log(`Rank: ${row.Rank}`);
    console.log(`Average: ${row.Average}`);
    console.log(`Bayes average: ${row["Bayes average"]}`);
    console.log(`Users rated: ${row["Users rated"]}`);
    console.log(`URL: ${row.URL}`);
    console.log(`Thumbnail: ${row.Thumbnail}`);

    console.log("\nRecommendations:");
    // Extract recommendations (they are numbered 1 to 28)
    const recommendations = [];
    for (let i = 1; i <= 28; i++) {
      const rec = row[`recommendation${i}`];
      if (rec && rec.trim() !== "") {
        recommendations.push(rec);
      }
    }
    console.log(recommendations.join(", "));
    console.log("----------------------------------------\n");
  });
});
