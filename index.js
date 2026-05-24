// =================================================================
// ZYPHOR SECURITYZ - VERSÃO INTEGRAL BLINDADA (ANTI-RAID FORCE)
// =================================================================

const { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, 
    PermissionsBitField, ChannelType 
} = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences
    ] 
});

// ID DO DESENVOLVEDOR SUPREMO (VOCÊ)
const DEV_ID = '1460149186577174680';

// LINK DO SEU SERVIDOR DE SUPORTE OFICIAL
const LINK_SERVIDOR_SUPORTE = 'https://discord.gg/nRyjV5BG9'; 

const serverConfig = {
    antilink: false,
    antiraid: false,
    antispam: false,
    logChannelId: null,
    globalAlertChannelId: null, 
    adminRoles: [], 
    palavrasBloqueadas: ['hack', 'trava', 'maldito', 'fdp', 'macaco', 'org']
};

const TERMOS_PROIBIDOS_PERFIL = ['orglideranca', 'lideranca', 'apostas', 'ap gratis', 'vagas adm', 'vem farmar'];

// DEFINIÇÃO DOS COMANDOS
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Verifica a latencia do bot'),
    new SlashCommandBuilder().setName('painel').setDescription('Abre o painel de controle de seguranca'),
    new SlashCommandBuilder().setName('suporte').setDescription('Envia o link oficial do servidor de suporte do bot'),
    new SlashCommandBuilder().setName('setup').setDescription('Configura ate 3 cargos administrativos para gerenciar o bot')
        .addRoleOption(o => o.setName('cargo1').setDescription('Primeiro cargo admin').setRequired(true))
        .addRoleOption(o => o.setName('cargo2').setDescription('Segundo cargo admin').setRequired(false))
        .addRoleOption(o => o.setName('cargo3').setDescription('Terceiro cargo admin').setRequired(false)),
    new SlashCommandBuilder().setName('setlogs').setDescription('Define o canal de logs local deste servidor')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de texto').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Limpa mensagens do chat')
        .addIntegerOption(o => o.setName('quantidade').setDescription('Numero de 1 a 100').setRequired(true)),
    new SlashCommandBuilder().setName('addpalavra').setDescription('Adiciona palavras ao filtro (separe por virgula)')
        .addStringOption(o => o.setName('palavra').setDescription('Palavras separadas por virgula').setRequired(true)),
    new SlashCommandBuilder().setName('lockchannel').setDescription('Tranca o canal atual'),
    new SlashCommandBuilder().setName('unlockchannel').setDescription('Destranca o canal atual'),
    new SlashCommandBuilder().setName('dev').setDescription('[DEV ONLY] Console geral de servidores, links e dados'),
    new SlashCommandBuilder().setName('global').setDescription('[DEV ONLY] Define o canal de monitoramento')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de alertas').setRequired(true))
];

