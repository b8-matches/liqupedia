const cheerio = require("cheerio");
const axios = require("axios");
const selectors = require("./selectors.json");
const sources = require("./sources")

const teamToFind = "B8";



async function parseMatches(sourcePage, selector, game) {
  const { data: html } = await axios.get(sourcePage);

  let matches = [];
  const $ = cheerio.load(html);

  const tableElements = $(selector).find("table").get();

  //storing images as promises to get them in parallel then
  const imagePromises = [];

  for (const tableElement of tableElements) {
    const leftTeamElement = $(tableElement).find(".team-left");
    const rightTeamElement = $(tableElement).find(".team-right");
    const leftTemaName = leftTeamElement.text().trim();
    const rightTeamName = rightTeamElement.text().trim();

    if (leftTemaName === teamToFind || rightTeamName === teamToFind) {
      const enemyElement =
        leftTemaName === teamToFind ? rightTeamElement : leftTeamElement;

      const enemyName = enemyElement.text().trim();
      console.log(teamToFind)
      const enemyImageLink =
        "https://liquipedia.net" + enemyElement.find("img").attr("src");

      imagePromises.push(getImageBase64(enemyImageLink));

      const tournamentName = $(tableElement)
        .find("tr:nth-child(2) > td > div > div > a")
        .text();

      const tournamentLink = $(tableElement)
        .find("tr:nth-child(2) > td > div > div > a")
        .attr("href");

      const dateText = $(tableElement)
        .find(".match-countdown")
        .text()
        .replace("-", "")
        .trim();

      const format = $(tableElement)
        .find("tr:nth-child(1)")
        .find("abbr")
        .text();

      const utcDateObj = new Date(Date.parse(dateText));

      const status = utcDateObj.getTime() < Date.now() ? "going" : "upcoming";

      matches.push({
        Enemy: {
          name: enemyName,
        },
        Game: game,
        Date: utcDateObj,
        Format: format,
        Status: status,
        Tournament: {
          name: tournamentName,
          link: "https://liquipedia.net" + tournamentLink,
        },
      });
    }
  }

  //getting images in parralel
  const images = await Promise.all(imagePromises);
  matches.forEach((match, index) => {
    match.Enemy.imageBase64 = images[index];
  });

  //console.log(`${game}`, matches);
  console.log(`${game} enemies`, matches.map(match => match.Enemy.name))
  return matches;
}

async function parseDota(dotaSource, selector) {
  const { data: html } = await axios.get(dotaSource);

  let matches = [];
  const $ = cheerio.load(html);
  const tableElements = $(selector).find("table").get();

  //storing images as promises to get them in parallel then
  const imagePromises = [];

  for (const tableElement of tableElements) {
    const leftTeamElement = $(tableElement).find(".team-left");
    const rightTeamElement = $(tableElement).find(".team-right");
    const leftTemaName = leftTeamElement.text().trim();

    const enemyElement =
      leftTemaName === teamToFind ? rightTeamElement : leftTeamElement;

    const enemyName = enemyElement.text().trim();

    const enemyImageLink =
      "https://liquipedia.net" + enemyElement.find("img").attr("src");

    imagePromises.push(getImageBase64(enemyImageLink));

    const dateText = $(tableElement)
      .find(".match-countdown")
      .text()
      .replace("-", "")
      .trim();

    const tournamentName = $(tableElement)
      .find("tr:nth-child(2) > td > div > div > a")
      .text();

    const tournamentLink = $(tableElement)
      .find("tr:nth-child(2) > td > div > div > a")
      .attr("href");

    const format = $(tableElement).find("tr:nth-child(1)").find("abbr").text();

    const utcDateObj = new Date(Date.parse(dateText));

    const status = utcDateObj.getTime() < Date.now() ? "going" : "upcoming";

    matches.push({
      Enemy: {
        name: enemyName,
        imageBase64: enemyImageLink,
      },
      Game: "Dota 2",
      Date: utcDateObj,
      Format: format,
      Status: status,
      Tournament: {
        name: tournamentName,
        link: "https://liquipedia.net" + tournamentLink,
      },
    });
  }

  //getting images in parralel
  const images = await Promise.all(imagePromises);
  matches.forEach((match, index) => {
    match.Enemy.imageBase64 = images[index];
  });

  //console.log("Dota 2", matches);
  console.log("Dota2 enemies", matches.map(match => match.Enemy.name))
  return matches;
}

async function getImageBase64(imageUrl) {
  try {
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(response.data, "binary");
    const base64Image = imageBuffer.toString("base64");
    return "data:image/png;base64, " + base64Image;
  } catch (error) {
    console.error("eroor fetching team image", error);
    return null;
  }
}

async function getMatches() {
  const [valorantMatches, CSGOMatches, dotaMatches] = await Promise.all([
    parseMatches(sources.valorantSource, selectors.valorantSelector, "Valorant"),
    parseMatches(sources.CSGOSource, selectors.CSGOSelector, "CS:GO"),
    parseDota(sources.fakeDotaSource, selectors.dotaSelector),
  ]);

  return [...dotaMatches, ...CSGOMatches, ...valorantMatches];
}

module.exports = {
  getMatches
}
