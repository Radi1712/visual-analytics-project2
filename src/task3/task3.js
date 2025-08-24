import * as d3 from "d3";
import graph from "pagerank.js";
import { getTopGames } from "../data_processing.js";
import { logNamedGraph, logNamedScores } from "./temp-utilz.js";

export async function initTask3() {
  // Create graph structure for PageRank
  function createGraphStructure(games) {
    const graph = {};
    const gameIds = new Set(games.map((game) => game.id));

    // Initialize empty adjacency lists for all games
    games.forEach((game) => {
      graph[game.id] = [];
    });

    // Add edges based on recommendations, but only if both games are in our input set
    games.forEach((game) => {
      if (game.recommendations) {
        game.recommendations.forEach((recId) => {
          // Only add edge if the recommended game is in our input set
          if (gameIds.has(recId)) {
            graph[game.id].push(recId);
          }
        });
      }
    });

    return graph;
  }
  // Calculate PageRank scores
  function calculatePageRank(graphData) {
    return new Promise((resolve) => {
      // Clear any previous graph data
      graph.reset();

      // Add all edges to the graph with weight 1.0
      Object.entries(graphData).forEach(([sourceId, targets]) => {
        targets.forEach((targetId) => {
          graph.link(sourceId, targetId, 1.0);
        });
      });

      const scores = {};
      // Calculate PageRank with damping factor 0.85 and epsilon 0.000001
      graph.rank(0.85, 0.000001, function (node, rank) {
        scores[node] = rank;
      });

      resolve(scores);
    });
  }

  // Create force-directed graph
  async function createVisualization(games) {
    // Get the graph structure first
    const graph = createGraphStructure(games);

    console.log("graph: ", graph);
    logNamedGraph(graph, games);

    const scores = await calculatePageRank(graph);
    logNamedScores(scores, games);

    // Set up SVG
    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    // Clear any existing SVG
    d3.select("#task3Plot").selectAll("*").remove();

    const svg = d3
      .select("#task3Plot")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create the graph data structure for D3
    const nodes = games.map((game) => ({
      id: game.id,
      name: game.name,
      score: scores[game.id] || 0,
      game: game, // Keep reference to original game data
    }));

    const links = [];
    games.forEach((game) => {
      if (game.recommendations) {
        game.recommendations.forEach((recId) => {
          if (games.some((g) => g.id === recId)) {
            links.push({
              source: game.id,
              target: recId,
            });
          }
        });
      }
    });

    // Set up force simulation
    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Create tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "1px")
      .style("border-radius", "5px")
      .style("padding", "10px");

    // Draw nodes (circles)
    const node = svg
      .append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => Math.sqrt(d.score) * 50) // Size based on PageRank score
      .attr("fill", "#69b3a2")
      .attr("stroke", "#fff")
      .attr("stroke-width", 0)
      .on("mouseover", (event, d) => {
        // Show tooltip
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(generateTooltipHtml(d.game))
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 10 + "px"); // Highlight incoming links and their arrows
        link
          .classed("highlighted", (l) => l.target.id === d.id)
          .attr("marker-end", (l) =>
            l.target.id === d.id ? "url(#arrow-highlighted)" : "url(#arrow)"
          );
        window.dispatchEvent(
          new CustomEvent("gameMouseOverTask3", {
            detail: {
              game: d.game,         // Original game object
              id: d.id,             // Or just d.id
              cluster: d.cluster || null, // If cluster info exists
            },
          })
        );
      })
      .on("mouseout", function (event, d) {
        // Hide tooltip
        tooltip.transition().duration(500).style("opacity", 0);

        // Remove highlight from all links and reset arrow markers
        link.classed("highlighted", false).attr("marker-end", "url(#arrow)");
        window.dispatchEvent(
          new CustomEvent("gameMouseOutTask3", {
            detail: { game: d.game, cluster: d.cluster },
          })
        );
      }); // Create arrow heads (normal and highlighted versions)
    const defs = svg.append("defs");

    // Normal arrow
    defs
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#999");

    // Highlighted arrow (green)
    defs
      .append("marker")
      .attr("id", "arrow-highlighted")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 8)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#427468"); // Same green color as the highlighted line// Draw lines
    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1)
      .attr("marker-end", "url(#arrow)");

    // Add zoom capabilities
    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        svg.attr("transform", event.transform);
      });

    d3.select("#task3Plot").call(zoom); // Update positions on each tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => {
          const sourceRadius = Math.sqrt(d.source.score) * 50;
          const intersection = calculateIntersection(
            d.target,
            d.source,
            sourceRadius
          );
          return intersection.x;
        })
        .attr("y1", (d) => {
          const sourceRadius = Math.sqrt(d.source.score) * 50;
          const intersection = calculateIntersection(
            d.target,
            d.source,
            sourceRadius
          );
          return intersection.y;
        })
        .attr("x2", (d) => {
          const targetRadius = Math.sqrt(d.target.score) * 50;
          const intersection = calculateIntersection(
            d.source,
            d.target,
            targetRadius
          );
          return intersection.x;
        })
        .attr("y2", (d) => {
          const targetRadius = Math.sqrt(d.target.score) * 50;
          const intersection = calculateIntersection(
            d.source,
            d.target,
            targetRadius
          );
          return intersection.y;
        });

      node.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
    });
  }

    // Listen for gameMouseOver from other tasks
    window.addEventListener("gameMouseOverTask2", (event) => {
      const gameId = event.detail.game.id;
    
      // Select nodes and links directly on each event
      const nodes = d3.select("#task3Plot").selectAll("circle");
      const links = d3.select("#task3Plot").selectAll("line");
    
      nodes
        .attr("stroke-width", (d) => (d.id === gameId ? 3 : 0))
        .attr("stroke", (d) => (d.id === gameId ? "orange" : "#fff"))
        .attr("opacity", (d) => (d.id === gameId ? 1 : 0.3));
    
      links
        .attr("stroke", (l) => (l.target.id === gameId ? "orange" : "#999"))
        .attr("stroke-opacity", (l) => (l.target.id === gameId ? 1 : 0.2))
        .attr("stroke-width", (l) => (l.target.id === gameId ? 3 : 1));
    });
  
    // Listen for gameMouseOut event to clear highlights
    window.addEventListener("gameMouseOutTask2", function (event, d) {
      const nodes = d3.select("#task3Plot").selectAll("circle");
      const links = d3.select("#task3Plot").selectAll("line");

      nodes
        .attr("stroke-width", 0)
        .attr("stroke", "#fff")
        .attr("opacity", 1);

      links
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 1);
    });

  // Update visualization when the button is clicked
  document.getElementById("updateGraph")?.addEventListener("click", () => {
    const topN =
      parseInt(document.getElementById("top-games-input").value) || 10;
    const games = getTopGames(topN);
    console.log("games: ", games);
    createVisualization(games);
  });

  // Initial visualization with default 5 games
  const initialGames = getTopGames(15);
  await createVisualization(initialGames);
}

function calculateIntersection(source, target, targetRadius) {
  // Calculate the direction vector
  const dx = target.x - source.x;
  const dy = target.y - source.y;

  // Calculate the length of the vector
  const length = Math.sqrt(dx * dx + dy * dy);

  // Normalize the vector and multiply by the circle's radius
  const intersectX = target.x - (dx / length) * targetRadius;
  const intersectY = target.y - (dy / length) * targetRadius;

  return { x: intersectX, y: intersectY };
}

function generateTooltipHtml(game) {
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
        <img src="${game.thumbnail}" alt="${
    game.name
  }" style="width: 64px; height: 64px; object-fit: cover;" />
        <div>
          <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 4px;">${
            game.name
          }</div>
          <div style="color: #666;">🏆 Rank: #${game.rank}</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; font-size: 0.9em;">
        <div style="font-weight: bold;">⭐ Rating:</div>
        <div>${game.average_rating.toFixed(
          2
        )} (${game.users_rated.toLocaleString()} ratings)</div>

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
      </div>
    </div>
  `;
}
