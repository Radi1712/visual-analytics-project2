import { getTopGames } from "../data_processing";
import { kMeans } from "../kmeans";
import * as d3 from "d3";

let allGames = getTopGames();
let top10Games = getTopGames(10);

function generateTooltipHtml(d) {
  console.log("Current Input:",d);
  const game = d.game;
  const playerCount =
    game.min_players === game.max_players
      ? `${game.min_players}`
      : `${game.min_players}-${game.max_players}`;

  const playTime =
    game.min_time === game.max_time
      ? `${game.min_time}`
      : `${game.min_time}-${game.max_time}`;

  const categories = game.category?.map((cat) => cat.name).join(", ") || "N/A";
  const gameTypes =
    game.game_type?.map((type) => type.name).join(", ") || "N/A";

  return `
    <div style="max-width: 300px;">
      <div style="display: flex; align-items: start; gap: 10px; margin-bottom: 10px;">
        <img src="${game.thumbnail}" alt="${game.name}" style="width: 64px; height: 64px; object-fit: cover;" />
        <div>
          <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 4px;">${game.name}</div>
          <div style="color: #666;">🏆 Rank: #${game.rank}</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; font-size: 0.9em;">
        <div style="font-weight: bold;">⭐ Rating:</div>
        <div>${game.average_rating.toFixed(2)} (${game.users_rated.toLocaleString()} ratings)</div>

        <div style="font-weight: bold;">🎲 Type:</div>
        <div>${gameTypes}</div>

        <div style="font-weight: bold;">🎮 Players:</div>
        <div>${playerCount} players</div>

        <div style="font-weight: bold;">⏱️ Time:</div>
        <div>${playTime} minutes</div>

        <div style="font-weight: bold;">👥 Age:</div>
        <div>${game.min_age}+ years</div>

        <div style="font-weight: bold;">📅 Year:</div>
        <div>${game.year}</div>

        <div style="font-weight: bold;">🎯 Categories:</div>
        <div>${categories}</div>

        <div style="font-weight: bold;">📊 Bayes Rating:</div>
        <div>${d.rawBayes?.toFixed(2) ?? "N/A"} (${d.y?.toFixed(1) ?? "?"})</div>

        <div style="font-weight: bold;">🧠 Complexity:</div>
        <div>${d.rawComplexity?.toFixed(2) ?? "N/A"} (${d.x?.toFixed(1) ?? "?"})</div>
      </div>
    </div>
  `;
}

