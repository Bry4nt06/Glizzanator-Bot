const { AttachmentBuilder, ChannelType } = require("discord.js");
const { createWelcomeCard } = require("../cards/welcomeCard");
const { getRandomGlizzyName } = require("../commands/utility/glizzifyCommand");

function findFallbackWelcomeChannel(guild) {
    return guild.channels.cache.find(channel => {
        if (channel.type !== ChannelType.GuildText) return false;

        const name = channel.name.toLowerCase();
        return ["welcome", "Welcome", "lobby"].includes(name);
    });
}

function registerGuildMemberAddEvent(client) {
    client.on("guildMemberAdd", async (member) => {
        try {
            const glizzyName = getRandomGlizzyName();

            if (process.env.ENABLE_WELCOME_NICKNAME === "true") {
                await member.setNickname(
                    glizzyName,
                    "New member was glizzified on join"
                ).catch((error) => {
                    console.log(`Could not nickname ${member.user.tag}: ${error.message}`);
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
                member.guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID) ||
                findFallbackWelcomeChannel(member.guild);

            if (!channel) {
                console.log("No welcome channel found. Set WELCOME_CHANNEL_ID in .env.");
                return;
            }

            await channel.send({
                content: `🌭 Welcome ${member} — you have been glizzified as **${glizzyName}**!`,
                files: [attachment]
            });
        } catch (error) {
            console.error("guildMemberAdd welcome card error:", error);
        }
    });
}

module.exports = registerGuildMemberAddEvent;
