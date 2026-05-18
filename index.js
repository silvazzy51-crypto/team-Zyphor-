const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Verifica se o bot responde')
];

client.once('ready', async () => {
    console.log('Bot Online!');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    
    // Tenta responder de qualquer jeito
    try {
        if (i.commandName === 'ping') {
            await i.reply({ content: 'Pong! Estou funcionando perfeitamente.', ephemeral: false });
        }
    } catch (err) {
        console.error('Erro ao responder:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
