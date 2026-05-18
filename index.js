const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

let config = { antiLink: true, antiSpam: true, antiRaid: true };
const spamMap = new Map();

const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Painel de segurança'),
    new SlashCommandBuilder().setName('ban').setDescription('Banir').addUserOption(o => o.setName('alvo').setRequired(true)),
    new SlashCommandBuilder().setName('kick').setDescription('Expulsar').addUserOption(o => o.setName('alvo').setRequired(true)),
    new SlashCommandBuilder().setName('lockdown').setDescription('Bloquear chat'),
    new SlashCommandBuilder().setName('unlockdown').setDescription('Desbloquear chat')
];

client.once('ready', async () => {
    console.log(`Logado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('Comandos registrados!');
});

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) return;

    if (i.commandName === 'setup') {
        const embed = new EmbedBuilder().setTitle('🛡️ Painel').setDescription(`Link:${config.antiLink} Spam:${config.antiSpam} Raid:${config.antiRaid}`);
        const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('menu').addOptions([
            { label: 'Anti-Link', value: 'link' }, { label: 'Anti-Spam', value: 'spam' }, { label: 'Anti-Raid', value: 'raid' }
        ]));
        await i.reply({ embeds: [embed], components: [menu], ephemeral: true });
    }
    
    if (i.commandName === 'ban') { await i.guild.members.ban(i.options.getUser('alvo')); await i.reply('Banido!'); }
    if (i.commandName === 'kick') { await i.guild.members.kick(i.options.getUser('alvo')); await i.reply('Expulso!'); }
    if (i.commandName === 'lockdown') { await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: false }); await i.reply('Bloqueado.'); }
    if (i.commandName === 'unlockdown') { await i.channel.permissionOverwrites.edit(i.guild.id, { SendMessages: true }); await i.reply('Desbloqueado.'); }
});

client.on('interactionCreate', async (i) => {
    if (!i.isStringSelectMenu()) return;
    const val = i.values[0];
    if (val === 'link') config.antiLink = !config.antiLink;
    if (val === 'spam') config.antiSpam = !config.antiSpam;
    if (val === 'raid') config.antiRaid = !config.antiRaid;
    await i.update({ content: 'Configuração atualizada!' });
});

client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.guild) return;
    if (config.antiLink && (m.content.includes('http') || m.content.includes('discord.gg'))) await m.delete().catch(()=>{});
});

client.login(process.env.DISCORD_TOKEN);
