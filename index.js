const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

let configServidor = { antiLink: true, antiSpam: true, antiRaid: true };
const spamMap = new Map();

const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Painel de segurança').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder().setName('ban').setDescription('Bane um usuário').addUserOption(o => o.setName('alvo').setRequired(true).setDescription('Usuário')).setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
    new SlashCommandBuilder().setName('kick').setDescription('Expulsa um usuário').addUserOption(o => o.setName('alvo').setRequired(true).setDescription('Usuário')).setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
    new SlashCommandBuilder().setName('lockdown').setDescription('Bloqueia chat').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
    new SlashCommandBuilder().setName('unlockdown').setDescription('Desbloqueia chat').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
].map(c => c.toJSON());

client.once('ready', async () => {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
    console.log('✅ Bot online e comandos registrados!');
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup') {
            const embed = new EmbedBuilder().setTitle('🛡️ Painel de Segurança').setColor('#2b2d31')
                .setDescription(`🔗 Anti-Link: ${configServidor.antiLink ? '🟢 ATIVO' : '🔴 DESATIVADO'}\n⚠️ Anti-Spam: ${configServidor.antiSpam ? '🟢 ATIVO' : '🔴 DESATIVADO'}\n🔨 Anti-Raid: ${configServidor.antiRaid ? '🟢 ATIVO' : '🔴 DESATIVADO'}`);
            const menu = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId('menu_setup').addOptions([
                { label: 'Alternar Anti-Link', value: 'link' }, { label: 'Alternar Anti-Spam', value: 'spam' }, { label: 'Alternar Anti-Raid', value: 'raid' }
            ]));
            await interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });
        }
        else if (interaction.commandName === 'ban') { await interaction.guild.members.ban(interaction.options.getUser('alvo')); await interaction.reply('🔨 Usuário banido.'); }
        else if (interaction.commandName === 'kick') { await interaction.guild.members.kick(interaction.options.getUser('alvo')); await interaction.reply('👢 Usuário expulso.'); }
        else if (interaction.commandName === 'lockdown') { await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false }); await interaction.reply('🔒 Chat bloqueado.'); }
        else if (interaction.commandName === 'unlockdown') { await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true }); await interaction.reply('🔓 Chat desbloqueado.'); }
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_setup') {
        const val = interaction.values[0];
        if (val === 'link') configServidor.antiLink = !configServidor.antiLink;
        if (val === 'spam') configServidor.antiSpam = !configServidor.antiSpam;
        if (val === 'raid') configServidor.antiRaid = !configServidor.antiRaid;
        await interaction.update({ content: `✅ Configuração atualizada!`, components: [] });
    }
});

client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.guild) return;

    // --- ANTI-LINK ---
    if (configServidor.antiLink && (m.content.includes('http') || m.content.includes('discord.gg'))) {
        await m.delete().catch(() => {});
        return;
    }

    // --- ANTI-SPAM ---
    if (configServidor.antiSpam && !m.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const user = m.author.id;
        const agora = Date.now();
        const info = spamMap.get(user) || { count: 0, last: agora };
        
        if (agora - info.last < 3000) info.count++; else info.count = 1;
        info.last = agora;
        spamMap.set(user, info);

        if (info.count > 3) {
            await m.member.timeout(60000, 'Spam detectado').catch(() => {});
            spamMap.delete(user);
        }
    }
});

client.on('guildMemberAdd', async (m) => {
    if (configServidor.antiRaid && (Date.now() - m.user.createdAt) / (1000 * 60 * 60 * 24) < 2) {
        await m.kick('Anti-Raid: Conta muito nova').catch(() => {});
    }
});

client.login(process.env.DISCORD_TOKEN);
