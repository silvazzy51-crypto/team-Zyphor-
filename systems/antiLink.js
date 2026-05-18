module.exports = (client) => {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const links = ["http://", "https://", "discord.gg"];

    if (links.some(l => message.content.includes(l))) {
      try {
        await message.delete();
        message.channel.send(`🚫 ${message.author}, links não são permitidos!`);
      } catch {}
    }
  });
};
