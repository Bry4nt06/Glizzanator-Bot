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

function shuffle(array) {
    const copy = [...array];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

function makeNickname(pool, index = 0) {
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

function canManageMember(member, botMember) {
    if (!member) return false;
    if (!botMember) return false;
    if (member.id === member.guild.ownerId) return false;
    if (member.id === botMember.id) return false;
    if (!member.manageable) return false;

    return true;
}

const data = new SlashCommandBuilder()
    .setName("glizzify")
    .setDescription("Give one server member a random Glizzy-themed nickname.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(option =>
        option
            .setName("member")
            .setDescription("The member to glizzify.")
            .setRequired(true)
    )
    .addBooleanOption(option =>
        option
            .setName("preview")
            .setDescription("Preview the nickname without applying it. Default: false")
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

    const targetUser = interaction.options.getUser("member", true);
    const previewOnly = interaction.options.getBoolean("preview") ?? false;
    const botMember = await interaction.guild.members.fetchMe();
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) {
        return interaction.editReply(
            "I need the **Manage Nicknames** permission before I can do this."
        );
    }

    if (!targetMember) {
        return interaction.editReply("I could not find that member in this server.");
    }

    if (targetMember.user.bot) {
        return interaction.editReply("I will not glizzify bots with this command.");
    }

    if (!canManageMember(targetMember, botMember)) {
        return interaction.editReply(
            "I cannot nickname that member. They may be the server owner, me, or have a role higher than/equal to mine."
        );
    }

    const nickname = getRandomGlizzyName();
    const oldName = targetMember.displayName;

    if (previewOnly) {
        return interaction.editReply(
            `Preview: **${oldName}** would become **${nickname}**.`
        );
    }

    try {
        await targetMember.setNickname(
            nickname,
            `Glizzanator random nickname command used by ${interaction.user.tag}`
        );

        return interaction.editReply(
            `Glizzified **${oldName}** into **${nickname}**.`
        );
    } catch (error) {
        console.error(`Failed to nickname ${targetMember.user.tag}:`, error);

        return interaction.editReply(
            "I tried to glizzify that member, but Discord rejected the nickname change. Check my role position and permissions."
        );
    }
}

module.exports = {
    data,
    handleGlizzifyCommand,
    GLIZZY_NICKNAMES,
    getRandomGlizzyName,
};
