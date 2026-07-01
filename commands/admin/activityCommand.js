const { PermissionFlagsBits } = require("discord.js");
const {
    hoursToSeconds,
    secondsToHours,
    getTotals,
    changeManualSeconds,
    setDisplayedTotalHours,
    resetManualAdjustments,
    getHistory
} = require("../../services/activityService");

function requireAdmin(interaction) {
    return interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
        interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}

function formatSignedHours(seconds) {
    const hours = secondsToHours(seconds);
    return hours >= 0 ? `+${hours}` : `${hours}`;
}

function buildEntry(interaction, member, activityType, reason) {
    return {
        guildId: interaction.guild.id,
        userId: member.id,
        username: member.displayName || member.user.username,
        activityType,
        reason: reason || "Manual activity adjustment",
        createdById: interaction.user.id,
        createdByUsername: interaction.user.tag
    };
}

function getTargetMember(interaction) {
    return interaction.options.getMember("member") || null;
}

function getReason(interaction) {
    return interaction.options.getString("reason") || "Manual activity adjustment";
}

async function replyTotals(interaction, member, messagePrefix = "") {
    const totals = await getTotals(interaction.client.glizzanatorDb, interaction.guild.id, member.id);

    return interaction.editReply([
        messagePrefix,
        messagePrefix ? "" : null,
        `**${member.displayName || member.user.username}** activity totals`,
        `Voice tracked: **${totals.voice.trackedHours} hrs**`,
        `Voice manual: **${formatSignedHours(totals.voice.manualSeconds)} hrs**`,
        `Voice displayed total: **${totals.voice.totalHours} hrs**`,
        "",
        `Stream tracked: **${totals.stream.trackedHours} hrs**`,
        `Stream manual: **${formatSignedHours(totals.stream.manualSeconds)} hrs**`,
        `Stream displayed total: **${totals.stream.totalHours} hrs**`
    ].filter(Boolean).join("\n"));
}

async function handleAddOrRemove(interaction, activityType, direction) {
    const db = interaction.client.glizzanatorDb;
    const member = getTargetMember(interaction);
    const hours = interaction.options.getNumber("hours", true);
    const reason = getReason(interaction);

    if (!member) {
        return interaction.editReply("I could not find that member in this server.");
    }

    const deltaSeconds = hoursToSeconds(hours) * direction;

    await changeManualSeconds(
        db,
        buildEntry(interaction, member, activityType, reason),
        deltaSeconds
    );

    const activityLabel = activityType === "voice" ? "voice" : "stream";
    const actionLabel = direction > 0 ? "Added" : "Removed";

    return replyTotals(
        interaction,
        member,
        `${actionLabel} **${hours} ${activityLabel} hrs** ${direction > 0 ? "to" : "from"} ${member}.`
    );
}

async function handleSet(interaction, activityType) {
    const db = interaction.client.glizzanatorDb;
    const member = getTargetMember(interaction);
    const hours = interaction.options.getNumber("hours", true);
    const reason = getReason(interaction);

    if (!member) {
        return interaction.editReply("I could not find that member in this server.");
    }

    await setDisplayedTotalHours(
        db,
        buildEntry(interaction, member, activityType, reason),
        hours
    );

    return replyTotals(
        interaction,
        member,
        `Set ${member}'s displayed ${activityType} total to **${hours} hrs**.`
    );
}

async function handleReset(interaction) {
    const db = interaction.client.glizzanatorDb;
    const member = getTargetMember(interaction);
    const activityType = interaction.options.getString("type", true);
    const reason = getReason(interaction);

    if (!member) {
        return interaction.editReply("I could not find that member in this server.");
    }

    await resetManualAdjustments(
        db,
        buildEntry(interaction, member, activityType, reason)
    );

    return replyTotals(
        interaction,
        member,
        `Reset ${member}'s manual ${activityType} adjustment to **0 hrs**.`
    );
}

async function handleView(interaction) {
    const member = getTargetMember(interaction);

    if (!member) {
        return interaction.editReply("I could not find that member in this server.");
    }

    return replyTotals(interaction, member);
}

async function handleHistory(interaction) {
    const db = interaction.client.glizzanatorDb;
    const member = getTargetMember(interaction);

    if (!member) {
        return interaction.editReply("I could not find that member in this server.");
    }

    const rows = await getHistory(db, interaction.guild.id, member.id, 10);

    if (!rows.length) {
        return interaction.editReply(`No manual activity adjustment history found for ${member}.`);
    }

    const lines = rows.map((row) => {
        const when = new Date(row.created_at).toLocaleString();
        return [
            `**${when}**`,
            `${row.action} ${row.activity_type}: **${formatSignedHours(row.delta_seconds)} hrs**`,
            `By: ${row.created_by_username || row.created_by_id || "Unknown"}`,
            row.reason ? `Reason: ${row.reason}` : null
        ].filter(Boolean).join("\n");
    });

    return interaction.editReply([
        `Recent activity adjustment history for **${member.displayName || member.user.username}**:`,
        "",
        lines.join("\n\n")
    ].join("\n"));
}

const SUBCOMMAND_HANDLERS = {
    addvoice: (interaction) => handleAddOrRemove(interaction, "voice", 1),
    removevoice: (interaction) => handleAddOrRemove(interaction, "voice", -1),
    addstream: (interaction) => handleAddOrRemove(interaction, "stream", 1),
    removestream: (interaction) => handleAddOrRemove(interaction, "stream", -1),
    setvoice: (interaction) => handleSet(interaction, "voice"),
    setstream: (interaction) => handleSet(interaction, "stream"),
    reset: handleReset,
    view: handleView,
    history: handleHistory
};

async function handleActivityCommand(interaction) {
    if (!interaction.guild) {
        return interaction.reply({
            content: "This command can only be used inside a server.",
            ephemeral: true
        });
    }

    if (!requireAdmin(interaction)) {
        return interaction.reply({
            content: "You need **Manage Server** or **Administrator** to use activity admin commands.",
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const handler = SUBCOMMAND_HANDLERS[subcommand];

    if (!handler) {
        return interaction.editReply("Unknown activity subcommand.");
    }

    return handler(interaction);
}

module.exports = {
    handleActivityCommand
};
