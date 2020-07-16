const jsdom = require('jsdom');
const {
  JSDOM
} = jsdom;
const fetch = require('node-fetch');
const fs = require('fs');

async function parse() {
  const years = [2015, 2016, 2017, 2018, 2019];
  const tournaments = [];

  for (let i = 0; i < years.length; i++) {
    const tournament = {
      year: years[i]
    };
    const result = await parseTournament(years[i]);
    tournament.players = result;
    tournaments.push(tournament);
  }

  const allPlayers = new Map();

  for (let i = 0; i < tournaments.length; i++) {
    tournaments[i].players.forEach((stats, name) => {
      if (allPlayers.has(name)) {
        const existingPlayer = allPlayers.get(name);
        existingPlayer.positions.push(...stats.positions);
        existingPlayer.scores.push(...stats.scores);
      } else {
        allPlayers.set(name, {
          positions: stats.positions,
          scores: stats.scores
        });
      }
    });
  }

  const logger = fs.createWriteStream('data.csv', {
    flags: 'a'
  });

  allPlayers.forEach((stats, name) => {
    let totalScore = 0;
    let actualScores = 0;

    stats.scores.forEach(score => {
      if (score !== '--') {
        totalScore += parseInt(score);
        actualScores += 1;
      }
    });

    stats.averageScore = totalScore / actualScores;
    stats.totalRounds = actualScores;

    logger.write(`${name},${stats.averageScore},${stats.totalRounds}\n`);
  });

  logger.end();
}

async function parseTournament(year) {
  const statPageUrl = `https://www.pgatour.com/tournaments/the-memorial-tournament-presented-by-nationwide/past-results/jcr:content/mainParsys/pastresults.selectedYear.${year}.html`;
  const statPageResponse = await fetch(statPageUrl);
  const statPageBody = await statPageResponse.text();

  if (statPageBody) {
    const statPage = new JSDOM(statPageBody);
    const statTable = statPage.window.document.querySelectorAll('table').item(0);
    const statRows = statTable.querySelectorAll('tbody tr');

    const players = new Map();

    statRows.forEach(row => {
      const player = {};
      const playerName = row.querySelector('td a.player-link').innerHTML;

      const roundPositions = [];
      const positions = row.querySelectorAll('td span.position');
      positions.forEach(position => {
        roundPositions.push(position.innerHTML.replace('T', ''));
      });

      const roundScores = [];
      const rounds = row.querySelectorAll('td.round span.total-score');
      rounds.forEach(round => {
        roundScores.push(round.innerHTML);
      });

      if (players.has(playerName)) {
        const existingPlayer = players.get(playerName);
        existingPlayer.positions.push(roundPositions);
        existingPlayer.scores.push(roundScores);
      } else {
        players.set(playerName, {
          positions: roundPositions,
          scores: roundScores
        });
      }
    });

    return players;
  }
}

parse();