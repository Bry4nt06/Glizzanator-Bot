const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

const GLIZZY_NICKNAMES = [
    "Glizzy Gladiator",
    "Sir Glizzington",
    "Glizzy Goblin",
    "The Wiener Wizard",
    "Glizzy Gremlin",
    "Hotdog Hero",
    "Glizzy Gobbler",
    "Bun Commander",
    "Frank Tank",
    "Key Glizzock",
    "The Mustard Mage",
    "Wiener Warrior",
    "Glizzy Knight",
    "Dogzilla",
    "The Relish Reaper",
    "Glizzy General",
    "Hotdog Houdini",
    "Glizzy Bandito",
    "Glizzy McSizzle",
    "Sausage Samurai",
    "The Chili Charmer",
    "Glizz Khalifa",
    "Glizzy Hendrix",
    "Glizzy Smalls",
    "Wiener Supreme",
    "Chili Cheese Chief",
    "Glizzy Montana",
    "The Hotdog Hitman",
    "Glizzy Guzzler",
    "Pork Torpedo",
    "Sodium Dart",
    "Glizzy Neptune",
    "Captain Condiment",
    "The Weenie Warden",
    "Glizzy Prime",
    "Mustard Maximus",
    "The Bun Buccaneer",
    "Hotdog Hercules",
    "The Frankfurter Fiend",
    "Chili Dog Demon",
    "The Sauce Samurai",
    "Glizzy Vuitton",
    "The Wiener Whisperer",
    "Bun Affleck",
    "Glizzy Godspeed",
    "Extra Long Porker",
    "Snork Tube",
    "Bun DMC",
    "Meat Missile",
    "Grease Missle",
    "Glizzler",
    "Shaboinglar",
    "Street Leg",
    "The Hotdog Honcho",
    "Glizzinator 3000",
    "The Meat Saber",
    "Shaboingboing",
    "Glizzy Gandalf",
    "Glizzy Goliath",
    "The Sodium Rocket",
    "Casing Cowboy",
    "The Glizzord",
    "Glizzy Guerilla",
    "The Tube Titan",
    "Glizzy Gangster",
    "The Nitrite Knight",
    "Pork Cylinder",
    "The Glizzy Guru",
    "Chili Dog Commander",
    "Skin Whistle",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shuffle(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

function makeNickname(pool, index) {
    const base = pool[index % pool.length];
    const round = Math.floor(index / pool.length);

    const nickname = round > 0
        ? `${base} ${round + 1}`
        : base;

    return nickname.slice(0, 32);
}

function getRandomGlizzyName() {
    const pool = shuffle(GLIZZY_NICKNAMES);
    return makeNickname(pool, 0);
}

const data = new SlashCommandBuilder()
    .setName("glizzify")
    .setDescription("Randomly nickname server members with Glizzy-themed names.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addStringOption(option =>
        option
            .setName("mode")
            .setDescription("Preview or apply the Glizzy nicknames.")
            .setRequired(true)
            .addChoices(
                { name: "Preview only", value: "preview" },
                { name: "Apply to server", value: "apply" }
            )
    )
    .addBooleanOption(option =>
        option
            .setName("include_bots")
            .setDescription("Also rename bots? Default: false")
            .setRequired(false)
    );

async function handleGlizzifyCommand(interaction) {
    if (!interaction.guild) {
        return interaction.reply({
            content: "This command can only be used inside a server.",
            ephemeral: true
        });
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageNicknames)) {
        return interaction.reply({
            content: "You need the **Manage Nicknames** permission to use this command.",
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    const mode = interaction.options.getString("mode");
    const includeBots = interaction.options.getBoolean("include_bots") ?? false;

    const botMember = await interaction.guild.members.fetchMe();

    if (!botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        return interaction.editReply(
            "I need the **Manage Nicknames** permission before I can do this."
        );
    }

    const members = await interaction.guild.members.fetch();

    const targets = members.filter(member => {
        if (member.id === interaction.guild.ownerId) return false;
        if (member.id === botMember.id) return false;
        if (member.user.bot && !includeBots) return false;
        if (!member.manageable) return false;

        return true;
    });

    const skipped = members.size - targets.size;
    const nicknamePool = shuffle(GLIZZY_NICKNAMES);

    if (mode === "preview") {
        const preview = [...targets.values()]
            .slice(0, 20)
            .map((member, index) => {
                const oldName = member.displayName;
                const newName = makeNickname(nicknamePool, index);
                return `**${oldName}** → ${newName}`;
            });

        return interaction.editReply(
            [
                `Glizzify preview ready.`,
                ``,
                `Members that can be renamed: **${targets.size}**`,
                `Skipped members: **${skipped}**`,
                ``,
                preview.length ? preview.join("\n") : "No manageable members found.",
                ``,
                `Run \`/glizzify mode:Apply to server\` when ready.`
            ].join("\n")
        );
    }

    let changed = 0;
    let failed = 0;
    let index = 0;

    await interaction.editReply(
        `Starting Glizzify...\nManageable members: **${targets.size}**\nThis may take a while.`
    );

    for (const member of targets.values()) {
        const nickname = makeNickname(nicknamePool, index);
        index++;

        try {
            await member.setNickname(
                nickname,
                `Glizzanator random nickname command used by ${interaction.user.tag}`
            );

            changed++;
        } catch (error) {
            failed++;
            console.log(`Failed to nickname ${member.user.tag}:`, error.message);
        }

        if ((changed + failed) % 10 === 0) {
            await interaction.editReply(
                `Glizzify running...\nChanged: **${changed}**\nFailed: **${failed}**\nSkipped: **${skipped}**`
            ).catch(() => null);
        }

        await sleep(1250);
    }

    return interaction.editReply(
        `Glizzify complete.\nChanged: **${changed}**\nFailed: **${failed}**\nSkipped: **${skipped}**`
    );
}

module.exports = {
    data,
    handleGlizzifyCommand,
    GLIZZY_NICKNAMES,
    getRandomGlizzyName,
};