client.once('ready', async () => {
    console.log(`✅ Zyphor V3 Conectado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comandos globais sincronizados com o Discord!');
    } catch (error) { console.error(error); }
});

function temPermissao(member) {
    if (!member) return false;
    if (member.id === DEV_ID) return true;
    if (member.id === member.guild.ownerId) return true;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    if (serverConfig.adminRoles.some(roleId => member.roles.cache.has(roleId))) return true;
    return false;
}

async function enviarAlertaGlobal(embed) {
    if (!serverConfig.globalAlertChannelId) return;
    try {
        const canal = await client.channels.fetch(serverConfig.globalAlertChannelId);
        if (canal) await canal.send({ embeds: [embed] });
    } catch {}
}

function gerarPainelSeguranca() {
    const statusLink = serverConfig.antilink ? '🟩 **ATIVADO**' : '🟥 **DESATIVADO**';
    const statusRaid = serverConfig.antiraid ? '🟩 **ATIVADO**' : '🟥 **DESATIVADO**';
    const statusSpam = serverConfig.antispam ? '🟩 **ATIVADO**' : '🟥 **DESATIVADO**';

    const embed = new EmbedBuilder()
        .setTitle('🛡️ Centro de Controle — Zyphor Security')
        .setDescription('Gerencie as camadas de proteção ativa do servidor utilizando os botões abaixo.')
        .setColor('#5865F2')
        .addFields(
            { name: '🔗 Sistema Anti-Link', value: statusLink, inline: true },
            { name: '🚨 Filtro Anti-Raid', value: statusRaid, inline: true },
            { name: '🤫 Proteção Anti-Spam', value: statusSpam, inline: true }
        )
        .setFooter({ text: 'Proteção em tempo real ativa.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tg_link').setLabel('Anti-Link').setStyle(serverConfig.antilink ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tg_raid').setLabel('Anti-Raid').setStyle(serverConfig.antiraid ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tg_spam').setLabel('Anti-Spam').setStyle(serverConfig.antispam ? ButtonStyle.Danger : ButtonStyle.Success)
    );
    return { embeds: [embed], components: [row] };
}

// FUNÇÃO CENTRALIZADA DE VERIFICAÇÃO E BANIMENTO
async function verificarEBanirMembro(member, localOrigem) {
    const username = (member.user.username || "").toLowerCase();
    const displayName = (member.user.displayName || "").toLowerCase();
    
    let statusTexto = "";
    // Força a busca detalhada da presença se ela existir no servidor
    const presence = member.guild.presences.cache.get(member.id) || member.presence;
    if (presence && presence.activities) {
        const activity = presence.activities.find(a => a.type === 4);
        if (activity && activity.state) {
            statusTexto = activity.state.toLowerCase();
        }
    }

    const textoCompleto = `${username} | ${displayName} | ${statusTexto}`;
    const detectado = TERMOS_PROIBIDOS_PERFIL.some(termo => textoCompleto.includes(termo));

    if (detectado) {
        try {
            if (!member.bannable) return;
            await member.ban({ reason: `🚨 Anti-Raid Automático (${localOrigem}): Perfil com termos proibidos.` });
            
            const alertaDev = new EmbedBuilder()
                .setTitle('🚨 MONITORAMENTO: RAID DETECTADO E BANIDO')
                .setColor('#FF0000')
                .addFields(
                    { name: '🏠 Servidor Alvo:', value: `\`${member.guild.name}\``, inline: true },
                    { name: '👤 Usuário de Raid:', value: `\`${member.user.tag}\``, inline: true },
                    { name: '⚙️ Detectado via:', value: `\`${localOrigem}\``, inline: true },
                    { name: '📝 Dados do Infrator:', value: `\`\`\`${textoCompleto}\`\`\`` }
                )
                .setTimestamp();
            await enviarAlertaGlobal(alertaDev);
        } catch (err) {}
    }
}

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) {
        if (i.isButton() && ['tg_link', 'tg_raid', 'tg_spam'].includes(i.customId)) {
            if (!temPermissao(i.member)) return i.reply({ content: '❌ **Erro:** Sem permissão.', ephemeral: true });
            if (i.customId === 'tg_link') serverConfig.antilink = !serverConfig.antilink;
            if (i.customId === 'tg_raid') serverConfig.antiraid = !serverConfig.antiraid;
            if (i.customId === 'tg_spam') serverConfig.antispam = !serverConfig.antispam;
            return await i.update(gerarPainelSeguranca());
        }
        return;
    }

    if (i.commandName === 'dev' || i.commandName === 'global') {
        if (i.user.id !== DEV_ID) return await i.reply({ content: '🔒 Comando restrito ao DEV.', ephemeral: true });
    } else if (!temPermissao(i.member)) {
        return await i.reply({ content: '❌ Sem permissão administrativa.', ephemeral: true });
    }

    await i.deferReply().catch(() => {});

    if (i.commandName === 'global') {
        const canal = i.options.getChannel('canal');
        serverConfig.globalAlertChannelId = canal.id;
        return await i.editReply(`🚨 Canal global de alertas definido em <#${canal.id}>.`);
    }

    if (i.commandName === 'suporte') {
        const embedSuporte = new EmbedBuilder()
            .setTitle('Central de Ajuda e Suporte')
            .setDescription(`➡️ **[Servidor de Suporte Oficial](${LINK_SERVIDOR_SUPORTE})**`)
            .setColor('#5865F2');
        return await i.editReply({ embeds: [embedSuporte] });
    }

    if (i.commandName === 'dev') {
        const guildList = client.guilds.cache;
        let descricao = `📊 **Estatísticas:** \`${guildList.size}\` servidores.\n\n`;
        for (const [id, guild] of guildList) {
            descricao += `🏠 \`${guild.name}\` | 👥 \`${guild.memberCount}\`\n`;
        }
        const e = new EmbedBuilder().setTitle('💻 Console DEV').setDescription(descricao).setColor('#2B2D31');
        return await i.editReply({ embeds: [e] });
    }

    if (i.commandName === 'ping') return await i.editReply(`🏓 **Pong!** \`${client.ws.ping}ms\``);
    if (i.commandName === 'painel') return await i.editReply(gerarPainelSeguranca());
    
    if (i.commandName === 'setlogs') {
        serverConfig.logChannelId = i.options.getChannel('canal').id;
        return await i.editReply('🟩 Canal de logs salvo.');
    }

    if (i.commandName === 'setup') {
        const c1 = i.options.getRole('cargo1');
        if (c1 && !serverConfig.adminRoles.includes(c1.id)) serverConfig.adminRoles.push(c1.id);
        return await i.editReply('🛠️ Cargos configurados com sucesso.');
    }

    if (i.commandName === 'addpalavra') {
        const entrada = i.options.getString('palavra');
        const palavras = entrada.split(',').map(p => p.trim().toLowerCase()).filter(p => p.length > 0);
        palavras.forEach(p => { if (!serverConfig.palavrasBloqueadas.includes(p)) serverConfig.palavrasBloqueadas.push(p); });
        return await i.editReply(`🚫 Filtro atualizado com as novas palavras.`);
    }

    if (i.commandName === 'clear') {
        const qtd = i.options.getInteger('quantidade');
        await i.channel.bulkDelete(qtd, true).catch(() => []);
        return await i.editReply('🧹 Chat limpo.');
    }

    if (i.commandName === 'lockchannel') {
        await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
        return await i.editReply('🔒 Canal Trancado.');
    }

    if (i.commandName === 'unlockchannel') {
        await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
        return await i.editReply('🔓 Canal Liberado.');
    }
});

// GATILHO 1: RODA ASSIM QUE O MEMBRO ENTRA (PEGA O NOME NA HORA)
client.on('guildMemberAdd', async (member) => {
    // Aguarda 1 segundo de segurança para dar tempo do Discord carregar os dados mínimos
    setTimeout(async () => {
        await verificarEBanirMembro(member, "Entrada no Servidor");
    }, 1200);
});

// GATILHO 2: SE O CACHE DA BIO ATUALIZAR 1 SEGUNDO DEPOIS DA ENTRADA, ELE É BANIDO AQUI!
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    if (!newPresence || !newPresence.member) return;
    await verificarEBanirMembro(newPresence.member, "Atualização de Perfil/Bio");
});

// FILTROS DE MENSAGENS NO CHAT
client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.guild) return;
    if (temPermissao(m.member)) return; 

    const txt = m.content.toLowerCase();
    const proibida = serverConfig.palavrasBloqueadas.some(p => txt.includes(p));
    
    if (proibida) {
        try {
            await m.delete();
            return;
        } catch {}
    }

    if (serverConfig.antilink) {
        const regexLink = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi;
        if (regexLink.test(m.content)) {
            try {
                await m.delete();
                return;
            } catch {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

