// Convert graph IDs to game names
export function logNamedGraph(graph, games) {
  const idToName = new Map();
  games.forEach((game) => {
    idToName.set(game.id, game.name);
  });

  const namedGraph = {};
  Object.entries(graph).forEach(([gameId, recommendedIds]) => {
    const gameName = idToName.get(parseInt(gameId));
    namedGraph[gameName] = recommendedIds.map((id) =>
      idToName.get(parseInt(id))
    );
  });

  console.log("namedGraph: ", namedGraph);
}

// Convert scores IDs to game names
export function logNamedScores(scores, games) {
  const idToName = new Map();
  games.forEach((game) => {
    idToName.set(game.id, game.name);
  });

  const formattedScores = {};
  Object.entries(scores).forEach(([gameId, score]) => {
    const gameName = idToName.get(parseInt(gameId));
    // Take first 5 decimal places of score and full game name
    const scoreStr = score.toFixed(5);
    const key = `${scoreStr}_${gameName}`;
    formattedScores[key] = score;
  });

  console.log("formattedScores: ", formattedScores);
}
