const RAWG_BASE_URL = "https://api.rawg.io/api";
const CACHE_TTL_MS = 15 * 60 * 1000;
const rawgCache = new Map();

const genreAliases = {
    horror: { tags: "horror" },
    scary: { tags: "horror" },
    racing: { genres: "racing" },
    race: { genres: "racing" },
    shooter: { genres: "shooter" },
    fps: { genres: "shooter" },
    rpg: { genres: "role-playing-games-rpg" },
    roleplay: { genres: "role-playing-games-rpg" },
    "role playing": { genres: "role-playing-games-rpg" },
    adventure: { genres: "adventure" },
    action: { genres: "action" },
    sports: { genres: "sports" },
    fighting: { genres: "fighting" },
    puzzle: { genres: "puzzle" },
    platformer: { genres: "platformer" },
    simulation: { genres: "simulation" },
    strategy: { genres: "strategy" },
    indie: { genres: "indie" },
    arcade: { genres: "arcade" },
    "open world": { tags: "open-world" },
    openworld: { tags: "open-world" },
    multiplayer: { tags: "multiplayer" },
    coop: { tags: "co-op" },
    "co op": { tags: "co-op" },
    zombie: { tags: "zombies" },
    zombies: { tags: "zombies" },
    survival: { tags: "survival" },
    anime: { tags: "anime" }
};

function normalizeInput(input) {
    const value = String(input || "").trim().toLowerCase();
    return value === "all" ? "" : value;
}

