// =================================================================
// ZYPHOR SECURITYZ - VERSÃO INTEGRAL COBRANÇA MÁXIMA (FIXADA)
// =================================================================

const { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, 
    PermissionsBitField, ChannelType, Partials 
} = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates // Monitora a entrada em canais de voz (calls)
    ],
    partials: [Partials.GuildMember, Partials.User, Partials.Presence]
});

// CONFIGURAÇÃO MASTER DO DESENVOLVEDOR (VOCÊ)
const DEV_ID = '1460149186577174680';
const LINK_SERVIDOR_SUPORTE = 'https://discord.gg/nRyjV5BG9'; 

// 🎯 CANAIS GLOBAIS FIXADOS (Cole os IDs das salas entre as aspas)
const globalChannels = {
    raidAlerts: 'COLOQUE_AQUI_O_ID_DO_CANAL_DE_RAIDS',  // Ex: Canal para avisos de Bans e Raids
    chatAlerts: 'COLOQUE_AQUI_O_ID_DO_CANAL_DE_CHAT'    // Ex: Canal para logs de palavras proibidas
};

const serverConfig = {
    antilink: false,
    antiraid: false,
    antispam: false,
    logChannelId: null,
    adminRoles: [], 
    palavrasBloqueadas: ['hack', 'trava', 'maldito', 'fdp', 'macaco', 'org']
};

// FUNÇÃO MÁGICA: Converte fontes modificadas/fakes e símbolos unicode em letras minúsculas normais
function normalizarTexto(texto) {
    if (!texto) return "";
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentuações e marcas
        .replace(/[^a-z0-9\s]/g, ""); // Remove símbolos e deixa apenas o esqueleto do texto
}

// DEFINIÇÃO DE TODOS OS COMANDOS SLASHS
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('🏓 Verifica a latência do bot'),
    new SlashCommandBuilder().setName('painel').setDescription('🛡️ Abre o painel de controle de segurança'),
    new SlashCommandBuilder().setName('suporte').setDescription('🤝 Envia o link oficial do servidor de suporte do bot'),
    new SlashCommandBuilder().setName('setup').setDescription('🛠️ Configura até 3 cargos administrativos para gerenciar o bot')
        .addRoleOption(o => o.setName('cargo1').setDescription('Primeiro cargo admin').setRequired(true))
        .addRoleOption(o => o.setName('cargo2').setDescription('Segundo cargo admin').setRequired(false))
        .addRoleOption(o => o.setName('cargo3').setDescription('Terceiro cargo admin').setRequired(false)),
    new SlashCommandBuilder().setName('setlogs').setDescription('📁 Define o canal de logs local deste servidor')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de texto').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('🧹 Limpa mensagens do chat')
        .addIntegerOption(o => o.setName('quantidade').setDescription('Número de 1 a 100').setRequired(true)),
    new SlashCommandBuilder().setName('addpalavra').setDescription('🚫 Adiciona palavras ao filtro (separe por vírgula)')
        .addStringOption(o => o.setName('palavra').setDescription('Palavras separadas por vírgula').setRequired(true)),
    new SlashCommandBuilder().setName('lockchannel').setDescription('🔒 Tranca o canal atual'),
    new SlashCommandBuilder().setName('unlockchannel').setDescription('🔓 Destranca o canal atual'),
    
    // COMANDOS DE SELEÇÃO GLOBAL (APENAS VOCÊ - DEV_ID PODE USAR)
    new SlashCommandBuilder().setName('dev').setDescription('💻 [DEV ONLY] Console geral de servidores, links e dados'),
    new SlashCommandBuilder().setName('globalraid').setDescription('🚨 [DEV ONLY] Altera temporariamente o canal de Raids e Bans')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de alertas de invasão').setRequired(true)),
    new SlashCommandBuilder().setName('globalchat').setDescription('💬 [DEV ONLY] Altera temporariamente o canal de logs de chat')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de logs de chat').setRequired(true))
];

