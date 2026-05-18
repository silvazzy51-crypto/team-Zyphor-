const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configurar sistema"),

  async execute(interaction) {
    await interaction.reply("✅ Setup funcionando!");
  }
};
