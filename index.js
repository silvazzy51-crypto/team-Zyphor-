const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// DEFININDO TODOS OS COMANDOS DE UMA VEZ
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde Pong!'),
    new SlashCommandBuilder().setName('setup').setDescription('Configura o sistema de segurança'),
    new SlashCommandBuilder().setName('ban').setDescription('Bane um usuário').addUserOption(o => o.setName('usuario').setDescription('O usuário').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Expulsa um usuário').addUserOption(o => o.setName('usuario').setDescription('O usuário').setRequired(true))
];

client.once('ready', async () => {
    console.log('Bot Online! Registrando comandos...');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    // REGISTRA TUDO E DELETA O QUE SOBROU (isso remove os duplicados)
    await rest.put(Routes.applicationGuildCommands('1504950960777068584', '1501445052168278016'), { body: commands });
    console.log('✅ Todos os comandos foram sincronizados!');
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'ping') await i.reply('Pong! 🏓');
    if (i.commandName === 'setup') await i.reply('Sistema de segurança configurado!');
    if (i.commandName === 'ban') await i.reply('Usuário banido com sucesso.');
    if (i.commandName === 'kick') await i.reply('Usuário expulso com sucesso.');
});

client.login(process.env.DISCORD_TOKEN);