client.once('ready', async () => {
    console.log(`✅ Zyphor V3 Conectado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comandos globais sincronizados e canais fixados carregados!');
    } catch (error) { console.error(error); }
});

function temPermissao(member) {
    if (!member) return false;
    if (member.id === DEV_ID || member.id === member.guild.ownerId) return true;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    return serverConfig.adminRoles.some(roleId => member.roles.cache.has(roleId));
}

// ENVIA ENVELOPES DE MENSAGENS PARA OS CANAIS GLOBAIS
async function enviarAlertaGlobal(tipo, embed) {
    const canalId = globalChannels[tipo];
    if (!canalId || canalId.startsWith('COLOQUE_AQUI')) return; // Evita erro se o ID não for colado
    try {
        const canal = await client.channels.fetch(canalId);
        if (canal) await canal.send({ embeds: [embed] });
    } catch (err) {}
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

// SISTEMA CENTRAL DE ANÁLISE DE SEGURANÇA - CIRÚRGICO CONTRA BOTS DE DIVULGAÇÃO
async function analisarEBanirInvasor(member, origem) {
    try {
        if (!member || !member.bannable) return;

        const nomeUsuarioLimpo = normalizarTexto(member.user.username);
        const nomeExibicaoLimpo = normalizarTexto(member.user.displayName);
        
        let bioLimpa = "";
        const presence = member.guild.presences.cache.get(member.id);
        if (presence && presence.activities) {
            const activity = presence.activities.find(a => a.type === 4);
            if (activity && activity.state) bioLimpa = normalizarTexto(activity.state);
        }

        const textoCompleto = `${nomeUsuarioLimpo} | ${nomeExibicaoLimpo} | ${bioLimpa}`;

        // LISTA DE TERMOS PROIBIDOS DO GOLPE DA ORG (Buscado de forma limpa)
        const termosDoGolpe = ['1 ap gratis', 'ap gratis', 'link na bio', 'orglideranca', 'lideranca', 'vem farmar'];

        const ehBotDeSpam = termosDoGolpe.some(termo => textoCompleto.includes(normalizarTexto(termo)));

        if (ehBotDeSpam) {
            await member.ban({ reason: `🚨 ZYPHOR ANTI-RAID: Conta Bot de Divulgação identificada via ${origem}.` });
            
            const alertaRaid = new EmbedBuilder()
                .setTitle('🚨 ALERTA GLOBAL: BOT DE DIVULGAÇÃO BANIDO')
                .setColor('#FF0000')
                .addFields(
                    { name: '🏠 Servidor Alvo:', value: `\`${member.guild.name}\``, inline: true },
                    { name: '👤 Tag do Bot:', value: `\`${member.user.tag}\``, inline: true },
                    { name: '⚙️ Flag de Captura:', value: `\`${origem}\``, inline: true },
                    { name: '📝 Dados Limpos Recebidos:', value: `\`\`\`${textoCompleto}\`\`\`` }
                )
                .setTimestamp();
                
            await enviarAlertaGlobal('raidAlerts', alertaRaid);
        }
    } catch (err) {}
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

    if (['dev', 'globalraid', 'globalchat'].includes(i.commandName) && i.user.id !== DEV_ID) {
        return await i.reply({ content: '🔒 Comando exclusivo do Desenvolvedor Master.', ephemeral: true });
    } else if (!['dev', 'globalraid', 'globalchat'].includes(i.commandName) && !temPermissao(i.member)) {
        return await i.reply({ content: '❌ Sem permissão administrativa neste servidor.', ephemeral: true });
    }

    await i.deferReply().catch(() => {});

    if (i.commandName === 'globalraid') {
        const canal = i.options.getChannel('canal');
        globalChannels.raidAlerts = canal.id;
        return await i.editReply(`🟩 **Canal Global de Raids** alterado para <#${canal.id}>.`);
    }

    if (i.commandName === 'globalchat') {
        const canal = i.options.getChannel('canal');
        globalChannels.chatAlerts = canal.id;
        return await i.editReply(`🟩 **Canal Global de Moderação de Chat** alterado para <#${canal.id}>.`);
    }

    if (i.commandName === 'suporte') {
        const embedSuporte = new EmbedBuilder()
            .setTitle('🤝 Central de Ajuda e Suporte')
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

client.on('guildMemberAdd', async (member) => {
    setTimeout(async () => { await analisarEBanirInvasor(member, "Entrada de Membro"); }, 1500);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.channelId && oldState.channelId !== newState.channelId) {
        const member = newState.member;
        if (!member || member.user.bot || temPermissao(member)) return;
        await analisarEBanirInvasor(member, "Entrada em Canal de Voz");
    }
});

client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.guild) return;
    if (temPermissao(m.member)) return; 

    const txt = m.content.toLowerCase();
    const proibida = serverConfig.palavrasBloqueadas.some(p => txt.includes(p));
    
    if (proibida) {
        try {
            await m.delete();
            
            const alertaChat = new EmbedBuilder()
                .setTitle('🚫 CHAT MODERADO: MENSAGEM FILTRADA')
                .setColor('#FFCC00')
                .addFields(
                    { name: '🏠 Servidor:', value: `\`${m.guild.name}\``, inline: true },
                    { name: '👤 Autor:', value: `\`${m.author.tag}\``, inline: true },
                    { name: '📝 Mensagem Original:', value: `\`\`\`${m.content}\`\`\`` }
                )
                .setTimestamp();
                
            await enviarAlertaGlobal('chatAlerts', alertaChat);
            return;
        } catch {}
    }

    if (serverConfig.antilink) {
        const regexLink = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi;
        if (regexLink.test(m.content)) { try { await m.delete(); } catch {} }
    }
});

client.login(process.env.DISCORD_TOKEN);

