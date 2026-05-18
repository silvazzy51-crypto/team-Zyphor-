const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Testar bot"),

  async execute(interaction) {
    await interaction.reply("✅ Bot funcionando!");
  }
};
