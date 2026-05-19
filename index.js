const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

const serverConfig = {
    antilink: false,
    antiraid: false,
    antispam: false,
    modoSilencioso: false,
    adminRoles: []
};

const mapaSpam = new Map();

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde Pong!'),
    new SlashCommandBuilder().setName('setup').setDescription('Adiciona/remove cargo admin do bot')
        .addRoleOption(o => o.setName('cargo').setDescription('O cargo a ser configurado').setRequired(true)),
    new SlashCommandBuilder().setName('embed').setDescription('Cria uma mensagem embed')
        .addStringOption(o => o.setName('titulo').setDescription('Título').setRequired(true))
        .addStringOption(o => o.setName('descricao').setDescription('Descrição').setRequired(true))
        .addStringOption(o => o.setName('foto').setDescription('Link da imagem').setRequired(false)),
    new SlashCommandBuilder().setName('painel').setDescription('Abre painel de segurança'),
    new SlashCommandBuilder().setName('stop').setDescription('Ativa modo silencioso'),
    new SlashCommandBuilder().setName('start').setDescription('Desativa modo silencioso'),
    new SlashCommandBuilder().setName('banmod').setDescription('Bane um usuário')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true)),
    new SlashCommandBuilder().setName('kickmod').setDescription('Expulsa um usuário')
        .addUserOption(o => o.setName('usuario').setDescription('Usuário').setRequired(true))
];

client.once('ready', async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        // Registra os comandos globalmente para todos os servidores
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comandos GLOBAIS sincronizados com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao sincronizar:', error);
    }
});

function temPermissao(member) {
    if (!member) return false;
    if (member.id === member.guild.ownerId) return true;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    if (serverConfig.adminRoles.some(roleId => member.roles.cache.has(roleId))) return true;
    return false;
}

function gerarPainel() {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Painel de Segurança')
        .setColor('#2f3136')
        .addFields(
            { name: '🔗 Anti-Link', value: serverConfig.antilink ? '🟢 ON' : '🔴 OFF', inline: true },
            { name: '🚨 Anti-Raid', value: serverConfig.antiraid ? '🟢 ON' : '🔴 OFF', inline: true },
            { name: '💬 Anti-Spam', value: serverConfig.antispam ? '🟢 ON' : '🔴 OFF', inline: true }
        );

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle_link').setLabel('Anti-Link').setStyle(serverConfig.antilink ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('toggle_raid').setLabel('Anti-Raid').setStyle(serverConfig.antiraid ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('toggle_spam').setLabel('Anti-Spam').setStyle(serverConfig.antispam ? ButtonStyle.Danger : ButtonStyle.Success)
    );
    return { embeds: [embed], components: [row] };
}

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ping') return await i.reply('Pong! 🏓');
        if (!temPermissao(i.member)) return await i.reply({ content: '❌ Sem permissão.', ephemeral: true });
        await i.deferReply().catch(() => {});

        if (i.commandName === 'setup') {
            const cargo = i.options.getRole('cargo');
            if (serverConfig.adminRoles.includes(cargo.id)) {
                serverConfig.adminRoles = serverConfig.adminRoles.filter(id => id !== cargo.id);
                return await i.editReply(`❌ Removido: ${cargo.name}`);
            } else {
                serverConfig.adminRoles.push(cargo.id);
                return await i.editReply(`✅ Adicionado: ${cargo.name}`);
            }
        }
        
        if (i.commandName === 'embed') {
            const embed = new EmbedBuilder().setTitle(i.options.getString('titulo')).setDescription(i.options.getString('descricao')).setColor('Blue');
            if (i.options.getString('foto')) embed.setImage(i.options.getString('foto'));
            return await i.editReply({ embeds: [embed] });
        }
        
        if (i.commandName === 'painel') return await i.editReply(gerarPainel());
        if (i.commandName === 'stop') { serverConfig.modoSilencioso = true; return await i.editReply('🚫 Modo Silencioso ATIVADO.'); }
        if (i.commandName === 'start') { serverConfig.modoSilencioso = false; return await i.editReply('✅ Modo Silencioso DESATIVADO.'); }
        
        if (i.commandName === 'banmod') { const user = i.options.getUser('usuario'); try { await i.guild.members.ban(user); await i.editReply(`✅ ${user.tag} banido.`); } catch { await i.editReply('❌ Erro.'); } }
        if (i.commandName === 'kickmod') { const user = i.options.getUser('usuario'); try { await i.guild.members.kick(user); await i.editReply(`✅ ${user.tag} expulso.`); } catch { await i.editReply('❌ Erro.'); } }
    }

    if (i.isButton()) {
        if (!temPermissao(i.member)) return i.reply({ content: '❌ Sem permissão.', ephemeral: true });
        if (i.customId === 'toggle_link') serverConfig.antilink = !serverConfig.antilink;
        if (i.customId === 'toggle_raid') serverConfig.antiraid = !serverConfig.antiraid;
        if (i.customId === 'toggle_spam') serverConfig.antispam = !serverConfig.antispam;
        await i.update(gerarPainel());
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild || temPermissao(message.member)) return;
    if (serverConfig.modoSilencioso) { try { await message.delete(); } catch {} return; }

    if (serverConfig.antilink && /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi.test(message.content)) {
        try { await message.delete(); const msg = await message.channel.send(`⚠️ ${message.author}, links proibidos.`); setTimeout(() => msg.delete().catch(() => {}), 3000); } catch {}
    }

    if (serverConfig.antispam) {
        const h = mapaSpam.get(message.author.id) || [];
        h.push(Date.now());
        const validos = h.filter(t => Date.now() - t < 3000);
        mapaSpam.set(message.author.id, validos);
        if (validos.length > 4) {
            try { await message.delete(); await message.member.timeout(60000); } catch {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
