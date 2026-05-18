const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Verifica se o bot responde')
];

// IDs configurados
const CLIENT_ID = '1504950960777068584';
const GUILD_ID = '1501445052168278016';

client.once('ready', async () => {
    console.log('Bot Online! Tentando registrar comando...');
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        
        console.log('✅ COMANDO /ping REGISTRADO COM SUCESSO!');
    } catch (error) {
        console.error('Erro no registro:', error);
    }
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;
    if (i.commandName === 'ping') {
        await i.reply({ content: 'Pong! Finalmente funcionou!', ephemeral: false });
    }
});

client.login(process.env.DISCORD_TOKEN);
