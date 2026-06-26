const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;

const cardPathArg = process.argv[2];

if (!cardPathArg) {
  console.error("❌ Please provide a card file path.");
  console.log("Example:");
  console.log("node preview-card.js cards/glizzboardCard.js");
  process.exit(1);
}

const cardPath = path.resolve(projectRoot, cardPathArg);

if (!fs.existsSync(cardPath)) {
  console.error(`❌ Card file not found: ${cardPathArg}`);
  process.exit(1);
}

// Clear require cache so reruns always use latest saved file
delete require.cache[require.resolve(cardPath)];

const cardModule = require(cardPath);

const createCard =
  cardModule.createGlizzboardCard ||
  cardModule.createServerCard ||
  cardModule.createServerStatsCard ||
  cardModule.createUserCard ||
  cardModule.default ||
  Object.values(cardModule).find((value) => typeof value === "function") ||
  cardModule;

if (typeof createCard !== "function") {
  console.error(`❌ No card creator function found in ${cardPathArg}`);
  console.log("Make sure your card file exports a function.");
  process.exit(1);
}

function getMockData(fileName) {
  const lower = fileName.toLowerCase();

  if (lower.includes("glizzboard")) {
    return [
      {
        title: "Call of Duty: Black Ops 6",
        rating: "4.4",
        metacritic: 83,
        releaseDate: "2024-10-25",
        genre: "Shooter",
        cover: null
      },
      {
        title: "Grand Theft Auto V",
        rating: "4.7",
        metacritic: 97,
        releaseDate: "2013-09-17",
        genre: "Action",
        cover: null
      },
      {
        title: "Fortnite",
        rating: "4.0",
        metacritic: "N/A",
        releaseDate: "2017-07-21",
        genre: "Battle Royale",
        cover: null
      },
      {
        title: "Minecraft",
        rating: "4.6",
        metacritic: 93,
        releaseDate: "2011-11-18",
        genre: "Sandbox",
        cover: null
      },
      {
        title: "Apex Legends",
        rating: "4.1",
        metacritic: 89,
        releaseDate: "2019-02-04",
        genre: "Shooter",
        cover: null
      },
      {
        title: "Rocket League",
        rating: "4.2",
        metacritic: 86,
        releaseDate: "2015-07-07",
        genre: "Sports",
        cover: null
      },
      {
        title: "Elden Ring",
        rating: "4.8",
        metacritic: 96,
        releaseDate: "2022-02-25",
        genre: "RPG",
        cover: null
      },
      {
        title: "Cyberpunk 2077",
        rating: "4.3",
        metacritic: 86,
        releaseDate: "2020-12-10",
        genre: "RPG",
        cover: null
      }
    ];
  }

  if (lower.includes("server")) {
    return {
      guildName: "High Society",
      memberCount: 128,
      onlineCount: 42,
      textChannels: 12,
      voiceChannels: 6,
      totalMessages1d: 312,
      totalMessages7d: 1844,
      totalMessages30d: 8932,
      totalVoice1d: "4h 22m",
      totalVoice7d: "28h 15m",
      totalVoice30d: "112h 48m",
      topMessages: [
        { username: "JB", count: 420 },
        { username: "GlizzyKing", count: 315 },
        { username: "SauceBoss", count: 244 }
      ],
      topVoice: [
        { username: "JB", time: "12h 30m" },
        { username: "GlizzyKing", time: "9h 12m" },
        { username: "SauceBoss", time: "7h 44m" }
      ],
      topChannels: [
        { name: "general", count: 820 },
        { name: "gaming", count: 610 },
        { name: "voice-chat", count: 390 }
      ]
    };
  }

  if (lower.includes("user")) {
    return {
      username: "JB",
      displayName: "JB",
      avatar: null,
      messages1d: 48,
      messages7d: 325,
      messages30d: 1120,
      voice1d: "2h 15m",
      voice7d: "12h 44m",
      voice30d: "48h 30m",
      rank: 1
    };
  }

  return {};
}

async function main() {
  const fileName = path.basename(cardPath);
  const mockData = getMockData(fileName);

  const buffer = await createCard(mockData);

  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Card function did not return a PNG buffer.");
  }

  const outputDir = path.join(projectRoot, "preview-output");
  fs.mkdirSync(outputDir, { recursive: true });

  const outputName = `${path.basename(fileName, ".js")}-output.png`;
  const outputPath = path.join(outputDir, outputName);

  fs.writeFileSync(outputPath, buffer);

  console.log(`✅ Preview created: ${outputPath}`);
}

main().catch((error) => {
  console.error("❌ Preview failed:");
  console.error(error);
  process.exit(1);
});