export function initTask2() {
  // determine max rating (bayesian)
  const maxBayesianRating = Math.max(
    ...allGames
      .map((g) => parseFloat(g.average_bayes_rating))
      .filter((x) => !isNaN(x) && x < 100)
  );
  console.log("Max average Bayesian rating (filtered):", maxBayesianRating);

  // determine max complexity
  const maxComplexity = Math.max(
    ...allGames
      .map((g) => parseFloat(g.complexity))
      .filter((x) => !isNaN(x) && x < 100) // filter broken entries like 4523
  );
  console.log("Max complexity (filtered):", maxComplexity);

  // determine min complexity
  const minComplexity = Math.min(
    ...allGames
      .map((g) => parseFloat(g.complexity))
      .filter((x) => !isNaN(x) && x < 100) // filter broken entries like 4523
  );
  console.log("Min complexity (filtered):", minComplexity);

  //--------------------------------------------------------------------------------------------------
  // normalize values for the feature vector
  function normalizeGame(game, minBayes, maxBayes, minC, maxC) {
    const rawComplexity = parseFloat(game.complexity);
    const rawBayes = parseFloat(game.average_bayes_rating);

    // fix malformed values
    const complexity =
      rawComplexity > 10 ? rawComplexity / 1000 : rawComplexity;

    // skip invalid values
    if (!complexity || !rawBayes || isNaN(complexity) || isNaN(rawBayes))
      return null;

    // normalize using dynamic min/max
    const normalizedComplexity = (complexity - minC) / (maxC - minC);
    const normalizedBayes = (rawBayes - minBayes) / (maxBayes - minBayes);

    return [normalizedBayes, normalizedComplexity];
  }

  // call function as test
  const featureVectors = top10Games.map(normalizeGame);
  console.log("Normalized feature vector:", featureVectors);

  //--------------------------------------------------------------------------------------------------
  // run clustering

  // run visualization on button press
  document
    .getElementById("drawVisualization")
    .addEventListener("click", runClustering);

  function runClustering() {
    const N = parseInt(document.getElementById("top-n-input").value);
    const k = parseInt(document.getElementById("k-select").value);
    const distance = document.getElementById("distance-select").value;

    // get top N games
    const rawGames = getTopGames(N);

    // Compute dynamic min/max for the top N games
    const complexities = rawGames
      .map((g) =>
        parseFloat(g.complexity > 10 ? g.complexity / 1000 : g.complexity)
      )
      .filter((c) => !isNaN(c) && c > 0);

    const bayesRatings = rawGames
      .map((g) => parseFloat(g.average_bayes_rating))
      .filter((b) => !isNaN(b) && b > 0);

    const minC = Math.min(...complexities);
    const maxC = Math.max(...complexities);
    const minBayes = Math.min(...bayesRatings);
    const maxBayes = 8.511; // fixed

    console.log(`Bayes Rating Range: ${minBayes} to ${maxBayes}`);
    console.log(`Complexity Range: ${minC} to ${maxC}`);

    // Normalize games
    const gamePairs = rawGames
      .map((game) => ({
        game,
        vec: normalizeGame(game, minBayes, maxBayes, minC, maxC),
      }))
      .filter((pair) => pair.vec !== null);

    const games = gamePairs.map((p) => p.game);
    const points = gamePairs.map((p) => p.vec);

    // weight both features equally
    const weights = [1, 1];

    // run k-means
    const result = kMeans(points, k, weights, distance);

    console.log("Filtered games count:", games.length);
    console.log("Clustering result:", result);

    // visualize
    visualizeClusters(games, points, result.clusters, result.centroids);
  }

  //--------------------------------------------------------------------------------------------------
  // visualization function
  function visualizeClusters(games, points2D, clusters, centroids) {
    const svgWidth = 600,
      svgHeight = 500;
    const margin = { top: 80, right: 20, bottom: 40, left: 50 };
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    // Clear old plot
    d3.select("#clusterPlot").selectAll("*").remove();

    const svgRoot = d3
      .select("#clusterPlot")
      .attr("width", svgWidth + 5)
      .attr("height", svgHeight);

    svgRoot.selectAll("*").remove(); // clear previous content

    const mainGroup = svgRoot
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const zoomGroup = mainGroup.append("g").attr("class", "zoom-layer");

    // Set up scales
    const x = d3
      .scaleLinear()
      .domain([0, 1]) // normalized complexity
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, 1]) // normalized bayes rating
      .range([height, 0]);

    // Color by cluster ID
    const color = d3.scaleOrdinal(d3.schemeTableau10);

    // Axes
    zoomGroup
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));
    zoomGroup.append("g").call(d3.axisLeft(y));

    // Labels
    zoomGroup
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 30)
      .attr("text-anchor", "middle")
      .text("Normalized Complexity");

    zoomGroup
      .append("text")
      .attr("x", -height / 2)
      .attr("y", -35)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text("Normalized Bayesian Rating");

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "8px")
      .style("border", "1px solid #ccc")
      .style("pointer-events", "none")
      .style("opacity", 0);

    // Draw centroids
    zoomGroup
      .selectAll("rect.centroid")
      .data(centroids)
      .enter()
      .append("rect")
      .attr("class", "centroid")
      .attr("x", (d) => x(d[1]) - 6) // d[1] = normalized complexity (X)
      .attr("y", (d) => y(d[0]) - 6) // d[0] = normalized bayes rating (Y)
      .attr("width", 12)
      .attr("height", 12)
      .attr("fill", (_, i) => color(i))
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5)
      .attr("opacity", 1);

    // Draw points
    zoomGroup
      .selectAll("circle")
      .data(
        points2D.map((d, i) => {
          const game = games[i];
          return {
            x: d[1], // normalized complexity
            y: d[0], // normalized bayes rating
            cluster: clusters[i],
            game,
            rawComplexity: parseFloat(
              game.complexity > 10 ? game.complexity / 1000 : game.complexity
            ),
            rawBayes: parseFloat(game.average_bayes_rating),
          };
        })
      )
      .enter()
      .append("circle")
      .attr("cx", (d) => x(d.x))
      .attr("cy", (d) => y(d.y))
      .attr("r", 3.5)
      .attr("fill", (d) => color(d.cluster))
      .attr("stroke", "#333")
      .style("opacity", 0.5)
      .on("mouseover", (event, d) => {
        tooltip.html(generateTooltipHtml(d))
          .style("left", `${event.pageX + 12}px`)
          .style("top", `${event.pageY - 28}px`)
          .style("opacity", 1);
          // Dispatch custom event 'gameMouseOver'
        window.dispatchEvent(
          new CustomEvent("gameMouseOverTask2", {
            detail: { game: d.game, cluster: d.cluster },
          })
        );
      })
      .on("mouseout", function (event, d) {
        tooltip.style("opacity", 0);
        // Dispatch custom event 'gameMouseOut'
        window.dispatchEvent(
          new CustomEvent("gameMouseOutTask2", {
            detail: { game: d.game, cluster: d.cluster },
          })
        );
      });

    const zoom = d3
      .zoom()
      .scaleExtent([0.5, 20])
      .translateExtent([
        [0, 0],
        [svgWidth, svgHeight],
      ])
      .on("zoom", (event) => {
        zoomGroup.attr("transform", event.transform);
      });

    svgRoot.call(zoom);

    // reset zoom
    document.getElementById("resetZoom").addEventListener("click", () => {
      svgRoot.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });

    // add legends
    const legend = svgRoot
      .append("g")
      .attr("class", "legend")
      .attr("transform", `translate(20, 20)`);

    // game points
    legend
      .append("circle")
      .attr("cx", 0)
      .attr("cy", 0)
      .attr("r", 5)
      .attr("fill", "#999")
      .attr("stroke", "#333");

    legend
      .append("text")
      .attr("x", 12)
      .attr("y", 4)
      .style("font-size", "12px")
      .text("Board Games");

    // centroids
    legend
      .append("rect")
      .attr("x", -5)
      .attr("y", 15)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", "#999")
      .attr("stroke", "#000")
      .attr("stroke-width", 1.5);

    legend
      .append("text")
      .attr("x", 12)
      .attr("y", 24)
      .style("font-size", "12px")
      .text("Centroids");
  }

  // Highlight from Task 3
  window.addEventListener("gameMouseOverTask3", (event) => {
    const { id } = event.detail;

    d3.select("#clusterPlot")
      .selectAll("circle")
      .each(function (d) {
        const isMatch = d?.game?.id === id;

        d3.select(this)
          .attr("stroke-width", isMatch ? 25 : 1)
          .attr("stroke", isMatch ? "orange" : "#333")
          .attr("opacity", isMatch ? 1 : 0.3);
      });
  });

  // Listen for un-highlighting from Task 3
  window.addEventListener("gameMouseOutTask3", () => {
    d3.select("#clusterPlot")
      .selectAll("circle")
      .attr("stroke-width", 1)
      .attr("stroke", "#333")
      .attr("opacity", 0.5);
  });
}
