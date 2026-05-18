const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde Pong!'),
    new SlashCommandBuilder().setName('setupmod').setDescription('Configura o sistema de segurança'),
    new SlashCommandBuilder().setName('banmod').setDescription('Bane um usuário').addUserOption(o => o.setName('usuario').setDescription('O usuário').setRequired(true)),
    new SlashCommandBuilder().setName('kickmod').setDescription('Expulsa um usuário').addUserOption(o => o.setName('usuario').setDescription('O usuário').setRequired(true))
];

client.once('ready', async () => {
    console.log('Sincronizando comandos...');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    // Deleta comandos globais antigos que estão poluindo seu servidor
    await rest.put(Routes.applicationCommands('1504950960777068584'), { body: [] });
    
    // Registra os novos comandos apenas no seu servidor
    await rest.put(Routes.applicationGuildCommands('1504950960777068584', '1501445052168278016'), { body: commands });
    
    console.log('✅ Sincronização forçada concluída!');
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'ping') await i.reply('Pong! 🏓');
    if (i.commandName === 'setupmod') await i.reply('Sistema configurado!');
    if (i.commandName === 'banmod') await i.reply('Usuário banido!');
    if (i.commandName === 'kickmod') await i.reply('Usuário expulso!');
});

client.login(process.env.DISCORD_TOKEN);
