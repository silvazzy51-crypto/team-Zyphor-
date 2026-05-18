const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Aqui você pode adicionar outros comandos depois
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde Pong!')
];

client.once('ready', async () => {
    console.log(`Logado como ${client.user.tag}`);
    
    // REGISTRO LIMPO: Isso força o Discord a atualizar a lista e remover comandos fantasmas
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationGuildCommands('1504950960777068584', '1501445052168278016'), { body: commands });
    
    console.log('✅ Comando atualizado! Comandos antigos foram removidos.');
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName === 'ping') {
        await i.reply('Pong! 🏓');
    }
});

client.login(process.env.DISCORD_TOKEN);
