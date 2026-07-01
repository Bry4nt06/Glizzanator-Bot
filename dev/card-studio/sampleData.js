function createMockMember({ username, displayName, avatarURL }) {
    return {
        displayName,
        displayAvatarURL: () => avatarURL,
        user: {
            username,
            tag: username,
            displayAvatarURL: () => avatarURL
        }
    };
}

const sampleAvatar = "https://cdn.discordapp.com/embed/avatars/0.png";

const samples = {
    server: {
        messages1d: 124,
        messages7d: 876,
        messages30d: 4200,
        topStreamer: {
            username: "sid3wayz",
            displayName: "Glizzard Gawd of the High Society Stream Team",
            hours: 17.4,
            avatarURL: sampleAvatar
        },
        topMembers: [
            { username: "sugewht", hours: 493.73, avatarURL: sampleAvatar },
            { username: "donkage_", hours: 492.23, avatarURL: sampleAvatar },
            { username: "sid3wayz", hours: 320.03, avatarURL: sampleAvatar }
        ],
        topChannels: [
            "1. VC#1 - 12.55 hrs",
            "2. Late Night Lobby - 8.42 hrs",
            "3. The Glizzy Lounge - 6.21 hrs"
        ],
        music: {
            title: "Nothing playing yet",
            volume: 5,
            thumbnail: null
        },
        game: {
            genre: "Newest Best Games Out Now",
            topPick: "Gothic 1 Remake",
            rating: "3.69",
            metacritic: "N/A",
            released: "2026-06-05",
            platforms: "PC, PlayStation 5, Xbox One, Xbox Series X/S",
            topThree: [
                "Bust a Nut! A Game About Really Long Titles",
                "Soccer Kick-ups",
                "Harvest Moon: The Winds of Anthos"
            ],
            thumbnail: null
        }
    },

    stream: {
        member: createMockMember({
            username: "sid3wayz",
            displayName: "Glizzard Gawd of the Infinite Streaming Realm",
            avatarURL: sampleAvatar
        }),
        channelName: "VC#1",
        startedAt: Date.now()
    }
};

module.exports = {
    samples
};
