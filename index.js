const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] 
});

const configServidor = { antiLink: false, antiSpam: false, antiRaid: false };
const msgDoUsuario = new Map();

// --- REGISTRO DO COMANDO /SETUP ---
const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Abre o painel de segurança do servidor')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
].map(command => command.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comando /setup registrado com sucesso!');
    } catch (error) { console.error(error); }
    console.log(`📱 Bot online como ${client.user.tag}!`);
});

// --- PAINEL INTERATIVO ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Painel de Segurança')
            .setDescription(`🔗 Anti-Link: ${configServidor.antiLink ? '🟢 ON' : '🔴 OFF'}\n⚠️ Anti-Spam: ${configServidor.antiSpam ? '🟢 ON' : '🔴 OFF'}\n🔨 Anti-Raid: ${configServidor.antiRaid ? '🟢 ON' : '🔴 OFF'}`)
            .setColor('#2b2d31');

        const menu = new StringSelectMenuBuilder()
            .setCustomId('menu_setup')
            .addOptions([
                { label: 'Alternar Anti-Link', value: 'link' },
                { label: 'Alternar Anti-Spam', value: 'spam' },
                { label: 'Alternar Anti-Raid', value: 'raid' }
            ]);

        await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(menu)], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_setup') {
        const val = interaction.values[0];
        if (val === 'link') configServidor.antiLink = !configServidor.antiLink;
        if (val === 'spam') configServidor.antiSpam = !configServidor.antiSpam;
        if (val === 'raid') configServidor.antiRaid = !configServidor.antiRaid;
        
        await interaction.update({ content: '✅ Configuração atualizada!', components: [] });
    }
});

// --- SISTEMAS DE PROTEÇÃO (Mantidos iguais) ---
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild || message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    if (configServidor.antiLink && (message.content.includes('discord.gg/') || message.content.includes('http'))) {
        await message.delete().catch(() => {});
    }
});

client.on('guildMemberAdd', async (member) => {
    if (configServidor.antiRaid && (Date.now() - member.user.createdAt) / (1000 * 60 * 60 * 24) < 2) {
        await member.kick('Conta muito nova (Anti-Raid)').catch(() => {});
    }
});

client.login(process.env.DISCORD_TOKEN);