function titleCase(input) {
    return String(input || "")
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function buildGameUrl(slug) {
    return `https://rawg.io/games/${slug}`;
}

function formatPlatforms(platforms) {
    if (!Array.isArray(platforms)) return "Unknown";

    const names = platforms
        .map((item) => item?.platform?.name)
        .filter(Boolean)
        .slice(0, 5);

    return names.length ? names.join(", ") : "Unknown";
}

function getYear(released) {
    if (!released) return "Unknown";
    return String(released).slice(0, 4);
}

function formatDate(date) {
    return date.toISOString().split("T")[0];
}

function getDateDaysAgo(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return formatDate(date);
}

function getMonthlyLookbackRange(monthIndex) {
    const endDaysAgo = monthIndex * 30;
    const startDaysAgo = (monthIndex + 1) * 30;

    const startDate = getDateDaysAgo(startDaysAgo);
    const endDate = getDateDaysAgo(endDaysAgo);

    return {
        startDate,
        endDate,
        label: `${startDate} to ${endDate}`
    };
}

function getLast30DaysRange() {
    return getMonthlyLookbackRange(0);
}

function getFilters(input) {
    const normalized = normalizeInput(input);
    const alias = genreAliases[normalized];

    if (!normalized) return {};
    if (alias) return alias;

    return { search: normalized };
}

function isReleasedNow(game) {
    if (!game?.released || game.released === "Unknown") return false;

    const releasedAt = new Date(game.released);
    const now = new Date();

    return Number.isFinite(releasedAt.getTime()) && releasedAt <= now;
}

function getDaysSinceRelease(game) {
    if (!game?.released || game.released === "Unknown") return 9999;

    const releasedAt = new Date(game.released);
    const now = new Date();

    if (!Number.isFinite(releasedAt.getTime())) return 9999;

    return Math.max(0, Math.floor((now - releasedAt) / (1000 * 60 * 60 * 24)));
}

function getGameScore(game, daysBack = 90) {
    const metacritic = Number(game.metacritic) || 0;
    const rating = Number(game.rating) || 0;
    const ratingsCount = Number(game.ratingsCount) || 0;
    const daysOld = getDaysSinceRelease(game);

    const metacriticScore = metacritic;
    const ratingScore = rating * 20;
    const recencyScore = Math.max(0, ((daysBack - daysOld) / daysBack) * 25);
    const popularityScore = Math.min(15, Math.log10(ratingsCount + 1) * 5);

    return (metacriticScore * 0.45) + (ratingScore * 0.30) + recencyScore + popularityScore;
}

function getRandomItem(items = []) {
    if (!Array.isArray(items) || !items.length) return null;
    return items[Math.floor(Math.random() * items.length)];
}

function addUniqueGames(target, games) {
    const seen = new Set(target.map((game) => game.slug || game.name));

    for (const game of games || []) {
        const key = game.slug || game.name;

        if (!key || seen.has(key)) continue;

        target.push(game);
        seen.add(key);
    }

    return target;
}

function mapGames(results = [], daysBack = 90) {
    return results
        .filter((game) => game && game.name && game.slug)
        .map((game) => ({
            name: game.name,
            slug: game.slug,
            released: game.released || "Unknown",
            year: getYear(game.released),
            rating: game.rating || "N/A",
            ratingsCount: game.ratings_count || 0,
            metacritic: game.metacritic || "N/A",
            platforms: formatPlatforms(game.platforms),
            image: game.background_image || null,
            url: buildGameUrl(game.slug)
        }))
        .filter((game) => isReleasedNow(game))
        .filter((game) => game.image)
        .sort((a, b) => getGameScore(b, daysBack) - getGameScore(a, daysBack))
        .map((game, index) => ({
            ...game,
            rank: index + 1,
            score: Number(getGameScore(game, daysBack).toFixed(2))
        }));
}

async function rawgRequest(params, options = {}) {
    const apiKey = process.env.RAWG_API_KEY;
    const daysBack = options.daysBack || 90;

    if (!apiKey) {
        throw new Error("Missing RAWG_API_KEY in .env");
    }

    params.set("key", apiKey);

    const response = await fetch(`${RAWG_BASE_URL}/games?${params.toString()}`);

    if (!response.ok) {
        throw new Error(`RAWG request failed: ${response.status}`);
    }

    const data = await response.json();

    return mapGames(data.results || [], daysBack);
}

function buildGameCardPayload(result = {}) {
    const games = Array.isArray(result.games) ? result.games : [];
    const topPick = games[0] || null;
    const topThreeAfterPick = games.slice(1, 4);
    const previewGame = getRandomItem(games.slice(0, 10)) || topPick;

    return {
        genre: result.label || "Newest Best Games Out Now",
        range: result.range || "",
        previewTitle: previewGame?.name || "Random Game Preview",
        previewThumbnail: previewGame?.image || null,
        previewUrl: previewGame?.url || null,
        topPick: topPick?.name || "No game activity yet",
        rating: topPick?.rating || "N/A",
        metacritic: topPick?.metacritic || "N/A",
        released: topPick?.released || "N/A",
        platforms: topPick?.platforms || "Use /topgames to search",
        thumbnail: topPick?.image || null,
        image: topPick?.image || null,
        url: topPick?.url || null,
        topThree: topThreeAfterPick.map((game) => game.name),
        topThreeGames: topThreeAfterPick
    };
}

function cloneResult(result) {
    return JSON.parse(JSON.stringify(result));
}

async function searchNewestBestGamesOutNow(input = "") {
    const normalized = normalizeInput(input);
    const cacheKey = `newest-best:${normalized || "all"}`;
    const cached = rawgCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.createdAt < CACHE_TTL_MS) {
        return cloneResult(cached.result);
    }

    const filters = getFilters(normalized);
    const neededGames = 8;
    const maxMonthsToSearch = 12;
    const collectedGames = [];
    let finalRangeLabel = "";

    for (let monthIndex = 0; monthIndex < maxMonthsToSearch; monthIndex += 1) {
        const { startDate, endDate, label } = getMonthlyLookbackRange(monthIndex);
        const params = new URLSearchParams({
            page_size: "40",
            dates: `${startDate},${endDate}`,
            ordering: "-metacritic"
        });

        if (filters.genres) params.set("genres", filters.genres);
        if (filters.tags) params.set("tags", filters.tags);
        if (filters.search) params.set("search", filters.search);

        try {
            const games = await rawgRequest(params, { daysBack: 30 });
            addUniqueGames(collectedGames, games);
            finalRangeLabel = monthIndex === 0
                ? label
                : `${getMonthlyLookbackRange(monthIndex).startDate} to ${getDateDaysAgo(0)}`;

            if (collectedGames.length >= neededGames) break;
        } catch (error) {
            console.log(`RAWG monthly lookup failed for ${label}:`, error.message);
        }
    }

    const result = {
        query: normalized,
        range: finalRangeLabel || "Recent releases",
        label: normalized ? `${titleCase(normalized)} - Top Games` : "Top Games",
        games: collectedGames.slice(0, neededGames)
    };

    const finalResult = {
        ...result,
        card: buildGameCardPayload(result)
    };

    rawgCache.set(cacheKey, {
        createdAt: now,
        result: cloneResult(finalResult)
    });

    return finalResult;
}

async function searchTopGamesLastMonth() {
    return searchNewestBestGamesOutNow();
}

async function searchTopGamesLastMonthByGenre(input) {
    return searchNewestBestGamesOutNow(input);
}

module.exports = {
    searchNewestBestGamesOutNow,
    searchTopGamesLastMonth,
    searchTopGamesLastMonthByGenre,
    buildGameCardPayload
};
