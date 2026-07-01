const { AttachmentBuilder, ChannelType } = require("discord.js");
const { createWelcomeCard } = require("../cards/welcomeCard");
const { getRandomGlizzyName } = require("../commands/utility/glizzifyCommand");
const { config } = require("../config");
const logger = require("../utils/logger");

function findFallbackWelcomeChannel(guild) {
    return guild.channels.cache.find((channel) => {
        if (channel.type !== ChannelType.GuildText) return false;

        const name = channel.name.toLowerCase();
        return ["welcome", "lobby"].includes(name);
    });
}

function registerGuildMemberAddEvent(client) {
    client.on("guildMemberAdd", async (member) => {
        try {
            const glizzyName = getRandomGlizzyName();

            if (config.features.welcomeNickname) {
                await member.setNickname(
                    glizzyName,
                    "New member was glizzified on join"
                ).catch((error) => {
                    logger.warn(`Could not nickname ${member.user.tag}`, { error: error.message });
                });
            }

            const imageBuffer = await createWelcomeCard({
                member,
                glizzyName
            });

            const attachment = new AttachmentBuilder(imageBuffer, {
                name: "welcome-glizzified.png"
            });

            const channel =
                member.guild.channels.cache.get(config.channels.welcome) ||
                findFallbackWelcomeChannel(member.guild);

            if (!channel) {
                logger.warn("No welcome channel found. Set WELCOME_CHANNEL_ID in .env.");
                return;
            }

            await channel.send({
                content: `🌭 Welcome ${member} — you have been glizzified as **${glizzyName}**!`,
                files: [attachment]
            });
        } catch (error) {
            logger.error("guildMemberAdd welcome card error", error);
        }
    });
}

module.exports = registerGuildMemberAddEvent;
