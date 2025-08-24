import * as d3 from "d3";

let gameData = [];

function parseNumber(d) {
  return d === "" ? null : +d;
}

export async function loadAndProcessData() {
  const [
    gameItems,
    categories,
    families,
    types,
    mechanics,
    persons,
    publishers,
    topRatedGames,
  ] = await Promise.all([
    d3.csv("data/bgg_GameItem.csv", (d) => ({
      id: parseNumber(d.bgg_id),
      artist: d.artist,
      category: d.category,
      complexity: parseNumber(d.complexity),
      designer: d.designer,
      family: d.family,
      game_type: d.game_type,
      max_players: parseNumber(d.max_players),
      max_time: parseNumber(d.max_time),
      mechanic: d.mechanic,
      min_age: parseNumber(d.min_age),
      min_players: parseNumber(d.min_players),
      min_time: parseNumber(d.min_time),
      name: d.name,
      publisher: d.publisher,
      year: parseNumber(d.year),
    })),
    d3.csv("data/bgg_Category.csv"),
    d3.csv("data/bgg_GameFamily.csv"),
    d3.csv("data/bgg_GameType.csv"),
    d3.csv("data/bgg_Mechanic.csv"),
    d3.csv("data/bgg_Person.csv"),
    d3.csv("data/bgg_Publisher.csv"),
    d3.csv("data/recommendations-2021-12-31.csv", (d) => ({
      id: parseNumber(d.ID),
      average_rating: parseNumber(d.Average),
      average_bayes_rating: parseNumber(d["Bayes average"]),
      users_rated: parseNumber(d["Users rated"]),
      url: d.URL,
      thumbnail: d.Thumbnail,
      rank: parseNumber(d.Rank),
      recommendations: Array.from({ length: 28 }, (_, i) => i + 1)
        .map((i) => parseNumber(d[`recommendation${i}`]))
        .filter((id) => id !== null),
    })),
  ]);
  console.log("Raw gameItems sample:", gameItems.slice(0, 3));
  console.log("Raw categories sample:", categories.slice(0, 3));
  console.log("Raw topRatedGames sample:", topRatedGames.slice(0, 3));

  const makeIDLookup = (arr) => new Map(arr.map((d) => [d.bgg_id, d.name]));

  const categoryMap = makeIDLookup(categories);
  const familyMap = makeIDLookup(families);
  const typeMap = makeIDLookup(types);
  const mechanicMap = makeIDLookup(mechanics);
  const personMap = makeIDLookup(persons);
  const publisherMap = makeIDLookup(publishers);

  const resolveIDs = (idStr, map) => {
    if (!idStr) return [];

    return (
      idStr
        .split(",")
        // .map(id => map.get(id)) // just the names
        .map((id) => ({ id: +id, name: map.get(id) }))
    ); // ids and names
  };

  const enrichedGames = gameItems.map((game) => {
    return {
      ...game,
      category: resolveIDs(game.category, categoryMap),
      family: resolveIDs(game.family, familyMap),
      game_type: resolveIDs(game.game_type, typeMap),
      mechanic: resolveIDs(game.mechanic, mechanicMap),
      designer: resolveIDs(game.designer, personMap),
      artist: resolveIDs(game.artist, personMap),
      publisher: resolveIDs(game.publisher, publisherMap),
    };
  });

  const mapByID = new Map(enrichedGames.map((item) => [item.id, item]));

  // Final data object:
  // First item (index 0) equals game with rank 1
  // Second item (index 1) equals game with rank 2,
  // ...
  gameData = topRatedGames.map((item) => ({
    ...item,
    ...mapByID.get(item.id),
  }));
}

// Return certain number of games starting from rank 1
export function getTopGames(numberOfGames = 1000) {
  if (numberOfGames > 1000) {
    console.warn(
      `Max number of games is 1000. Displaying all games now.`
    );
  }

  return gameData.slice(0, numberOfGames);
}
